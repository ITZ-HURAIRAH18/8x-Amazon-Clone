import mongoose from "mongoose"
import { Order } from "../models/Order.js"
import { databaseReady } from "../config/db.js"
import { memory } from "../data/memory.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError, dateValue, enumValue, escapeRegex, idOf, pagination, text, withPagination } from "../utils/validation.js"
import { applyOrderStatus } from "./orderController.js"

const statuses = ["Pending", "Processing", "Shipped", "Out for delivery", "Delivered", "Cancelled"]
const paymentStatuses = ["Pending", "Paid", "Failed", "Refunded"]

function serialize(order) {
  const rawUser = order.user && typeof order.user === "object" ? order.user : null
  const { user: _rawUser, ...rest } = order
  const customer = rawUser
    ? { id: String(rawUser._id), name: rawUser.name, email: rawUser.email, role: rawUser.role || "customer", status: rawUser.status || "active" }
    : { id: String(order.user || ""), name: order.customerName || "Customer", email: order.customerEmail || "" }
  return {
    ...rest,
    id: idOf(order),
    _id: idOf(order),
    orderNumber: order.orderNumber || `AMZ-${String(idOf(order)).slice(-8).toUpperCase()}`,
    itemCount: (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    subtotal: Number(order.subtotal || 0),
    discount: Number(order.discount || 0),
    shipping: Number(order.shipping || 0),
    tax: Number(order.tax || 0),
    total: Number(order.total || 0),
    user: customer,
    customer,
    timeline: order.statusHistory || [],
  }
}

function queryMatch(query) {
  const match = {}
  if (query.status && query.status !== "all") match.status = enumValue(query.status, statuses, { label: "Order status" })
  if (query.paymentStatus && query.paymentStatus !== "all") match.paymentStatus = enumValue(query.paymentStatus, paymentStatuses, { label: "Payment status" })
  if (query.from || query.to) {
    match.createdAt = {}
    if (query.from) match.createdAt.$gte = dateValue(query.from, { required: true, label: "From date" })
    if (query.to) match.createdAt.$lte = dateValue(query.to, { required: true, label: "To date" })
  }
  return match
}

const sortFor = (sort) => ({
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  "total-desc": { total: -1 },
  "total-asc": { total: 1 },
  highest: { total: -1 },
  lowest: { total: 1 },
}[sort] || { createdAt: -1 })

export const listOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query, { defaultLimit: 20 })
  const search = text(req.query.search || req.query.q, { max: 120, label: "Search" })
  const match = queryMatch(req.query)
  if (databaseReady()) {
    const searchRegex = search ? new RegExp(escapeRegex(search), "i") : null
    const [result] = await Order.aggregate([
      { $match: match },
      { $lookup: { from: "users", localField: "user", foreignField: "_id", as: "user" } },
      { $set: { user: { $first: "$user" } } },
      ...(searchRegex ? [{ $match: { $or: [{ orderNumber: searchRegex }, { "user.name": searchRegex }, { "user.email": searchRegex }] } }] : []),
      { $sort: sortFor(req.query.sort) },
      { $facet: { rows: [{ $skip: skip }, { $limit: limit }], count: [{ $count: "total" }], totals: [{ $group: { _id: null, revenue: { $sum: "$total" }, averageOrder: { $avg: "$total" } } }] } },
    ])
    const total = result.count[0]?.total || 0
    return res.json({ success: true, ...withPagination(result.rows.map(serialize), total, page, limit), summary: result.totals[0] || { revenue: 0, averageOrder: 0 } })
  }
  const users = new Map(memory.users.map((user) => [String(user._id), user]))
  const term = search.toLowerCase()
  let rows = memory.orders.map((order) => ({ ...order, user: users.get(String(order.user)) })).filter((order) => {
    if (req.query.status && req.query.status !== "all" && order.status !== req.query.status) return false
    if (req.query.paymentStatus && req.query.paymentStatus !== "all" && order.paymentStatus !== req.query.paymentStatus) return false
    if (req.query.from && new Date(order.createdAt) < dateValue(req.query.from)) return false
    if (req.query.to && new Date(order.createdAt) > dateValue(req.query.to)) return false
    if (term && !`${order.orderNumber || order._id} ${order.user?.name || ""} ${order.user?.email || ""}`.toLowerCase().includes(term)) return false
    return true
  })
  rows.sort((a, b) => req.query.sort === "oldest" ? new Date(a.createdAt) - new Date(b.createdAt) : ["total-desc", "highest"].includes(req.query.sort) ? b.total - a.total : ["total-asc", "lowest"].includes(req.query.sort) ? a.total - b.total : new Date(b.createdAt) - new Date(a.createdAt))
  const revenue = rows.filter((order) => order.status !== "Cancelled" && !["Failed", "Refunded"].includes(order.paymentStatus)).reduce((sum, order) => sum + Number(order.total || 0), 0)
  return res.json({ success: true, ...withPagination(rows.slice(skip, skip + limit).map(serialize), rows.length, page, limit), summary: { revenue, averageOrder: rows.length ? revenue / rows.length : 0 } })
})

async function findOrder(identifier) {
  if (databaseReady()) {
    const conditions = [{ orderNumber: identifier }]
    if (mongoose.isValidObjectId(identifier)) conditions.unshift({ _id: identifier })
    return Order.findOne({ $or: conditions }).populate("user", "name email").lean()
  }
  const order = memory.orders.find((entry) => String(entry._id) === identifier || entry.orderNumber === identifier)
  if (!order) return null
  const user = memory.users.find((entry) => String(entry._id) === String(order.user))
  return { ...order, user }
}

export const getOrder = asyncHandler(async (req, res) => {
  const order = await findOrder(req.params.id)
  if (!order) throw new ApiError("Order not found", 404, "ORDER_NOT_FOUND")
  return res.json({ success: true, data: serialize(order) })
})

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const status = enumValue(req.body.status, statuses, { required: true, label: "Order status" })
  let order
  if (databaseReady()) {
    if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError("Order not found", 404, "ORDER_NOT_FOUND")
    order = await Order.findById(req.params.id)
  } else order = memory.orders.find((entry) => String(entry._id) === req.params.id)
  if (!order) throw new ApiError("Order not found", 404, "ORDER_NOT_FOUND")
  await applyOrderStatus(order, status)
  const hydrated = await findOrder(String(order._id))
  return res.json({ success: true, message: `Order status updated to ${status}`, data: serialize(hydrated || order) })
})
