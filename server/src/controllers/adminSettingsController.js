import { Setting } from "../models/Setting.js"
import { Product } from "../models/Product.js"
import { databaseReady } from "../config/db.js"
import { memory } from "../data/memory.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { boolean, number, text } from "../utils/validation.js"

const defaults = {
  storeName: "Amazon Clone",
  supportEmail: "support@example.com",
  customerServiceEmail: "support@example.com",
  currency: "USD",
  defaultOrderStatus: "Pending",
  lowStockThreshold: 10,
  freeShippingThreshold: 35,
  standardShippingFee: 5.99,
  taxRate: 8,
  lowStockNotifications: true,
  orderNotifications: true,
  reviewNotifications: true,
  couponExpiryDays: 7,
  dealExpiryDays: 7,
  maintenanceMessage: "",
}

function validate(body, current = defaults) {
  const payload = {}
  if (body.storeName !== undefined) payload.storeName = text(body.storeName, { required: true, min: 2, max: 120, label: "Store name" })
  if (body.supportEmail !== undefined || body.customerServiceEmail !== undefined) {
    payload.supportEmail = text(body.supportEmail ?? body.customerServiceEmail, { required: true, max: 254, label: "Support email" }).toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.supportEmail)) throw Object.assign(new Error("Enter a valid support email"), { statusCode: 400, code: "VALIDATION_ERROR" })
    payload.customerServiceEmail = payload.supportEmail
  }
  if (body.currency !== undefined) {
    payload.currency = String(body.currency).toUpperCase()
    if (!["USD"].includes(payload.currency)) throw Object.assign(new Error("Only USD is supported"), { statusCode: 400, code: "VALIDATION_ERROR" })
  }
  if (body.defaultOrderStatus !== undefined) {
    payload.defaultOrderStatus = String(body.defaultOrderStatus)
    if (!["Pending", "Processing"].includes(payload.defaultOrderStatus)) throw Object.assign(new Error("Invalid default order status"), { statusCode: 400, code: "VALIDATION_ERROR" })
  }
  if (body.lowStockThreshold !== undefined) payload.lowStockThreshold = number(body.lowStockThreshold, { min: 0, max: 100_000, integer: true, label: "Low-stock threshold" })
  if (body.freeShippingThreshold !== undefined) payload.freeShippingThreshold = number(body.freeShippingThreshold, { min: 0, max: 10_000_000, label: "Free-shipping threshold" })
  if (body.standardShippingFee !== undefined) payload.standardShippingFee = number(body.standardShippingFee, { min: 0, max: 10_000, label: "Standard shipping fee" })
  if (body.taxRate !== undefined) payload.taxRate = number(body.taxRate, { min: 0, max: 100, label: "Tax rate" })
  if (body.lowStockNotifications !== undefined) payload.lowStockNotifications = boolean(body.lowStockNotifications, true)
  if (body.orderNotifications !== undefined) payload.orderNotifications = boolean(body.orderNotifications, true)
  if (body.reviewNotifications !== undefined) payload.reviewNotifications = boolean(body.reviewNotifications, true)
  if (body.couponExpiryDays !== undefined) payload.couponExpiryDays = number(body.couponExpiryDays, { min: 1, max: 90, integer: true, label: "Coupon expiry notice days" })
  if (body.dealExpiryDays !== undefined) payload.dealExpiryDays = number(body.dealExpiryDays, { min: 1, max: 90, integer: true, label: "Deal expiry notice days" })
  if (body.maintenanceMessage !== undefined) payload.maintenanceMessage = text(body.maintenanceMessage, { max: 500, label: "Maintenance message" })
  return { ...current, ...payload }
}

export const getSettings = asyncHandler(async (_req, res) => {
  let value
  if (databaseReady()) {
    const setting = await Setting.findOne({ key: "store" }).lean()
    const stored = { ...defaults, ...(setting?.value || {}) }
    if (!stored.customerServiceEmail) stored.customerServiceEmail = stored.supportEmail
    if (!stored.supportEmail) stored.supportEmail = stored.customerServiceEmail
    value = validate({}, stored)
  } else value = validate({}, { ...defaults, ...memory.settings })
  return res.json({ success: true, data: value })
})

export const updateSettings = asyncHandler(async (req, res) => {
  let current = defaults
  if (databaseReady()) {
    const setting = await Setting.findOne({ key: "store" }).lean()
    current = { ...defaults, ...(setting?.value || {}) }
    if (!current.customerServiceEmail) current.customerServiceEmail = current.supportEmail
    if (!current.supportEmail) current.supportEmail = current.customerServiceEmail
  } else current = { ...defaults, ...memory.settings }
  const value = validate(req.body, current)
  if (databaseReady()) {
    await Setting.findOneAndUpdate({ key: "store" }, { $set: { value } }, { upsert: true, new: true, runValidators: true })
    if (value.lowStockThreshold !== current.lowStockThreshold) await Product.updateMany({ lowStockThreshold: current.lowStockThreshold }, { $set: { lowStockThreshold: value.lowStockThreshold } })
  } else {
    Object.assign(memory.settings, value)
    if (value.lowStockThreshold !== current.lowStockThreshold) memory.products.forEach((product) => { if (Number(product.lowStockThreshold) === Number(current.lowStockThreshold)) product.lowStockThreshold = value.lowStockThreshold })
  }
  return res.json({ success: true, message: "Settings updated", data: value })
})
