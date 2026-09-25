import { Product } from "../models/Product.js"
import { Setting } from "../models/Setting.js"
import { databaseReady } from "../config/db.js"
import { memory } from "../data/memory.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError, escapeRegex, idOf, number, pagination, text, withPagination } from "../utils/validation.js"
import { createAdminNotification } from "./notificationController.js"
import { inventoryStatus, serializeProduct } from "./adminProductController.js"

export const listInventory = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query, { defaultLimit: 25, maxLimit: 100 })
  const search = text(req.query.search || req.query.q, { max: 120, label: "Search" })
  const requestedStatus = req.query.status || "all"
  if (!["all", "In Stock", "Low Stock", "Out of Stock"].includes(requestedStatus)) throw new ApiError("Invalid inventory status")

  if (databaseReady()) {
    const setting = await Setting.findOne({ key: "store" }).select("value.lowStockThreshold").lean()
    const defaultThreshold = Number(setting?.value?.lowStockThreshold || 10)
    const match = search ? { $or: [{ title: new RegExp(escapeRegex(search), "i") }, { sku: new RegExp(escapeRegex(search), "i") }] } : {}
    const inventoryExpression = {
      $switch: {
        branches: [
          { case: { $eq: ["$active", false] }, then: "Inactive" },
          { case: { $lte: ["$stock", 0] }, then: "Out of Stock" },
          { case: { $lte: ["$stock", { $ifNull: ["$lowStockThreshold", defaultThreshold] }] }, then: "Low Stock" },
        ],
        default: "In Stock",
      },
    }
    const sort = { newest: { createdAt: -1 }, title: { title: 1 }, "stock-asc": { stock: 1 }, "stock-desc": { stock: -1 } }[req.query.sort] || { stock: 1, title: 1 }
    const [result] = await Product.aggregate([
      { $match: match },
      { $set: { inventoryStatus: inventoryExpression } },
      ...(requestedStatus !== "all" ? [{ $match: { inventoryStatus: requestedStatus } }] : []),
      { $facet: {
        rows: [{ $sort: sort }, { $skip: skip }, { $limit: limit }],
        count: [{ $count: "total" }],
        summary: [{ $group: { _id: null, totalProducts: { $sum: 1 }, totalUnits: { $sum: "$stock" }, inStock: { $sum: { $cond: [{ $eq: ["$inventoryStatus", "In Stock"] }, 1, 0] } }, lowStock: { $sum: { $cond: [{ $eq: ["$inventoryStatus", "Low Stock"] }, 1, 0] } }, outOfStock: { $sum: { $cond: [{ $eq: ["$inventoryStatus", "Out of Stock"] }, 1, 0] } } } }],
      } },
    ])
    const total = result.count[0]?.total || 0
    return res.json({ success: true, ...withPagination(result.rows.map(serializeProduct), total, page, limit), summary: { ...(result.summary[0] || { totalProducts: 0, totalUnits: 0, inStock: 0, lowStock: 0, outOfStock: 0 }), _id: undefined, defaultThreshold } })
  }

  const term = search.toLowerCase()
  let rows = memory.products.filter((product) => !term || `${product.title} ${product.sku}`.toLowerCase().includes(term))
  rows = rows.filter((product) => requestedStatus === "all" || inventoryStatus(product) === requestedStatus)
  rows.sort((a, b) => req.query.sort === "newest" ? new Date(b.createdAt || 0) - new Date(a.createdAt || 0) : req.query.sort === "title" ? a.title.localeCompare(b.title) : req.query.sort === "stock-desc" ? b.stock - a.stock : a.stock - b.stock)
  const summary = memory.products.reduce((value, product) => {
    value.totalProducts += 1
    value.totalUnits += Number(product.stock || 0)
    const status = inventoryStatus(product)
    if (status === "In Stock") value.inStock += 1
    if (status === "Low Stock") value.lowStock += 1
    if (status === "Out of Stock") value.outOfStock += 1
    return value
  }, { totalProducts: 0, totalUnits: 0, inStock: 0, lowStock: 0, outOfStock: 0 })
  return res.json({ success: true, ...withPagination(rows.slice(skip, skip + limit).map(serializeProduct), rows.length, page, limit), summary: { ...summary, defaultThreshold: Number(memory.settings.lowStockThreshold || 10) } })
})

export const updateInventory = asyncHandler(async (req, res) => {
  const stock = number(req.body.stock, { min: 0, max: 10_000_000, integer: true, label: "Stock" })
  const lowStockThreshold = number(req.body.lowStockThreshold ?? req.body.threshold, { min: 0, max: 100_000, integer: true, label: "Low-stock threshold" })
  if (stock === undefined && lowStockThreshold === undefined) throw new ApiError("Provide stock or a low-stock threshold")
  const update = {}
  if (stock !== undefined) update.stock = stock
  if (lowStockThreshold !== undefined) update.lowStockThreshold = lowStockThreshold
  let product
  if (databaseReady()) product = await Product.findByIdAndUpdate(req.params.id, { $set: update }, { new: true, runValidators: true })
  else {
    product = memory.products.find((entry) => String(entry._id) === req.params.id)
    if (product) Object.assign(product, update, { updatedAt: new Date() })
  }
  if (!product) throw new ApiError("Product not found", 404, "PRODUCT_NOT_FOUND")
  if (inventoryStatus(product) === "Low Stock") {
    await createAdminNotification({ type: "admin-stock", title: "Low stock product", message: `${product.title} has ${product.stock} unit(s) left.`, link: "/admin/inventory", metadata: { productId: idOf(product), stock: product.stock, threshold: product.lowStockThreshold } }, { dedupeKey: `low-stock:${idOf(product)}:${product.lowStockThreshold}`, dedupeHours: 12 })
  }
  return res.json({ success: true, message: "Inventory updated", data: serializeProduct(product) })
})
