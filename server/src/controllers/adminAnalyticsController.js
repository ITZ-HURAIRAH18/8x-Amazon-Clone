import { Order } from "../models/Order.js"
import { User } from "../models/User.js"
import { Product } from "../models/Product.js"
import { Review } from "../models/Review.js"
import { Deal } from "../models/Deal.js"
import { Setting } from "../models/Setting.js"
import { databaseReady } from "../config/db.js"
import { memory } from "../data/memory.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError, dateValue } from "../utils/validation.js"
import { refreshDealStates } from "../services/dealService.js"

const round = (value) => Math.round(Number(value || 0) * 100) / 100
const startOfDay = (date) => { const result = new Date(date); result.setUTCHours(0, 0, 0, 0); return result }
const addDays = (date, days) => new Date(new Date(date).getTime() + days * 86400000)
const startOfWeek = (date) => { const result = startOfDay(date); const day = result.getUTCDay() || 7; result.setUTCDate(result.getUTCDate() - day + 1); return result }
const startOfMonth = (date) => { const result = startOfDay(date); result.setUTCDate(1); return result }
const startOfYear = (date) => { const result = startOfDay(date); result.setUTCMonth(0, 1); return result }

export function parseAnalyticsRange(query = {}, nowInput = new Date()) {
  const now = new Date(nowInput)
  const raw = String(query.range || query.period || "last30days").toLowerCase().replace(/[\s_-]/g, "")
  let start
  let end = new Date(now.getTime() + 1)
  let label = "Last 30 days"
  if (raw === "today") { start = startOfDay(now); label = "Today" }
  else if (raw === "yesterday") { end = startOfDay(now); start = addDays(end, -1); label = "Yesterday" }
  else if (raw === "last7days" || raw === "7d" || raw === "7days") { start = addDays(startOfDay(now), -6); label = "Last 7 days" }
  else if (["last30days", "30d", "30days"].includes(raw)) { start = addDays(startOfDay(now), -29); label = "Last 30 days" }
  else if (raw === "thismonth" || raw === "month") { start = startOfMonth(now); label = "This month" }
  else if (raw === "lastmonth" || raw === "lastmonth") { const current = startOfMonth(now); end = current; start = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() - 1, 1)); label = "Last month" }
  else if (raw === "thisyear" || raw === "year") { start = startOfYear(now); label = "This year" }
  else if (raw === "custom") {
    start = dateValue(query.from || query.startDate, { required: true, label: "Custom range start" })
    end = dateValue(query.to || query.endDate, { required: true, label: "Custom range end" })
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(query.to || query.endDate || ""))) end = addDays(end, 1)
    if (end <= start) throw new ApiError("Custom range end must be after its start")
    if (end.getTime() - start.getTime() > 5 * 366 * 86400000) throw new ApiError("Analytics ranges cannot exceed five years")
    label = "Custom range"
  } else if (["last90days", "90d", "90days"].includes(raw)) { start = addDays(startOfDay(now), -89); label = "Last 90 days" }
  else throw new ApiError("Unsupported analytics date range")
  return { start, end, label, range: raw }
}

const dateMatch = (range) => ({ createdAt: { $gte: range.start, $lt: range.end } })
const validRevenueMatch = (range) => ({ ...dateMatch(range), status: { $ne: "Cancelled" }, paymentStatus: { $nin: ["Failed", "Refunded"] } })
const validRevenue = (order) => order && order.status !== "Cancelled" && !["Failed", "Refunded"].includes(order.paymentStatus)
const inRange = (date, range) => { const value = new Date(date).getTime(); return value >= range.start.getTime() && value < range.end.getTime() }
const money = (value) => round(value)

const serializeOrderLite = (order) => ({ id: String(order._id), orderNumber: order.orderNumber, status: order.status, total: Number(order.total || 0), itemCount: (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0), createdAt: order.createdAt, customer: order.user?.name ? { id: String(order.user._id), name: order.user.name, email: order.user.email } : undefined })

const dateKey = (date) => new Date(date).toISOString().slice(0, 10)

function fallbackOrders(range) {
  return memory.orders.filter((order) => inRange(order.createdAt, range))
}

function fallbackTimeline(orders) {
  const grouped = new Map()
  for (const order of orders) {
    const key = dateKey(order.createdAt)
    const current = grouped.get(key) || { date: key, revenue: 0, orders: 0, units: 0 }
    current.orders += 1
    current.units += (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)
    if (validRevenue(order)) current.revenue += Number(order.total || 0)
    grouped.set(key, current)
  }
  return [...grouped.values()].map((value) => ({ ...value, revenue: money(value.revenue) })).sort((a, b) => a.date.localeCompare(b.date))
}

function fallbackItemSales(orders, key) {
  const grouped = new Map()
  for (const order of orders.filter(validRevenue)) {
    for (const item of order.items || []) {
      const id = String(item.product || item.title)
      const current = grouped.get(id) || { _id: id, title: item.title, revenue: 0, units: 0 }
      current.revenue += Number(item.unitPrice || 0) * Number(item.quantity || 0)
      current.units += Number(item.quantity || 0)
      if (key) {
        const product = memory.products.find((entry) => String(entry._id) === String(item.product))
        const value = product?.[key] || "Unknown"
        const groupId = String(value)
        const existing = grouped.get(groupId) || { _id: groupId, title: value, revenue: 0, units: 0 }
        existing.revenue += Number(item.unitPrice || 0) * Number(item.quantity || 0)
        existing.units += Number(item.quantity || 0)
        grouped.set(groupId, existing)
      }
      if (key === null) grouped.set(id, current)
    }
  }
  return [...grouped.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 20)
}

async function dbDashboard(range) {
  const now = new Date()
  const today = startOfDay(now)
  const week = startOfWeek(now)
  const month = startOfMonth(now)
  const setting = await Setting.findOne({ key: "store" }).select("value.lowStockThreshold").lean()
  const defaultThreshold = Number(setting?.value?.lowStockThreshold || 10)
  const [orderResult, customerResult, productResult, reviewResult, lowStock, activeDeals, recentOrders] = await Promise.all([
    Order.aggregate([
      { $facet: {
        revenue: [
          { $match: validRevenueMatch(range) },
          { $group: { _id: null, totalRevenue: { $sum: "$total" }, totalOrders: { $sum: 1 }, units: { $sum: { $sum: "$items.quantity" } }, todayRevenue: { $sum: { $cond: [{ $gte: ["$createdAt", today] }, "$total", 0] } }, weekRevenue: { $sum: { $cond: [{ $gte: ["$createdAt", week] }, "$total", 0] } }, monthRevenue: { $sum: { $cond: [{ $gte: ["$createdAt", month] }, "$total", 0] } } } },
        ],
        allOrders: [
          { $match: dateMatch(range) },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ],
        timeline: [
          { $match: dateMatch(range) },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } }, revenue: { $sum: { $cond: [{ $and: [{ $ne: ["$status", "Cancelled"] }, { $not: [{ $in: ["$paymentStatus", ["Failed", "Refunded"]] }] }] }, "$total", 0] } }, orders: { $sum: 1 }, units: { $sum: { $sum: "$items.quantity" } } } },
          { $sort: { _id: 1 } },
        ],
        topProducts: [
          { $match: validRevenueMatch(range) }, { $unwind: "$items" }, { $group: { _id: "$items.product", title: { $first: "$items.title" }, revenue: { $sum: { $multiply: ["$items.unitPrice", "$items.quantity"] } }, units: { $sum: "$items.quantity" } } }, { $sort: { revenue: -1 } }, { $limit: 10 },
        ],
        topCategories: [
          { $match: validRevenueMatch(range) }, { $unwind: "$items" }, { $lookup: { from: "products", localField: "items.product", foreignField: "_id", as: "productInfo" } }, { $set: { productInfo: { $first: "$productInfo" } } }, { $group: { _id: { $ifNull: ["$productInfo.category", "Unknown"] }, revenue: { $sum: { $multiply: ["$items.unitPrice", "$items.quantity"] } }, units: { $sum: "$items.quantity" } } }, { $sort: { revenue: -1 } }, { $limit: 20 },
        ],
        topBrands: [
          { $match: validRevenueMatch(range) }, { $unwind: "$items" }, { $lookup: { from: "products", localField: "items.product", foreignField: "_id", as: "productInfo" } }, { $set: { productInfo: { $first: "$productInfo" } } }, { $group: { _id: { $ifNull: ["$productInfo.brand", "Unknown"] }, revenue: { $sum: { $multiply: ["$items.unitPrice", "$items.quantity"] } }, units: { $sum: "$items.quantity" } } }, { $sort: { revenue: -1 } }, { $limit: 20 },
        ],
      } },
    ]),
    User.aggregate([
      { $match: { role: { $ne: "admin" } } },
      { $group: { _id: null, total: { $sum: 1 }, newInRange: { $sum: { $cond: [{ $gte: ["$createdAt", range.start] }, 1, 0] } } } },
    ]),
    Product.aggregate([{ $match: { active: { $ne: false } } }, { $group: { _id: null, total: { $sum: 1 }, outOfStock: { $sum: { $cond: [{ $lte: ["$stock", 0] }, 1, 0] } }, lowStock: { $sum: { $cond: [{ $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", { $ifNull: ["$lowStockThreshold", defaultThreshold] }] }] }, 1, 0] } } } }]),
    Review.aggregate([{ $group: { _id: null, total: { $sum: 1 }, pending: { $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] } }, average: { $avg: "$rating" } } }]),
    Product.find({ active: { $ne: false }, $expr: { $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", { $ifNull: ["$lowStockThreshold", defaultThreshold] }] }] } }).sort({ stock: 1 }).limit(10).lean(),
    Deal.find({ active: true, startsAt: { $lte: now }, endsAt: { $gt: now } }).sort({ endsAt: 1 }).limit(10).lean(),
    Order.find(dateMatch(range)).sort({ createdAt: -1 }).limit(8).populate("user", "name email").lean(),
  ])
  // The active-customer facet above intentionally remains a separate count query below;
  // using a second query keeps the customer pipeline portable across MongoDB versions.
  const activeCustomerIds = await Order.distinct("user", { createdAt: { $gte: addDays(today, -30), $lt: now } })
  const activeCustomers = await User.countDocuments({ _id: { $in: activeCustomerIds }, role: { $ne: "admin" } })
  const orderData = orderResult[0] || {}
  const revenue = orderData.revenue?.[0] || {}
  const statusCounts = Object.fromEntries((orderData.allOrders || []).map((row) => [row._id, row.count]))
  const customerData = customerResult[0] || {}
  const productData = productResult[0] || {}
  const reviewData = reviewResult[0] || {}
  return {
    range: { start: range.start, end: range.end, label: range.label },
    revenue: { total: money(revenue.totalRevenue), today: money(revenue.todayRevenue), thisWeek: money(revenue.weekRevenue), thisMonth: money(revenue.monthRevenue), currency: "USD" },
    orders: { total: Object.values(statusCounts).reduce((sum, value) => sum + value, 0), pending: statusCounts.Pending || 0, processing: statusCounts.Processing || 0, shipped: statusCounts.Shipped || 0, outForDelivery: statusCounts["Out for delivery"] || 0, delivered: statusCounts.Delivered || 0, cancelled: statusCounts.Cancelled || 0, statusDistribution: statusCounts },
    customers: { total: customerData.total || 0, new: customerData.newInRange || 0, active: activeCustomers },
    products: { total: productData.total || 0, active: productData.total || 0, outOfStock: productData.outOfStock || 0, lowStock: productData.lowStock || 0 },
    reviews: { total: reviewData.total || 0, pending: reviewData.pending || 0, averageRating: Math.round(Number(reviewData.average || 0) * 10) / 10 },
    sales: { timeline: (orderData.timeline || []).map((row) => ({ date: row._id, revenue: money(row.revenue), orders: row.orders, units: row.units })), topProducts: (orderData.topProducts || []).map((row) => ({ id: String(row._id || ""), title: row.title, revenue: money(row.revenue), units: row.units })), byCategory: (orderData.topCategories || []).map((row) => ({ name: row._id, revenue: money(row.revenue), units: row.units })), byBrand: (orderData.topBrands || []).map((row) => ({ name: row._id, revenue: money(row.revenue), units: row.units })) },
    lowStockProducts: lowStock.map((product) => ({ id: String(product._id), title: product.title, sku: product.sku, stock: product.stock, threshold: product.lowStockThreshold ?? 10 })),
    activeDeals: activeDeals.map((deal) => ({ id: String(deal._id), name: deal.name, endsAt: deal.endsAt, productCount: deal.products?.length || 0 })),
    recentOrders: recentOrders.map(serializeOrderLite),
    revenueLogic: "Revenue includes paid or pending orders created in the selected range, excludes Cancelled, Failed, and Refunded orders, and uses the persisted order total.",
  }
}

function fallbackDashboard(range) {
  const orders = fallbackOrders(range)
  const valid = orders.filter(validRevenue)
  const now = new Date()
  const today = startOfDay(now)
  const revenue = { total: valid.reduce((sum, order) => sum + Number(order.total || 0), 0), today: valid.filter((order) => new Date(order.createdAt) >= today).reduce((sum, order) => sum + Number(order.total || 0), 0), thisWeek: valid.filter((order) => new Date(order.createdAt) >= startOfWeek(now)).reduce((sum, order) => sum + Number(order.total || 0), 0), thisMonth: valid.filter((order) => new Date(order.createdAt) >= startOfMonth(now)).reduce((sum, order) => sum + Number(order.total || 0), 0) }
  const statusDistribution = orders.reduce((result, order) => { result[order.status] = (result[order.status] || 0) + 1; return result }, {})
  const users = new Map(memory.users.map((user) => [String(user._id), user]))
  const customerIds = new Set(memory.users.filter((user) => user.role !== "admin").map((user) => String(user._id)))
  const activeCustomers = new Set(memory.orders.filter((order) => customerIds.has(String(order.user)) && new Date(order.createdAt) >= addDays(today, -30)).map((order) => String(order.user))).size
  const productRows = memory.products.filter((product) => product.active !== false)
  const approvedReviews = memory.reviews.filter((review) => !review.status || review.status === "Approved")
  return {
    range: { start: range.start, end: range.end, label: range.label },
    revenue: { ...Object.fromEntries(Object.entries(revenue).map(([key, value]) => [key, money(value)])), currency: "USD" },
    orders: { total: orders.length, pending: statusDistribution.Pending || 0, processing: statusDistribution.Processing || 0, shipped: statusDistribution.Shipped || 0, outForDelivery: statusDistribution["Out for delivery"] || 0, delivered: statusDistribution.Delivered || 0, cancelled: statusDistribution.Cancelled || 0, statusDistribution },
    customers: { total: customerIds.size, new: memory.users.filter((user) => customerIds.has(String(user._id)) && inRange(user.createdAt, range)).length, active: activeCustomers },
    products: { total: productRows.length, active: productRows.length, outOfStock: productRows.filter((product) => product.stock <= 0).length, lowStock: productRows.filter((product) => product.stock > 0 && product.stock <= (product.lowStockThreshold ?? 10)).length },
    reviews: { total: approvedReviews.length, pending: memory.reviews.filter((review) => review.status === "Pending").length, averageRating: approvedReviews.length ? Math.round((approvedReviews.reduce((sum, review) => sum + review.rating, 0) / approvedReviews.length) * 10) / 10 : 0 },
    sales: { timeline: fallbackTimeline(orders), topProducts: fallbackItemSales(valid, null), byCategory: fallbackItemSales(valid, "category"), byBrand: fallbackItemSales(valid, "brand") },
    lowStockProducts: productRows.filter((product) => product.stock > 0 && product.stock <= (product.lowStockThreshold ?? 10)).sort((a, b) => a.stock - b.stock).slice(0, 10).map((product) => ({ id: String(product._id), title: product.title, sku: product.sku, stock: product.stock, threshold: product.lowStockThreshold ?? 10 })),
    activeDeals: memory.deals.filter((deal) => deal.active && new Date(deal.startsAt) <= now && new Date(deal.endsAt) > now).map((deal) => ({ id: String(deal._id), name: deal.name, endsAt: deal.endsAt, productCount: deal.products.length })),
    recentOrders: orders.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8).map((order) => serializeOrderLite({ ...order, user: users.get(String(order.user)) })),
    revenueLogic: "Revenue includes paid or pending orders created in the selected range, excludes Cancelled, Failed, and Refunded orders, and uses the persisted order total.",
  }
}

async function dashboardData(query) {
  const range = parseAnalyticsRange(query)
  if (databaseReady()) await refreshDealStates().catch(() => {})
  const data = databaseReady() ? await dbDashboard(range) : fallbackDashboard(range)
  data.revenue.week = data.revenue.thisWeek
  data.revenue.month = data.revenue.thisMonth
  data.orders.Pending = data.orders.pending
  data.orders.Processing = data.orders.processing
  data.orders.Shipped = data.orders.shipped
  data.orders.Delivered = data.orders.delivered
  data.orders.Cancelled = data.orders.cancelled
  data.reviews.Pending = data.reviews.pending
  data.lowStock = data.lowStockProducts
  data.metrics = {
    revenue: data.revenue.total,
    orders: data.orders.total,
    customers: data.customers.total,
    products: data.products.total,
    reviews: data.reviews.total,
  }
  return data
}

async function customerGrowth(query) {
  const range = parseAnalyticsRange(query)
  if (databaseReady()) {
    const rows = await User.aggregate([{ $match: { ...dateMatch(range), role: { $ne: "admin" } } }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }])
    return rows.map((row) => ({ date: row._id, label: row._id, value: row.count, count: row.count }))
  }
  const grouped = new Map()
  for (const user of memory.users.filter((entry) => entry.role !== "admin" && inRange(entry.createdAt, range))) {
    const key = dateKey(user.createdAt)
    grouped.set(key, (grouped.get(key) || 0) + 1)
  }
  return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, label: date, value: count, count }))
}

export const getDashboard = asyncHandler(async (req, res) => res.json({ success: true, data: await dashboardData(req.query) }))

export const getAnalyticsOverview = asyncHandler(async (req, res) => {
  const data = await dashboardData(req.query)
  const customersOverTime = await customerGrowth(req.query)
  const timeline = data.sales.timeline || []
  const validOrderCount = Number(data.orders?.total || 0)
  const unitsSold = timeline.reduce((sum, point) => sum + Number(point.units || 0), 0)
  const response = {
    ...data,
    unitsSold,
    averageOrderValue: validOrderCount ? money(data.revenue.total / validOrderCount) : 0,
    revenueOverTime: timeline.map((point) => ({ ...point, label: point.date, value: point.revenue })),
    ordersOverTime: timeline.map((point) => ({ ...point, label: point.date, value: point.orders })),
    topProducts: (data.sales.topProducts || []).map((product) => ({ ...product, label: product.title, value: product.revenue })),
    salesByCategory: (data.sales.byCategory || []).map((category) => ({ ...category, label: category.name, value: category.revenue })),
    salesByBrand: (data.sales.byBrand || []).map((brand) => ({ ...brand, label: brand.name, value: brand.revenue })),
    statusDistribution: Object.entries(data.orders.statusDistribution || {}).map(([label, count]) => ({ label, value: count, count })),
    customersOverTime,
  }
  return res.json({ success: true, data: response })
})

export const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const range = parseAnalyticsRange(req.query)
  if (databaseReady()) {
    const [summary, timeline] = await Promise.all([
      Order.aggregate([{ $match: validRevenueMatch(range) }, { $group: { _id: null, revenue: { $sum: "$total" }, orders: { $sum: 1 }, averageOrder: { $avg: "$total" }, units: { $sum: { $sum: "$items.quantity" } } } }]),
      Order.aggregate([{ $match: dateMatch(range) }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } }, revenue: { $sum: { $cond: [{ $and: [{ $ne: ["$status", "Cancelled"] }, { $not: [{ $in: ["$paymentStatus", ["Failed", "Refunded"]] }] }] }, "$total", 0] } }, orders: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    ])
    const row = summary[0] || {}
    return res.json({ success: true, data: { range: { start: range.start, end: range.end, label: range.label }, summary: { revenue: money(row.revenue), orders: row.orders || 0, averageOrder: money(row.averageOrder), units: row.units || 0 }, timeline: timeline.map((entry) => ({ date: entry._id, revenue: money(entry.revenue), orders: entry.orders })), revenueLogic: "Paid or pending orders only; Cancelled, Failed, and Refunded orders are excluded." } })
  }
  const valid = fallbackOrders(range).filter(validRevenue)
  return res.json({ success: true, data: { range: { start: range.start, end: range.end, label: range.label }, summary: { revenue: money(valid.reduce((sum, order) => sum + Number(order.total || 0), 0)), orders: valid.length, averageOrder: money(valid.length ? valid.reduce((sum, order) => sum + Number(order.total || 0), 0) / valid.length : 0), units: valid.reduce((sum, order) => sum + (order.items || []).reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0), 0) }, timeline: fallbackTimeline(fallbackOrders(range)), revenueLogic: "Paid or pending orders only; Cancelled, Failed, and Refunded orders are excluded." } })
})

export const getOrderAnalytics = asyncHandler(async (req, res) => {
  const range = parseAnalyticsRange(req.query)
  if (databaseReady()) {
    const [status, timeline] = await Promise.all([
      Order.aggregate([
        { $match: dateMatch(range) },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            revenue: {
              $sum: {
                $cond: [
                  { $and: [{ $ne: ["$status", "Cancelled"] }, { $not: [{ $in: ["$paymentStatus", ["Failed", "Refunded"]] }] }] },
                  "$total",
                  0,
                ],
              },
            },
          },
        },
        { $sort: { count: -1 } },
      ]),
      Order.aggregate([{ $match: dateMatch(range) }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } }, orders: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    ])
    return res.json({ success: true, data: { range: { start: range.start, end: range.end, label: range.label }, statusDistribution: status.map((row) => ({ status: row._id, count: row.count, revenue: money(row.revenue) })), timeline: timeline.map((row) => ({ date: row._id, orders: row.orders })) } })
  }
  const orders = fallbackOrders(range)
  const grouped = orders.reduce((result, order) => { const key = order.status; result[key] ||= { status: key, count: 0, revenue: 0 }; result[key].count += 1; if (validRevenue(order)) result[key].revenue += Number(order.total || 0); return result }, {})
  return res.json({ success: true, data: { range: { start: range.start, end: range.end, label: range.label }, statusDistribution: Object.values(grouped), timeline: fallbackTimeline(orders).map(({ date, orders: count }) => ({ date, orders: count })) } })
})

async function productAnalytics(range, key) {
  if (databaseReady()) {
    const grouping = key
      ? { _id: { $ifNull: [`$productInfo.${key}`, "Unknown"] }, title: { $first: { $ifNull: [`$productInfo.${key}`, "Unknown"] } } }
      : { _id: "$items.product", title: { $first: "$items.title" } }
    const rows = await Order.aggregate([
      { $match: validRevenueMatch(range) }, { $unwind: "$items" }, { $lookup: { from: "products", localField: "items.product", foreignField: "_id", as: "productInfo" } }, { $set: { productInfo: { $first: "$productInfo" } } }, { $group: { ...grouping, revenue: { $sum: { $multiply: ["$items.unitPrice", "$items.quantity"] } }, units: { $sum: "$items.quantity" } } }, { $sort: { revenue: -1 } }, { $limit: 50 },
    ])
    return rows.map((row) => ({ id: String(row._id), name: row.title, title: row.title, revenue: money(row.revenue), units: row.units }))
  }
  return fallbackItemSales(fallbackOrders(range).filter(validRevenue), key === "category" ? "category" : key === "brand" ? "brand" : null).map((row) => ({ id: String(row._id), name: row.title, title: row.title, revenue: money(row.revenue), units: row.units }))
}

export const getProductAnalytics = asyncHandler(async (req, res) => res.json({ success: true, data: { range: parseAnalyticsRange(req.query), products: await productAnalytics(parseAnalyticsRange(req.query), null) } }))
export const getCategoryAnalytics = asyncHandler(async (req, res) => { const range = parseAnalyticsRange(req.query); return res.json({ success: true, data: { range, categories: await productAnalytics(range, "category") } }) })
export const getBrandAnalytics = asyncHandler(async (req, res) => { const range = parseAnalyticsRange(req.query); return res.json({ success: true, data: { range, brands: await productAnalytics(range, "brand") } }) })

export const getCustomerAnalytics = asyncHandler(async (req, res) => {
  const range = parseAnalyticsRange(req.query)
  if (databaseReady()) {
    const [summary, top] = await Promise.all([
      User.aggregate([{ $match: { role: { $ne: "admin" } } }, { $group: { _id: null, total: { $sum: 1 }, newInRange: { $sum: { $cond: [{ $gte: ["$createdAt", range.start] }, 1, 0] } } } }]),
      Order.aggregate([
        { $match: validRevenueMatch(range) },
        { $group: { _id: "$user", orders: { $sum: 1 }, totalSpent: { $sum: "$total" } } },
        { $sort: { totalSpent: -1 } },
        { $limit: 20 },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
        { $set: { user: { $first: "$user" } } },
      ]),
    ])
    const row = summary[0] || {}
    return res.json({ success: true, data: { range, summary: { total: row.total || 0, new: row.newInRange || 0, active: await Order.distinct("user", { createdAt: { $gte: addDays(new Date(), -30) } }).then((ids) => User.countDocuments({ _id: { $in: ids }, role: { $ne: "admin" } })) }, topCustomers: top.map((entry) => ({ id: String(entry.user?._id || entry._id), name: entry.user?.name || "Customer", email: entry.user?.email || "", orders: entry.orders, totalSpent: money(entry.totalSpent) })) } })
  }
  const orders = fallbackOrders(range).filter(validRevenue)
  const totals = new Map()
  for (const order of orders) { const current = totals.get(String(order.user)) || { user: memory.users.find((entry) => String(entry._id) === String(order.user)), orders: 0, totalSpent: 0 }; current.orders += 1; current.totalSpent += Number(order.total || 0); totals.set(String(order.user), current) }
  const customerIds = new Set(memory.users.filter((user) => user.role !== "admin").map((user) => String(user._id)))
  const active = new Set(memory.orders.filter((order) => customerIds.has(String(order.user)) && new Date(order.createdAt) >= addDays(new Date(), -30)).map((order) => String(order.user))).size
  return res.json({ success: true, data: { range, summary: { total: memory.users.filter((user) => user.role !== "admin").length, new: memory.users.filter((user) => user.role !== "admin" && inRange(user.createdAt, range)).length, active }, topCustomers: [...totals.values()].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 20).map((entry) => ({ id: String(entry.user?._id || ""), name: entry.user?.name || "Customer", email: entry.user?.email || "", orders: entry.orders, totalSpent: money(entry.totalSpent) })) } })
})
