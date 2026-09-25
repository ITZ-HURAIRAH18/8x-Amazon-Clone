export const money = (value) => Math.round(Number(value || 0) * 100) / 100

export const DELIVERY_METHODS = {
  standard: { label: "Standard delivery", cost: (subtotal) => (subtotal >= 35 || subtotal === 0 ? 0 : 5.99), days: [4, 6] },
  priority: { label: "Priority delivery", cost: (subtotal) => (subtotal === 0 ? 0 : 9.99), days: [2, 3] },
  express: { label: "Express delivery", cost: (subtotal) => (subtotal === 0 ? 0 : 18.99), days: [1, 2] },
}

export function couponDiscount(coupon, subtotal, shipping = 0) {
  if (!coupon) return 0
  if (coupon.discountType === "shipping") return Math.min(money(shipping), 20)
  if (coupon.discountType === "fixed") return money(Math.min(Number(coupon.discountValue || 0), subtotal))
  const raw = money(subtotal * (Number(coupon.discountValue || 0) / 100))
  return money(coupon.maximumDiscount == null ? raw : Math.min(raw, Number(coupon.maximumDiscount)))
}

export function calculateTotals(items = [], options = {}) {
  const subtotal = money(items.reduce((sum, item) => sum + Number(item.unitPrice || item.price || 0) * Number(item.quantity || 1), 0))
  const deliveryMethod = DELIVERY_METHODS[options.deliveryMethod] ? options.deliveryMethod : "standard"
  const baseShipping = money(DELIVERY_METHODS[deliveryMethod].cost(subtotal))
  const discount = money(couponDiscount(options.coupon, subtotal, baseShipping))
  const shipping = money(Math.max(0, baseShipping - (options.coupon?.discountType === "shipping" ? discount : 0)))
  const taxable = Math.max(0, subtotal - (options.coupon?.discountType === "shipping" ? 0 : discount))
  const tax = money(taxable * 0.08)
  return {
    subtotal,
    discount,
    shipping,
    tax,
    total: money(taxable + shipping + tax),
    deliveryMethod,
  }
}

export function estimatedDelivery(deliveryMethod = "standard", from = new Date()) {
  const range = DELIVERY_METHODS[deliveryMethod]?.days || DELIVERY_METHODS.standard.days
  const date = new Date(from)
  date.setDate(date.getDate() + range[1])
  return date
}

export function normalizeAddress(input = {}) {
  return {
    fullName: String(input.fullName || input.name || "").trim(),
    phone: String(input.phone || "").trim(),
    street: String(input.street || input.line1 || "").trim(),
    apartment: String(input.apartment || input.line2 || "").trim(),
    city: String(input.city || "").trim(),
    state: String(input.state || "").trim(),
    postalCode: String(input.postalCode || input.zip || "").trim(),
    country: String(input.country || "United States").trim(),
  }
}

export function isCompleteAddress(address = {}) {
  const normalized = normalizeAddress(address)
  return Boolean(normalized.fullName && normalized.street && normalized.city && normalized.state && normalized.postalCode)
}
