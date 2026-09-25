import mongoose from "mongoose"
import { User } from "../models/User.js"
import { Order } from "../models/Order.js"
import { Review } from "../models/Review.js"
import { Wishlist } from "../models/Wishlist.js"
import { databaseReady } from "../config/db.js"
import { memory } from "../data/memory.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError, enumValue, escapeRegex, idOf, isMongoId, pagination, text, withPagination } from "../utils/validation.js"
import { createAdminNotification } from "./notificationController.js"

const roles = ["customer", "admin"]
const statuses = ["active", "inactive", "suspended"]

function safeUser(user) {
  return {
    id: idOf(user),
    _id: idOf(user),
    name: user.name,
    email: user.email,
    role: user.role || "customer",
    status: user.status || "active",
    statusReason: user.statusReason || "",
    lastLoginAt: user.lastLoginAt || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    orderCount: Number(user.orderCount || 0),
    totalSpent: Number(user.totalSpent || 0),
  }
}

async function ensureCanChangeAdmin(targetId, nextRole, nextStatus) {
  const current = databaseReady() ? await User.findById(targetId) : memory.users.find((entry) => String(entry._id) === String(targetId))
  if (!current) throw new ApiError("User not found", 404, "USER_NOT_FOUND")
  const removesActiveAdmin = (current.role === "admin" && (!current.status || current.status === "active")) && (nextRole !== "admin" || (nextStatus && nextStatus !== "active"))
  if (!removesActiveAdmin) return
  const count = databaseReady()
    ? await User.countDocuments({ role: "admin", $or: [{ status: "active" }, { status: { $exists: false } }] })
    : memory.users.filter((user) => user.role === "admin" && (!user.status || user.status === "active")).length
  if (count <= 1) throw new ApiError("The last active administrator cannot be demoted or deactivated", 409, "LAST_ADMIN")
}

export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query, { defaultLimit: 20 })
  const search = text(req.query.search || req.query.q, { max: 120, label: "Search" })
  const role = req.query.role && req.query.role !== "all" ? enumValue(req.query.role, roles, { label: "Role" }) : undefined
  const status = req.query.status && req.query.status !== "all" ? enumValue(req.query.status, statuses, { label: "Status" }) : undefined
  const sort = { newest: { createdAt: -1 }, oldest: { createdAt: 1 }, name: { name: 1 }, nameDesc: { name: -1 }, spent: { totalSpent: -1 }, spentDesc: { totalSpent: 1 }, orders: { orderCount: -1 }, ordersDesc: { orderCount: 1 } }[req.query.sort] || { createdAt: -1 }

  if (databaseReady()) {
    // MongoDB rejects an empty `$and`, so conditions are only added when needed
    // and the key is dropped again if nothing ends up in it.
    const match = {}
    const and = []
    if (role === "customer") and.push({ $or: [{ role: "customer" }, { role: { $exists: false } }] })
    else if (role) match.role = role
    if (status === "active") and.push({ $or: [{ status: "active" }, { status: { $exists: false } }] })
    else if (status) match.status = status
    if (search) and.push({ $or: [{ name: new RegExp(escapeRegex(search), "i") }, { email: new RegExp(escapeRegex(search), "i") }] })
    if (and.length) match.$and = and
    const [result] = await User.aggregate([
      { $match: match },
      {
        $lookup: {
          from: "orders",
          let: { userId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$user", "$$userId"] } } },
            { $group: { _id: null, orderCount: { $sum: 1 }, totalSpent: { $sum: { $cond: [{ $and: [{ $ne: ["$status", "Cancelled"] }, { $not: [{ $in: ["$paymentStatus", ["Failed", "Refunded"]] }] }] }, "$total", 0] } } } },
          ],
          as: "orderStats",
        },
      },
      { $set: { orderCount: { $ifNull: [{ $first: "$orderStats.orderCount" }, 0] }, totalSpent: { $ifNull: [{ $first: "$orderStats.totalSpent" }, 0] } } },
      { $sort: sort },
      { $facet: { rows: [{ $project: { passwordHash: 0 } }, { $skip: skip }, { $limit: limit }], count: [{ $count: "total" }] } },
    ])
    const total = result.count[0]?.total || 0
    return res.json({ success: true, ...withPagination(result.rows.map(safeUser), total, page, limit) })
  }

  const ordersByUser = new Map()
  for (const order of memory.orders) {
    const key = String(order.user)
    const current = ordersByUser.get(key) || { orderCount: 0, totalSpent: 0 }
    current.orderCount += 1
    if (order.status !== "Cancelled" && !["Failed", "Refunded"].includes(order.paymentStatus)) current.totalSpent += Number(order.total || 0)
    ordersByUser.set(key, current)
  }
  const term = search.toLowerCase()
  let rows = memory.users.map((user) => ({ ...user, ...(ordersByUser.get(String(user._id)) || { orderCount: 0, totalSpent: 0 }) })).filter((user) => {
    if (role && (user.role || "customer") !== role) return false
    if (status && (user.status || "active") !== status) return false
    if (term && !`${user.name} ${user.email}`.toLowerCase().includes(term)) return false
    return true
  })
  rows.sort((a, b) => req.query.sort === "oldest" ? new Date(a.createdAt) - new Date(b.createdAt) : ["name", "nameDesc"].includes(req.query.sort) ? (req.query.sort === "nameDesc" ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name)) : ["spent", "spentDesc"].includes(req.query.sort) ? (req.query.sort === "spentDesc" ? a.totalSpent - b.totalSpent : b.totalSpent - a.totalSpent) : ["orders", "ordersDesc"].includes(req.query.sort) ? (req.query.sort === "ordersDesc" ? a.orderCount - b.orderCount : b.orderCount - a.orderCount) : new Date(b.createdAt) - new Date(a.createdAt))
  return res.json({ success: true, ...withPagination(rows.slice(skip, skip + limit).map(safeUser), rows.length, page, limit) })
})

export const getUser = asyncHandler(async (req, res) => {
  let user
  if (databaseReady()) {
    if (!isMongoId(req.params.id)) throw new ApiError("User not found", 404, "USER_NOT_FOUND")
    const [row, orders, orderStats, reviews, wishlist] = await Promise.all([
      User.findById(req.params.id).lean(),
      Order.find({ user: req.params.id }).sort({ createdAt: -1 }).limit(10).lean(),
      Order.aggregate([{ $match: { user: req.params.id, status: { $ne: "Cancelled" }, paymentStatus: { $nin: ["Failed", "Refunded"] } } }, { $group: { _id: null, totalSpent: { $sum: "$total" } } }]),
      Review.find({ user: req.params.id }).populate("product", "title images").sort({ createdAt: -1 }).limit(20).lean(),
      Wishlist.findOne({ user: req.params.id }).populate("items.product", "title images price stock").lean(),
    ])
    if (!row) throw new ApiError("User not found", 404, "USER_NOT_FOUND")
    const validOrders = orders.filter((order) => order.status !== "Cancelled" && !["Failed", "Refunded"].includes(order.paymentStatus))
    user = safeUser({ ...row, orderCount: await Order.countDocuments({ user: req.params.id }), totalSpent: orderStats[0]?.totalSpent || validOrders.reduce((sum, order) => sum + Number(order.total || 0), 0) })
    return res.json({ success: true, data: { ...user, addresses: row.addresses || [], orders, recentOrders: orders, reviews, wishlist: wishlist?.items || [] } })
  }
  user = memory.users.find((entry) => String(entry._id) === req.params.id)
  if (!user) throw new ApiError("User not found", 404, "USER_NOT_FOUND")
  const orders = memory.orders.filter((order) => String(order.user) === String(user._id)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const validOrders = orders.filter((order) => order.status !== "Cancelled" && !["Failed", "Refunded"].includes(order.paymentStatus))
  const reviews = memory.reviews.filter((review) => String(review.user) === String(user._id))
  const wishlist = (memory.wishlists.get(String(user._id)) || []).map((entry) => ({ ...entry, product: memory.products.find((product) => String(product._id) === String(entry.productId)) }))
  return res.json({ success: true, data: { ...safeUser({ ...user, orderCount: orders.length, totalSpent: validOrders.reduce((sum, order) => sum + Number(order.total || 0), 0) }), addresses: user.addresses || [], orders: orders.slice(0, 10), recentOrders: orders.slice(0, 10), reviews, wishlist } })
})

export const updateUserStatus = asyncHandler(async (req, res) => {
  const status = enumValue(req.body.status, statuses, { required: true, label: "Status" })
  if (String(req.params.id) === String(req.user._id) && status !== "active") throw new ApiError("You cannot deactivate your own administrator account", 409, "SELF_STATUS_CHANGE")
  await ensureCanChangeAdmin(req.params.id, undefined, status)
  const statusReason = text(req.body.reason, { max: 300, label: "Reason" })
  let user
  if (databaseReady()) {
    user = await User.findByIdAndUpdate(req.params.id, { $set: { status, statusReason, statusChangedAt: new Date() }, $inc: { tokenVersion: 1 } }, { new: true, runValidators: true })
  } else {
    user = memory.users.find((entry) => String(entry._id) === req.params.id)
    if (user) Object.assign(user, { status, statusReason, statusChangedAt: new Date(), tokenVersion: Number(user.tokenVersion || 0) + 1 })
  }
  if (!user) throw new ApiError("User not found", 404, "USER_NOT_FOUND")
  return res.json({ success: true, message: `Customer ${status}`, data: safeUser(user) })
})

export const updateUserRole = asyncHandler(async (req, res) => {
  const role = enumValue(req.body.role, roles, { required: true, label: "Role" })
  if (String(req.params.id) === String(req.user._id) && role !== "admin") throw new ApiError("You cannot remove your own administrator role", 409, "SELF_ROLE_CHANGE")
  await ensureCanChangeAdmin(req.params.id, role, undefined)
  let user
  if (databaseReady()) {
    user = await User.findByIdAndUpdate(req.params.id, { $set: { role }, $inc: { tokenVersion: 1 } }, { new: true, runValidators: true })
  } else {
    user = memory.users.find((entry) => String(entry._id) === req.params.id)
    if (user) Object.assign(user, { role, tokenVersion: Number(user.tokenVersion || 0) + 1 })
  }
  if (!user) throw new ApiError("User not found", 404, "USER_NOT_FOUND")
  return res.json({ success: true, message: `Role changed to ${role}`, data: safeUser(user) })
})

export async function notifyNewCustomer(user) {
  await createAdminNotification({ type: "admin-customer", title: "New customer registration", message: `${user.name} created an account.`, link: `/admin/users/${String(user._id)}`, metadata: { userId: String(user._id) } }, { dedupeKey: `new-customer:${user._id}` })
}
