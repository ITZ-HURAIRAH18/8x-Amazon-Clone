import mongoose from "mongoose"
import { Cart } from "../models/Cart.js"
import { Order } from "../models/Order.js"
import { Product } from "../models/Product.js"
import { User } from "../models/User.js"
import { databaseReady } from "../config/db.js"
import { memory, id } from "../data/memory.js"
import demoProducts from "../data/products.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { calculateTotals, estimatedDelivery, isCompleteAddress, normalizeAddress } from "../utils/pricing.js"
import { findCoupon, recordCouponUsage } from "./couponController.js"
import { createNotification } from "./notificationController.js"

const money = (value) => Math.round(Number(value || 0) * 100) / 100
const demoProduct = (productId) => demoProducts.find((product) => String(product._id) === String(productId) || product.slug === productId)
const allowedDelivery = new Set(["standard", "priority", "express"])
const allowedPayment = new Set(["Card", "PayPal", "Gift card"])

function orderJson(order) {
  const value = typeof order.toJSON === "function" ? order.toJSON() : order
  return {
    ...value,
    id: String(value._id || value.id),
    orderNumber: value.orderNumber || `AMZ-${String(value._id || value.id).slice(-8).toUpperCase()}`,
    itemCount: (value.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
  }
}

async function selectedAddress(req) {
  if (req.body.addressId) {
    if (databaseReady()) {
      const user = await User.findById(req.user._id).lean()
      const saved = user?.addresses?.find((entry) => String(entry._id) === String(req.body.addressId))
      if (!saved) return null
      return normalizeAddress(saved)
    }
    const user = memory.users.find((entry) => String(entry._id) === String(req.user._id))
    const saved = user?.addresses?.find((entry) => String(entry._id) === String(req.body.addressId))
    return saved ? normalizeAddress(saved) : null
  }
  return normalizeAddress(req.body.shippingAddress)
}

async function couponFor(code, subtotal, deliveryMethod) {
  if (!code) return { coupon: null, totals: calculateTotals([{ unitPrice: subtotal, quantity: 1 }], { deliveryMethod }) }
  const coupon = await findCoupon(code)
  if (!coupon) return { error: "This coupon is expired or unavailable", code: "COUPON_INVALID" }
  if (subtotal < Number(coupon.minimumOrder || 0)) return { error: `This coupon requires a minimum order of $${Number(coupon.minimumOrder).toFixed(2)}`, code: "COUPON_MINIMUM" }
  return { coupon, totals: calculateTotals([{ unitPrice: subtotal, quantity: 1 }], { coupon, deliveryMethod }) }
}

export const createOrder = asyncHandler(async (req, res) => {
  const shippingAddress = await selectedAddress(req)
  const paymentMethod = String(req.body.paymentMethod || "Card")
  const deliveryMethod = allowedDelivery.has(String(req.body.deliveryMethod)) ? String(req.body.deliveryMethod) : "standard"
  const clientRequestId = req.body.clientRequestId ? String(req.body.clientRequestId) : undefined
  if (!isCompleteAddress(shippingAddress)) return res.status(400).json({ message: "A complete delivery address is required", code: "ADDRESS_REQUIRED" })
  if (!allowedPayment.has(paymentMethod)) return res.status(400).json({ message: "Choose a supported payment method", code: "PAYMENT_INVALID" })

  if (databaseReady()) {
    if (clientRequestId) {
      const existing = await Order.findOne({ user: req.user._id, clientRequestId })
      if (existing) return res.status(200).json({ data: orderJson(existing) })
    }
    const cart = await Cart.findOne({ user: req.user._id }).populate("items.product")
    if (!cart || cart.items.length === 0) return res.status(400).json({ message: "Your cart is empty", code: "EMPTY_CART" })
    const items = []
    for (const item of cart.items) {
      const product = item.product
      if (!product || product.stock < item.quantity) return res.status(409).json({ message: "One or more items are no longer available", code: "OUT_OF_STOCK" })
      items.push({ product: product._id, title: product.title, image: product.images?.[0] || product.image, unitPrice: product.price, quantity: item.quantity })
    }
    const subtotal = money(items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0))
    const couponResult = await couponFor(req.body.couponCode, subtotal, deliveryMethod)
    if (couponResult.error) return res.status(400).json({ message: couponResult.error, code: couponResult.code })
    const amounts = calculateTotals(items, { coupon: couponResult.coupon, deliveryMethod })
    const order = await Order.create({
      user: req.user._id,
      items,
      shippingAddress,
      paymentMethod,
      paymentStatus: "Paid",
      deliveryMethod,
      ...amounts,
      couponCode: couponResult.coupon?.code || "",
      estimatedDelivery: estimatedDelivery(deliveryMethod),
      trackingNumber: `AMZ-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      statusHistory: [{ status: "Pending", label: "Order placed", at: new Date() }],
      clientRequestId,
    })
    const decremented = []
    for (const item of items) {
      const updated = await Product.findOneAndUpdate({ _id: item.product, stock: { $gte: item.quantity } }, { $inc: { stock: -item.quantity } }, { new: false })
      if (!updated) {
        await Promise.all(decremented.map((entry) => Product.updateOne({ _id: entry.product }, { $inc: { stock: entry.quantity } })))
        await Order.deleteOne({ _id: order._id })
        return res.status(409).json({ message: "Stock changed while placing the order", code: "OUT_OF_STOCK" })
      }
      decremented.push(item)
    }
    await Cart.deleteOne({ user: req.user._id })
    if (couponResult.coupon) await recordCouponUsage(couponResult.coupon.code)
    await createNotification(req.user._id, { type: "order", title: "Order placed", message: `We received order ${order.orderNumber || order._id}.`, link: `/account/orders/${order._id}`, metadata: { orderId: String(order._id) } })
    return res.status(201).json({ data: orderJson(order) })
  }

  if (clientRequestId) {
    const existing = memory.orders.find((order) => String(order.user) === String(req.user._id) && order.clientRequestId === clientRequestId)
    if (existing) return res.status(200).json({ data: orderJson(existing) })
  }
  const cart = memory.carts.get(String(req.user._id)) || { items: [] }
  if (!cart.items.length) return res.status(400).json({ message: "Your cart is empty", code: "EMPTY_CART" })
  const items = []
  for (const item of cart.items) {
    const product = demoProduct(item.productId)
    if (!product || product.stock < item.quantity) return res.status(409).json({ message: "One or more items are no longer available", code: "OUT_OF_STOCK" })
    items.push({ product: product._id, title: product.title, image: product.images[0], unitPrice: product.price, quantity: item.quantity })
  }
  const subtotal = money(items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0))
  const couponResult = await couponFor(req.body.couponCode, subtotal, deliveryMethod)
  if (couponResult.error) return res.status(400).json({ message: couponResult.error, code: couponResult.code })
  const amounts = calculateTotals(items, { coupon: couponResult.coupon, deliveryMethod })
  for (const item of items) {
    const product = demoProduct(item.product)
    product.stock -= item.quantity
  }
  const createdAt = new Date()
  const order = {
    _id: id("ord"),
    orderNumber: `AMZ-${id("ref").slice(-8).toUpperCase()}`,
    user: String(req.user._id),
    items,
    shippingAddress,
    paymentMethod,
    paymentStatus: "Paid",
    deliveryMethod,
    ...amounts,
    couponCode: couponResult.coupon?.code || "",
    estimatedDelivery: estimatedDelivery(deliveryMethod, createdAt),
    trackingNumber: `AMZ-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    status: "Pending",
    statusHistory: [{ status: "Pending", label: "Order placed", at: createdAt }],
    clientRequestId,
    createdAt,
    updatedAt: createdAt,
  }
  memory.orders.push(order)
  memory.carts.delete(String(req.user._id))
  if (couponResult.coupon) await recordCouponUsage(couponResult.coupon.code)
  await createNotification(req.user._id, { type: "order", title: "Order placed", message: `We received order ${order.orderNumber}.`, link: `/account/orders/${order._id}`, metadata: { orderId: order._id } })
  return res.status(201).json({ data: orderJson(order) })
})

export const listOrders = asyncHandler(async (req, res) => {
  if (databaseReady()) {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).lean()
    return res.json({ data: orders.map(orderJson) })
  }
  const orders = memory.orders.filter((order) => String(order.user) === String(req.user._id)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  return res.json({ data: orders.map(orderJson) })
})

export const getOrder = asyncHandler(async (req, res) => {
  if (databaseReady()) {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Order not found", code: "ORDER_NOT_FOUND" })
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id }).lean()
    if (!order) return res.status(404).json({ message: "Order not found", code: "ORDER_NOT_FOUND" })
    return res.json({ data: orderJson(order) })
  }
  const order = memory.orders.find((entry) => String(entry._id) === String(req.params.id) && String(entry.user) === String(req.user._id))
  if (!order) return res.status(404).json({ message: "Order not found", code: "ORDER_NOT_FOUND" })
  return res.json({ data: orderJson(order) })
})

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const status = String(req.body.status || "")
  const allowed = ["Pending", "Processing", "Shipped", "Out for delivery", "Delivered", "Cancelled"]
  if (!allowed.includes(status)) return res.status(400).json({ message: "Invalid order status", code: "STATUS_INVALID" })
  if (databaseReady()) {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Order not found", code: "ORDER_NOT_FOUND" })
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id })
    if (!order) return res.status(404).json({ message: "Order not found", code: "ORDER_NOT_FOUND" })
    order.status = status
    order.statusHistory.push({ status, label: status, at: new Date() })
    await order.save()
    if (["Shipped", "Delivered"].includes(status)) await createNotification(req.user._id, { type: "order", title: `Order ${status.toLowerCase()}`, message: `Your order ${order.orderNumber || order._id} is ${status.toLowerCase()}.`, link: `/account/orders/${order._id}` })
    return res.json({ data: orderJson(order) })
  }
  const order = memory.orders.find((entry) => String(entry._id) === String(req.params.id) && String(entry.user) === String(req.user._id))
  if (!order) return res.status(404).json({ message: "Order not found", code: "ORDER_NOT_FOUND" })
  order.status = status
  order.statusHistory ||= []
  order.statusHistory.push({ status, label: status, at: new Date() })
  await createNotification(req.user._id, { type: "order", title: `Order ${status.toLowerCase()}`, message: `Your order ${order.orderNumber} is ${status.toLowerCase()}.`, link: `/account/orders/${order._id}` })
  return res.json({ data: orderJson(order) })
})
