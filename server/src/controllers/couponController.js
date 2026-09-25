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
    expiresAt: coupon.expiresAt,
  }
}

function active(coupon) {
  const now = Date.now()
  return coupon?.active && new Date(coupon.startsAt || 0).getTime() <= now && new Date(coupon.expiresAt).getTime() > now
}

export const listCoupons = asyncHandler(async (_req, res) => {
  const coupons = databaseReady()
    ? await Coupon.find({ active: true, expiresAt: { $gt: new Date() } }).sort({ minimumOrder: 1 }).lean()
    : memory.coupons.filter(active)
  return res.json({ data: coupons.map(publicCoupon) })
})

export const validateCoupon = asyncHandler(async (req, res) => {
  const code = String(req.body.code || "").trim().toUpperCase()
  const subtotal = Number(req.body.subtotal || 0)
  if (!code || !Number.isFinite(subtotal) || subtotal < 0) {
    return res.status(400).json({ message: "Enter a valid coupon and subtotal", code: "VALIDATION_ERROR" })
  }
  const coupon = databaseReady()
    ? await Coupon.findOne({ code, active: true }).lean()
    : memory.coupons.find((entry) => entry.code === code)
  if (!coupon || !active(coupon)) return res.status(400).json({ message: "This coupon is expired or unavailable", code: "COUPON_INVALID" })
  if (subtotal < Number(coupon.minimumOrder || 0)) {
    return res.status(400).json({ message: `This coupon requires a minimum order of $${Number(coupon.minimumOrder).toFixed(2)}`, code: "COUPON_MINIMUM" })
  }
  if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) {
    return res.status(400).json({ message: "This coupon has reached its usage limit", code: "COUPON_LIMIT" })
  }
  const totals = calculateTotals([{ unitPrice: subtotal, quantity: 1 }], { coupon })
  return res.json({ data: { coupon: publicCoupon(coupon), ...totals, discount: couponDiscount(coupon, subtotal, totals.shipping) } })
})

export async function findCoupon(code) {
  const normalized = String(code || "").trim().toUpperCase()
  if (!normalized) return null
  const coupon = databaseReady()
    ? await Coupon.findOne({ code: normalized, active: true }).lean()
    : memory.coupons.find((entry) => entry.code === normalized)
  return coupon && active(coupon) ? coupon : null
}

export async function recordCouponUsage(code) {
  const normalized = String(code || "").trim().toUpperCase()
  if (!normalized) return
  if (databaseReady()) await Coupon.updateOne({ code: normalized }, { $inc: { usageCount: 1 } })
  else {
    const coupon = memory.coupons.find((entry) => entry.code === normalized)
    if (coupon) coupon.usageCount = Number(coupon.usageCount || 0) + 1
  }
}

export { publicCoupon }
