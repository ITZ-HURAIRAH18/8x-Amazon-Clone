import mongoose from "mongoose"
import { Coupon } from "../models/Coupon.js"
import { databaseReady } from "../config/db.js"
import { memory } from "../data/memory.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { calculateTotals, couponDiscount } from "../utils/pricing.js"

function publicCoupon(coupon) {
  return {
    id: String(coupon._id || coupon.id),
    code: coupon.code,
    description: coupon.description,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minimumOrder: coupon.minimumOrder,
    maximumDiscount: coupon.maximumDiscount,
    startsAt: coupon.startsAt,
    expiresAt: coupon.expiresAt,
  }
}

function active(coupon) {
  const now = Date.now()
  return Boolean(
    coupon?.active !== false
    && new Date(coupon.startsAt || 0).getTime() <= now
    && new Date(coupon.expiresAt).getTime() > now
    && (coupon.usageLimit == null || Number(coupon.usageCount || 0) < Number(coupon.usageLimit)),
  )
}

export function perUserUsage(coupon, userId) {
  return Number(coupon?.redemptions?.find((entry) => String(entry.user) === String(userId))?.count || 0)
}

export function couponAvailable(coupon, userId) {
  if (!active(coupon)) return false
  return coupon?.perUserLimit == null || perUserUsage(coupon, userId) < Number(coupon.perUserLimit)
}

export const listCoupons = asyncHandler(async (_req, res) => {
  const coupons = databaseReady()
    ? await Coupon.find({ $or: [{ active: true }, { active: { $exists: false } }], $and: [{ $or: [{ startsAt: { $exists: false } }, { startsAt: { $lte: new Date() } }] }, { expiresAt: { $gt: new Date() } }] }).sort({ minimumOrder: 1 }).lean()
    : memory.coupons.filter(active)
  return res.json({ success: true, data: coupons.filter((coupon) => active(coupon)).map(publicCoupon) })
})

export const validateCoupon = asyncHandler(async (req, res) => {
  const code = String(req.body.code || "").trim().toUpperCase()
  const subtotal = Number(req.body.subtotal || 0)
  if (!code || !Number.isFinite(subtotal) || subtotal < 0 || subtotal > 10_000_000) {
    return res.status(400).json({ success: false, message: "Enter a valid coupon and subtotal", code: "VALIDATION_ERROR" })
  }
  const coupon = databaseReady()
    ? await Coupon.findOne({ code, $or: [{ active: true }, { active: { $exists: false } }] }).select("+redemptions").lean()
    : memory.coupons.find((entry) => entry.code === code)
  if (!coupon || !active(coupon)) return res.status(400).json({ success: false, message: "This coupon is expired or unavailable", code: "COUPON_INVALID" })
  if (subtotal < Number(coupon.minimumOrder || 0)) {
    return res.status(400).json({ success: false, message: `This coupon requires a minimum order of $${Number(coupon.minimumOrder).toFixed(2)}`, code: "COUPON_MINIMUM" })
  }
  if (coupon.perUserLimit != null && perUserUsage(coupon, req.user._id) >= Number(coupon.perUserLimit)) {
    return res.status(400).json({ success: false, message: "You have reached this coupon's per-customer limit", code: "COUPON_USER_LIMIT" })
  }
  const totals = calculateTotals([{ unitPrice: subtotal, quantity: 1 }], { coupon })
  return res.json({ success: true, data: { coupon: publicCoupon(coupon), ...totals, discount: couponDiscount(coupon, subtotal, totals.shipping) } })
})

export async function findCoupon(code) {
  const normalized = String(code || "").trim().toUpperCase()
  if (!normalized) return null
  const coupon = databaseReady()
    ? await Coupon.findOne({ code: normalized, active: true }).select("+redemptions").lean()
    : memory.coupons.find((entry) => entry.code === normalized)
  return coupon && active(coupon) ? coupon : null
}

export async function recordCouponUsage(code, userId) {
  const normalized = String(code || "").trim().toUpperCase()
  if (!normalized) return false
  if (databaseReady()) {
    if (!mongoose.isValidObjectId(userId)) return false
    const userObjectId = new mongoose.Types.ObjectId(userId)
    const coupon = await Coupon.findOneAndUpdate(
      {
        code: normalized,
        $or: [{ active: true }, { active: { $exists: false } }],
        $or: [
          { usageLimit: null },
          { usageLimit: { $exists: false } },
          { $expr: { $lt: [{ $ifNull: ["$usageCount", 0] }, "$usageLimit"] } },
        ],
        $expr: {
          $or: [
            { $eq: [{ $ifNull: ["$perUserLimit", null] }, null] },
            {
              $lt: [
                {
                  $size: {
                    $filter: {
                      input: { $ifNull: ["$redemptions", []] },
                      as: "redemption",
                      cond: { $eq: ["$$redemption.user", userObjectId] },
                    },
                  },
                },
                "$perUserLimit",
              ],
            },
          ],
        },
      },
      [{ $set: {
        usageCount: { $add: [{ $ifNull: ["$usageCount", 0] }, 1] },
        redemptions: {
          $let: {
            vars: { current: { $ifNull: ["$redemptions", []] } },
            in: {
              $cond: [
                { $gt: [{ $size: { $filter: { input: "$$current", as: "redemption", cond: { $eq: ["$$redemption.user", userObjectId] } } } }, 0] },
                { $concatArrays: [
                  { $filter: { input: "$$current", as: "redemption", cond: { $ne: ["$$redemption.user", userObjectId] } } },
                  [{ user: userObjectId, count: { $add: [{ $ifNull: [{ $first: { $filter: { input: "$$current", as: "redemption", cond: { $eq: ["$$redemption.user", userObjectId] } } } }, "count"] }, 1] } }],
                ] },
                { $concatArrays: ["$$current", [{ user: userObjectId, count: 1 }]] },
              ],
            },
          },
        },
      } }],
      { new: true },
    )
    return Boolean(coupon)
  }
  const coupon = memory.coupons.find((entry) => entry.code === normalized && entry.active)
  if (!coupon) return false
  if (coupon.usageLimit != null && Number(coupon.usageCount || 0) >= Number(coupon.usageLimit)) return false
  const currentUsage = coupon.redemptions.find((entry) => String(entry.user) === String(userId))?.count || 0
  if (coupon.perUserLimit != null && currentUsage >= Number(coupon.perUserLimit)) return false
  const redemption = coupon.redemptions.find((entry) => String(entry.user) === String(userId))
  if (redemption) redemption.count += 1
  else coupon.redemptions.push({ user: String(userId), count: 1 })
  coupon.usageCount = Number(coupon.usageCount || 0) + 1
  return true
}

export async function decrementCouponUsage(code, userId) {
  const normalized = String(code || "").trim().toUpperCase()
  if (!normalized) return
  if (databaseReady()) {
    if (!mongoose.isValidObjectId(userId)) return
    const coupon = await Coupon.findOne({ code: normalized }).select("+redemptions")
    if (!coupon || Number(coupon.usageCount || 0) < 1) return
    coupon.usageCount -= 1
    const redemption = coupon.redemptions.find((entry) => String(entry.user) === String(userId))
    if (redemption) {
      redemption.count -= 1
      if (redemption.count <= 0) coupon.redemptions = coupon.redemptions.filter((entry) => String(entry.user) !== String(userId))
    }
    await coupon.save()
    return
  }
  const coupon = memory.coupons.find((entry) => entry.code === normalized)
  if (!coupon || Number(coupon.usageCount || 0) < 1) return
  coupon.usageCount -= 1
  const redemption = coupon.redemptions.find((entry) => String(entry.user) === String(userId))
  if (redemption) {
    redemption.count -= 1
    if (redemption.count <= 0) coupon.redemptions = coupon.redemptions.filter((entry) => String(entry.user) !== String(userId))
  }
}

export { active as couponIsActive, publicCoupon }
