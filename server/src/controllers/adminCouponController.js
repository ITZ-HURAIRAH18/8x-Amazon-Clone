import { Coupon } from "../models/Coupon.js"
import { databaseReady } from "../config/db.js"
import { memory, id } from "../data/memory.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError, boolean, dateValue, enumValue, escapeRegex, idOf, isMongoId, number, pagination, text, withPagination } from "../utils/validation.js"
import { createAdminNotification } from "./notificationController.js"
import { couponIsActive } from "./couponController.js"

function effectiveStatus(coupon) {
  const now = Date.now()
  if (!coupon.active) return "Inactive"
  if (new Date(coupon.startsAt).getTime() > now) return "Scheduled"
  if (new Date(coupon.expiresAt).getTime() <= now) return "Expired"
  if (coupon.usageLimit != null && Number(coupon.usageCount || 0) >= Number(coupon.usageLimit)) return "Limit reached"
  return "Active"
}

function serialize(coupon) {
  return {
    id: idOf(coupon),
    code: coupon.code,
    description: coupon.description,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minimumOrder: coupon.minimumOrder,
    maximumDiscount: coupon.maximumDiscount,
    startsAt: coupon.startsAt,
    expiresAt: coupon.expiresAt,
    active: coupon.active !== false,
    usageLimit: coupon.usageLimit,
    perUserLimit: coupon.perUserLimit,
    usageCount: coupon.usageCount || 0,
    status: effectiveStatus(coupon),
    createdAt: coupon.createdAt,
    updatedAt: coupon.updatedAt,
  }
}

function validateCoupon(body, existing = null, partial = false) {
  const required = (field, fallback) => body[field] !== undefined ? body[field] : partial && existing ? existing[field] : fallback
  const code = text(required("code"), { required: true, min: 3, max: 30, label: "Coupon code" }).toUpperCase()
  if (!/^[A-Z0-9_-]+$/.test(code)) throw new ApiError("Coupon code may contain only letters, numbers, hyphens, and underscores")
  const description = text(required("description"), { required: true, min: 3, max: 240, label: "Description" })
  const discountType = enumValue(required("discountType", "percent"), ["percent", "fixed", "shipping"], { required: true, label: "Discount type" })
  const maxValue = discountType === "percent" ? 90 : 10_000_000
  const discountValue = number(required("discountValue"), { required: true, min: 0, max: maxValue, label: "Discount value" })
  if (discountType === "shipping" && discountValue !== 0) throw new ApiError("Shipping coupons use a discount value of zero")
  const minimumOrder = number(required("minimumOrder", 0), { min: 0, max: 10_000_000, label: "Minimum order" })
  const maximumDiscountRaw = required("maximumDiscount", null)
  const maximumDiscount = maximumDiscountRaw == null || maximumDiscountRaw === "" ? null : number(maximumDiscountRaw, { min: 0, max: 10_000_000, label: "Maximum discount" })
  if (discountType !== "percent" && maximumDiscount != null) throw new ApiError("Maximum discount applies only to percentage coupons")
  const startsAt = dateValue(required("startsAt", new Date()), { required: true, label: "Start date" })
  const expiresAt = dateValue(required("expiresAt"), { required: true, label: "Expiry date" })
  if (expiresAt <= startsAt) throw new ApiError("Expiry date must be after the start date")
  const usageLimitRaw = required("usageLimit", null)
  const perUserLimitRaw = required("perUserLimit", null)
  const usageLimit = usageLimitRaw == null || usageLimitRaw === "" ? null : number(usageLimitRaw, { min: 1, max: 100_000_000, integer: true, label: "Usage limit" })
  const perUserLimit = perUserLimitRaw == null || perUserLimitRaw === "" ? null : number(perUserLimitRaw, { min: 1, max: 1_000_000, integer: true, label: "Per-user limit" })
  return {
    code,
    description,
    discountType,
    discountValue,
    minimumOrder,
    maximumDiscount,
    startsAt,
    expiresAt,
    active: boolean(body.active, existing?.active ?? true),
    usageLimit,
    perUserLimit,
  }
}

export const listCoupons = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query, { defaultLimit: 20 })
  const search = text(req.query.search || req.query.q, { max: 80, label: "Search" })
  const activeFilter = req.query.active
  if (activeFilter !== undefined && !["true", "false", "all"].includes(String(activeFilter))) throw new ApiError("Invalid coupon active filter")
  const sort = { newest: { createdAt: -1 }, oldest: { createdAt: 1 }, expiry: { expiresAt: 1 }, usage: { usageCount: -1 }, code: { code: 1 } }[req.query.sort] || { createdAt: -1 }
  if (databaseReady()) {
    const filter = {}
    if (search) filter.code = new RegExp(escapeRegex(search), "i")
    if (activeFilter === "true") filter.active = true
    if (activeFilter === "false") filter.active = false
    const [rows, total] = await Promise.all([Coupon.find(filter).sort(sort).skip(skip).limit(limit).lean(), Coupon.countDocuments(filter)])
    return res.json({ success: true, ...withPagination(rows.map(serialize), total, page, limit) })
  }
  const term = search.toLowerCase()
  let rows = memory.coupons.filter((coupon) => (!term || coupon.code.toLowerCase().includes(term) || coupon.description.toLowerCase().includes(term)) && (activeFilter === undefined || activeFilter === "all" || String(coupon.active) === activeFilter))
  rows.sort((a, b) => sort.createdAt ? (sort.createdAt === 1 ? new Date(a.createdAt) - new Date(b.createdAt) : new Date(b.createdAt) - new Date(a.createdAt)) : sort.expiresAt ? new Date(a.expiresAt) - new Date(b.expiresAt) : sort.usage ? b.usageCount - a.usageCount : a.code.localeCompare(b.code))
  return res.json({ success: true, ...withPagination(rows.slice(skip, skip + limit).map(serialize), rows.length, page, limit) })
})

export const getCoupon = asyncHandler(async (req, res) => {
  const coupon = databaseReady() ? await Coupon.findById(req.params.id).lean() : memory.coupons.find((entry) => String(entry._id) === req.params.id)
  if (!coupon) throw new ApiError("Coupon not found", 404, "COUPON_NOT_FOUND")
  return res.json({ success: true, data: serialize(coupon) })
})

export const createCoupon = asyncHandler(async (req, res) => {
  const payload = validateCoupon(req.body)
  let coupon
  if (databaseReady()) coupon = await Coupon.create(payload)
  else {
    if (memory.coupons.some((entry) => entry.code === payload.code)) throw new ApiError("A coupon with that code already exists", 409, "DUPLICATE")
    const now = new Date()
    coupon = { _id: id("coupon"), ...payload, usageCount: 0, redemptions: [], createdAt: now, updatedAt: now }
    memory.coupons.push(coupon)
  }
  if (coupon.active) {
    const days = (new Date(coupon.expiresAt) - Date.now()) / 86400000
    if (days <= 7) await createAdminNotification({ type: "admin-coupon", title: "Coupon expiring soon", message: `Coupon ${coupon.code} expires soon.`, link: "/admin/coupons", metadata: { couponId: String(coupon._id), expiresAt: coupon.expiresAt } }, { dedupeKey: `coupon-expiry:${coupon._id}` })
  }
  return res.status(201).json({ success: true, message: "Coupon created", data: serialize(coupon) })
})

export const updateCoupon = asyncHandler(async (req, res) => {
  if (!isMongoId(req.params.id) && !memory.coupons.some((entry) => String(entry._id) === req.params.id)) throw new ApiError("Coupon not found", 404, "COUPON_NOT_FOUND")
  const existing = databaseReady() ? await Coupon.findById(req.params.id) : memory.coupons.find((entry) => String(entry._id) === req.params.id)
  if (!existing) throw new ApiError("Coupon not found", 404, "COUPON_NOT_FOUND")
  const payload = validateCoupon(req.body, existing, true)
  if (!databaseReady() && memory.coupons.some((entry) => String(entry._id) !== String(existing._id) && entry.code === payload.code)) throw new ApiError("A coupon with that code already exists", 409, "DUPLICATE")
  let coupon
  if (databaseReady()) {
    Object.assign(existing, payload)
    await existing.save()
    coupon = existing
  } else {
    Object.assign(existing, payload, { updatedAt: new Date() })
    coupon = existing
  }
  return res.json({ success: true, message: "Coupon updated", data: serialize(coupon) })
})

export const deleteCoupon = asyncHandler(async (req, res) => {
  let coupon
  if (databaseReady()) {
    if (!isMongoId(req.params.id)) throw new ApiError("Coupon not found", 404, "COUPON_NOT_FOUND")
    coupon = await Coupon.findByIdAndDelete(req.params.id)
  } else {
    const index = memory.coupons.findIndex((entry) => String(entry._id) === req.params.id)
    if (index >= 0) coupon = memory.coupons.splice(index, 1)[0]
  }
  if (!coupon) throw new ApiError("Coupon not found", 404, "COUPON_NOT_FOUND")
  return res.json({ success: true, message: "Coupon deleted", data: { id: req.params.id, code: coupon.code } })
})
