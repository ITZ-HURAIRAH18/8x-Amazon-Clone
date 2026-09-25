import mongoose from "mongoose"
import { Cart } from "../models/Cart.js"
import { Order } from "../models/Order.js"
import { Product } from "../models/Product.js"
import { databaseReady } from "../config/db.js"
import { memory, id } from "../data/memory.js"
import demoProducts from "../data/products.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const money = (value) => Math.round(Number(value) * 100) / 100
const demoProduct = (productId) => demoProducts.find((product) => String(product._id) === String(productId) || product.slug === productId)

function totals(items) {
  const subtotal = money(items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0))
  const shipping = subtotal >= 35 || subtotal === 0 ? 0 : 5.99
  const tax = money(subtotal * 0.08)
  return { subtotal, shipping, tax, total: money(subtotal + shipping + tax) }
}

function orderJson(order) {
  return { ...order, id: String(order._id || order.id) }
}

export const createOrder = asyncHandler(async (req, res) => {
  const shippingAddress = req.body.shippingAddress || {}
  const paymentMethod = String(req.body.paymentMethod || "Card")
  const clientRequestId = req.body.clientRequestId ? String(req.body.clientRequestId) : undefined
  if (!shippingAddress.line1 || !shippingAddress.city || !shippingAddress.postalCode) {
    return res.status(400).json({ message: "A complete delivery address is required", code: "ADDRESS_REQUIRED" })
  }

  if (databaseReady()) {
    if (clientRequestId) {
      const existing = await Order.findOne({ user: req.user._id, clientRequestId })
      if (existing) return res.status(200).json({ data: orderJson(existing.toJSON()) })
    }
    const cart = await Cart.findOne({ user: req.user._id }).populate("items.product")
    if (!cart || cart.items.length === 0) return res.status(400).json({ message: "Your cart is empty", code: "EMPTY_CART" })
    const items = []
    for (const item of cart.items) {
      const product = item.product
      if (!product || product.stock < item.quantity) return res.status(409).json({ message: `One or more items are no longer available`, code: "OUT_OF_STOCK" })
      items.push({ product: product._id, title: product.title, image: product.images?.[0], unitPrice: product.price, quantity: item.quantity })
    }
    const amounts = totals(items)
    const order = await Order.create({ user: req.user._id, items, shippingAddress, paymentMethod, ...amounts, clientRequestId })
    for (const item of items) {
      const updated = await Product.findOneAndUpdate({ _id: item.product, stock: { $gte: item.quantity } }, { $inc: { stock: -item.quantity } }, { new: false })
      if (!updated) return res.status(409).json({ message: "Stock changed while placing the order", code: "OUT_OF_STOCK" })
    }
    await Cart.deleteOne({ user: req.user._id })
    return res.status(201).json({ data: orderJson(order.toJSON()) })
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
    product.stock -= item.quantity
  }
  const amounts = totals(items)
  const order = { _id: id("ord"), user: String(req.user._id), items, shippingAddress, paymentMethod, ...amounts, status: "Pending", clientRequestId, createdAt: new Date() }
  memory.orders.push(order)
  memory.carts.delete(String(req.user._id))
  return res.status(201).json({ data: orderJson(order) })
})

export const listOrders = asyncHandler(async (req, res) => {
  if (databaseReady()) {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).lean()
    return res.json({ data: orders.map((order) => orderJson(order)) })
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
  const order = memory.orders.find((entry) => String(entry._id) === req.params.id && String(entry.user) === String(req.user._id))
  if (!order) return res.status(404).json({ message: "Order not found", code: "ORDER_NOT_FOUND" })
  return res.json({ data: orderJson(order) })
})
