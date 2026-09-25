import { Product } from "../models/Product.js"
import { Category } from "../models/Category.js"
import { Brand } from "../models/Brand.js"
import { Deal } from "../models/Deal.js"
import { Cart } from "../models/Cart.js"
import { Wishlist } from "../models/Wishlist.js"
import { databaseReady } from "../config/db.js"
import { memory, id } from "../data/memory.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import {
  ApiError,
  boolean,
  dateValue,
  escapeRegex,
  httpUrl,
  idOf,
  isMongoId,
  number,
  objectIdList,
  pagination,
  safeSpecifications,
  slugify,
  stringList,
  text,
  withPagination,
} from "../utils/validation.js"
import { ensureTaxonomyRecords, invalidateTaxonomyCache } from "../services/taxonomyService.js"
import { createAdminNotification } from "./notificationController.js"
import { restoreDealProducts } from "../services/dealService.js"

const productSorts = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  title: { title: 1 },
  "title-asc": { title: 1 },
  "title-desc": { title: -1 },
  "price-asc": { price: 1 },
  "price-desc": { price: -1 },
  priceAsc: { price: 1 },
  priceDesc: { price: -1 },
  stock: { stock: 1 },
  stockAsc: { stock: 1 },
  stockDesc: { stock: -1 },
  "stock-asc": { stock: 1 },
  "stock-desc": { stock: -1 },
  rating: { rating: -1 },
  ratingAsc: { rating: 1 },
  ratingDesc: { rating: -1 },
}

export const inventoryStatus = (product) => {
  if (product.active === false) return "Inactive"
  if (Number(product.stock || 0) <= 0) return "Out of Stock"
  if (Number(product.stock || 0) <= Number(product.lowStockThreshold ?? 10)) return "Low Stock"
  return "In Stock"
}

export function serializeProduct(value) {
  const product = typeof value?.toObject === "function" ? value.toObject() : value
  return {
    ...product,
    id: idOf(product),
    _id: idOf(product),
    active: product.active !== false,
    lowStockThreshold: Number(product.lowStockThreshold ?? 10),
    inventoryStatus: inventoryStatus(product),
  }
}

async function validateTaxonomy(categoryName, brandName) {
  await ensureTaxonomyRecords()
  const [category, brand] = await Promise.all([
    Category.findOne({ name: new RegExp(`^${escapeRegex(categoryName)}$`, "i"), active: { $ne: false } }).select("name").lean(),
    Brand.findOne({ name: new RegExp(`^${escapeRegex(brandName)}$`, "i"), active: { $ne: false } }).select("name").lean(),
  ])
  if (!category) throw new ApiError("Select an active category", 400, "CATEGORY_INVALID")
  if (!brand) throw new ApiError("Select an active brand", 400, "BRAND_INVALID")
  return { category: category.name, brand: brand.name }
}

function memoryTaxonomy(categoryName, brandName) {
  const category = memory.categories.find((entry) => entry.active && entry.name.toLowerCase() === categoryName.toLowerCase())
  const brand = memory.brands.find((entry) => entry.active && entry.name.toLowerCase() === brandName.toLowerCase())
  if (!category) throw new ApiError("Select an active category", 400, "CATEGORY_INVALID")
  if (!brand) throw new ApiError("Select an active brand", 400, "BRAND_INVALID")
  return { category: category.name, brand: brand.name }
}

async function validateProduct(body, existing = null, partial = false) {
  const required = (field) => partial && existing ? existing[field] : body[field]
  const title = text(body.title ?? existing?.title, { required: true, min: 3, max: 220, label: "Product title" })
  const description = text(body.description ?? existing?.description, { required: true, min: 10, max: 10000, label: "Description" })
  const sku = text(body.sku ?? existing?.sku, { required: true, min: 2, max: 80, label: "SKU" }).toUpperCase()
  if (!/^[A-Z0-9][A-Z0-9._-]+$/.test(sku)) throw new ApiError("SKU may contain only letters, numbers, dots, underscores, and hyphens")
  const price = number(body.price ?? existing?.price, { required: true, min: 0, max: 10_000_000, label: "Price" })
  const originalPrice = number(body.originalPrice ?? existing?.originalPrice ?? price, { required: true, min: 0, max: 10_000_000, label: "Original price" })
  if (originalPrice < price) throw new ApiError("Original price cannot be lower than the selling price")
  const stock = number(body.stock ?? existing?.stock ?? 0, { required: true, min: 0, max: 10_000_000, integer: true, label: "Stock" })
  const lowStockThreshold = number(body.lowStockThreshold ?? existing?.lowStockThreshold ?? 10, { min: 0, max: 100_000, integer: true, label: "Low-stock threshold" })
  const imagesValue = body.images ?? existing?.images
  if (!Array.isArray(imagesValue) || !imagesValue.length || imagesValue.length > 12) throw new ApiError("Provide between 1 and 12 product image URLs")
  const images = [...new Set(imagesValue.map((image) => httpUrl(image, { required: true, label: "Product image" })))]
  const categoryInput = text(body.category ?? existing?.category, { required: true, max: 100, label: "Category" })
  const brandInput = text(body.brand ?? existing?.brand, { required: true, max: 100, label: "Brand" })
  const taxonomy = databaseReady() ? await validateTaxonomy(categoryInput, brandInput) : memoryTaxonomy(categoryInput, brandInput)
  const slug = slugify(body.slug || (partial && existing?.title === title ? existing.slug : title))
  if (!slug) throw new ApiError("Product slug could not be generated")

  const payload = {
    title,
    description,
    sku,
    slug,
    price,
    originalPrice,
    discount: originalPrice > 0 ? Math.max(0, Math.min(100, Math.round((1 - price / originalPrice) * 100))) : 0,
    stock,
    lowStockThreshold,
    images,
    ...taxonomy,
    rating: number(body.rating ?? existing?.rating ?? 0, { min: 0, max: 5, label: "Rating" }),
    reviewCount: number(body.reviewCount ?? existing?.reviewCount ?? 0, { min: 0, max: 10_000_000, integer: true, label: "Review count" }),
    bestseller: boolean(body.bestseller, existing?.bestseller ?? false),
    featured: boolean(body.featured, existing?.featured ?? false),
    deal: boolean(body.deal, existing?.deal ?? false),
    active: boolean(body.active, existing?.active ?? true),
    badge: text(body.badge ?? existing?.badge ?? "", { max: 100, label: "Badge" }),
    prime: boolean(body.prime, existing?.prime ?? true),
    delivery: text(body.delivery ?? existing?.delivery ?? "FREE delivery", { max: 200, label: "Delivery message" }),
    features: stringList(body.features ?? existing?.features ?? [], { maxItems: 50, maxLength: 500, label: "Features" }) || [],
    specifications: safeSpecifications(body.specifications ?? existing?.specifications ?? {}) || {},
  }
  const dealEndsAtValue = body.dealEndsAt !== undefined ? body.dealEndsAt : existing?.dealEndsAt
  payload.dealEndsAt = dateValue(dealEndsAtValue, { label: "Deal end date" }) || null
  if (payload.deal && payload.dealEndsAt && payload.dealEndsAt <= new Date()) throw new ApiError("A product deal must end in the future")
  return payload
}

async function notifyLowStock(product) {
  if (inventoryStatus(product) !== "Low Stock") return
  await createAdminNotification({
    type: "admin-stock",
    title: "Low stock product",
    message: `${product.title} has ${product.stock} unit(s) left.`,
    link: "/admin/inventory",
    metadata: { productId: String(product._id), stock: product.stock, threshold: product.lowStockThreshold },
  }, { dedupeKey: `low-stock:${product._id}:${product.lowStockThreshold}`, dedupeHours: 12 })
}

export const listProducts = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query, { defaultLimit: 20 })
  const search = text(req.query.search || req.query.q, { max: 120, label: "Search" })
  const status = req.query.status || "all"
  const mappedStatus = status === "low-stock" ? "active" : status === "out-of-stock" ? "active" : status
  if (!["all", "active", "inactive"].includes(mappedStatus)) throw new ApiError("Invalid product status")
  const inventory = req.query.inventoryStatus || req.query.inventory || (status === "low-stock" ? "Low Stock" : status === "out-of-stock" ? "Out of Stock" : undefined)
  if (inventory && !["all", "In Stock", "Low Stock", "Out of Stock"].includes(inventory)) throw new ApiError("Invalid inventory status")

  if (databaseReady()) {
    const filter = { active: mappedStatus === "inactive" ? false : { $ne: false } }
    if (mappedStatus === "all") delete filter.active
    if (search) filter.$or = [{ title: new RegExp(escapeRegex(search), "i") }, { sku: new RegExp(escapeRegex(search), "i") }, { description: new RegExp(escapeRegex(search), "i") }]
    if (req.query.category) filter.category = new RegExp(`^${escapeRegex(text(req.query.category, { max: 100 }))}$`, "i")
    if (req.query.brand) filter.brand = new RegExp(`^${escapeRegex(text(req.query.brand, { max: 100 }))}$`, "i")
    if (req.query.featured === "true") filter.featured = true
    if (req.query.bestseller === "true") filter.bestseller = true
    if (req.query.deal === "true") filter.deal = true
    if (inventory === "Out of Stock") filter.stock = { $lte: 0 }
    if (inventory === "In Stock") filter.stock = { $gt: 0 }
    if (inventory === "Low Stock") filter.$expr = { $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", { $ifNull: ["$lowStockThreshold", 10] }] }] }
    const [rows, total] = await Promise.all([
      Product.find(filter).sort(productSorts[req.query.sort] || productSorts.newest).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
    ])
    return res.json({ success: true, ...withPagination(rows.map(serializeProduct), total, page, limit) })
  }

  const term = search.toLowerCase()
  let rows = memory.products.filter((product) => {
    if (mappedStatus === "active" && product.active === false) return false
    if (mappedStatus === "inactive" && product.active !== false) return false
    if (term && !`${product.title} ${product.sku} ${product.description}`.toLowerCase().includes(term)) return false
    if (req.query.category && product.category.toLowerCase() !== String(req.query.category).toLowerCase()) return false
    if (req.query.brand && product.brand.toLowerCase() !== String(req.query.brand).toLowerCase()) return false
    if (req.query.featured === "true" && !product.featured) return false
    if (req.query.bestseller === "true" && !product.bestseller) return false
    if (req.query.deal === "true" && !product.deal) return false
    if (inventory && inventory !== "all" && inventoryStatus(product) !== inventory) return false
    return true
  })
  const sort = req.query.sort
  rows.sort((a, b) => sort === "oldest" ? new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
    : ["title", "title-asc"].includes(sort) ? a.title.localeCompare(b.title)
      : sort === "title-desc" ? b.title.localeCompare(a.title)
        : ["price-asc", "priceAsc"].includes(sort) ? a.price - b.price
          : ["price-desc", "priceDesc"].includes(sort) ? b.price - a.price
            : ["stock", "stockAsc", "stock-asc"].includes(sort) ? a.stock - b.stock
              : ["stockDesc", "stock-desc"].includes(sort) ? b.stock - a.stock
                : sort === "ratingAsc" ? a.rating - b.rating
                  : sort === "rating" || sort === "ratingDesc" ? b.rating - a.rating
                    : new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  return res.json({ success: true, ...withPagination(rows.slice(skip, skip + limit).map(serializeProduct), rows.length, page, limit) })
})

export const getProduct = asyncHandler(async (req, res) => {
  const product = databaseReady() ? await Product.findById(req.params.id).lean() : memory.products.find((entry) => String(entry._id) === req.params.id)
  if (!product) throw new ApiError("Product not found", 404, "PRODUCT_NOT_FOUND")
  return res.json({ success: true, data: serializeProduct(product) })
})

export const createProduct = asyncHandler(async (req, res) => {
  const payload = await validateProduct(req.body)
  let product
  if (databaseReady()) {
    product = await Product.create(payload)
  } else {
    if (memory.products.some((entry) => entry.sku.toLowerCase() === payload.sku.toLowerCase() || entry.slug === payload.slug)) throw new ApiError("A product with that SKU or slug already exists", 409, "DUPLICATE")
    const now = new Date()
    product = { _id: id("product"), ...payload, createdAt: now, updatedAt: now }
    memory.products.push(product)
  }
  await notifyLowStock(product)
  // A new product can introduce a category or brand, so the cached sets are stale.
  invalidateTaxonomyCache()
  return res.status(201).json({ success: true, message: "Product created", data: serializeProduct(product) })
})

export const updateProduct = asyncHandler(async (req, res) => {
  if (!isMongoId(req.params.id) && !memory.products.some((entry) => String(entry._id) === req.params.id)) throw new ApiError("Product not found", 404, "PRODUCT_NOT_FOUND")
  const existing = databaseReady() ? await Product.findById(req.params.id).lean() : memory.products.find((entry) => String(entry._id) === req.params.id)
  if (!existing) throw new ApiError("Product not found", 404, "PRODUCT_NOT_FOUND")
  if (databaseReady()) {
    const managedDeal = await Deal.exists({ active: true, "products.product": existing._id })
    if (managedDeal && (req.body.price !== undefined || req.body.originalPrice !== undefined || (req.body.deal !== undefined && boolean(req.body.deal, Boolean(existing.deal)) !== Boolean(existing.deal)))) throw new ApiError("Change this product through its active deal", 409, "MANAGED_DEAL")
  }
  const payload = await validateProduct(req.body, existing, true)
  let product
  if (databaseReady()) {
    product = await Product.findByIdAndUpdate(req.params.id, { $set: payload }, { new: true, runValidators: true })
  } else {
    Object.assign(existing, payload, { updatedAt: new Date() })
    product = existing
  }
  await notifyLowStock(product)
  return res.json({ success: true, message: "Product updated", data: serializeProduct(product) })
})

export const changeProductStatus = asyncHandler(async (req, res) => {
  const status = String(req.body.status || "").toLowerCase()
  const active = status === "active" ? true : status === "inactive" ? false : undefined
  if (active === undefined) throw new ApiError("Product status must be active or inactive")
  let product
  if (databaseReady()) {
    product = await Product.findByIdAndUpdate(req.params.id, { $set: { active } }, { new: true, runValidators: true })
  } else {
    product = memory.products.find((entry) => String(entry._id) === req.params.id)
    if (product) Object.assign(product, { active, updatedAt: new Date() })
  }
  if (!product) throw new ApiError("Product not found", 404, "PRODUCT_NOT_FOUND")
  return res.json({ success: true, message: `Product ${status === "active" ? "activated" : "deactivated"}`, data: serializeProduct(product) })
})

async function removeProductReferences(ids) {
  if (!databaseReady()) return
  const deals = await Deal.find({ "products.product": { $in: ids } }).lean()
  await Promise.all(deals.map((deal) => restoreDealProducts(deal)))
  await Promise.all([
    Deal.updateMany({ "products.product": { $in: ids } }, { $pull: { products: { product: { $in: ids } } } }),
    Cart.updateMany({ "items.product": { $in: ids } }, { $pull: { items: { product: { $in: ids } } } }),
    Cart.updateMany({ "savedItems.product": { $in: ids } }, { $pull: { savedItems: { product: { $in: ids } } } }),
    Wishlist.updateMany({ "items.product": { $in: ids } }, { $pull: { items: { product: { $in: ids } } } }),
  ])
}

export const deleteProduct = asyncHandler(async (req, res) => {
  if (!isMongoId(req.params.id) && !memory.products.some((entry) => String(entry._id) === req.params.id)) throw new ApiError("Product not found", 404, "PRODUCT_NOT_FOUND")
  if (databaseReady()) {
    const product = await Product.findByIdAndDelete(req.params.id)
    if (!product) throw new ApiError("Product not found", 404, "PRODUCT_NOT_FOUND")
    await removeProductReferences([product._id])
  } else {
    const index = memory.products.findIndex((entry) => String(entry._id) === req.params.id)
    memory.products.splice(index, 1)
    memory.deals.forEach((deal) => { deal.products = deal.products.filter((entry) => String(entry.product) !== req.params.id) })
  }
  return res.json({ success: true, message: "Product deleted", data: { id: req.params.id } })
})

export const bulkProducts = asyncHandler(async (req, res) => {
  const action = String(req.body.action || "")
  if (!["activate", "deactivate", "delete", "set-stock", "stock"].includes(action)) throw new ApiError("Unsupported bulk product action")
  if (action === "delete" && req.body.confirm !== true) throw new ApiError("Bulk deletion requires confirmation", 400, "CONFIRMATION_REQUIRED")
  const dbIds = databaseReady() ? objectIdList(req.body.ids, { required: true, max: 100, label: "Product IDs" }) : [...new Set((Array.isArray(req.body.ids) ? req.body.ids : []).map(String))].slice(0, 100)
  if (!databaseReady() && (!Array.isArray(req.body.ids) || !dbIds.length)) throw new ApiError("Product IDs must be an array")
  const stock = action === "set-stock" || action === "stock" ? number(req.body.value, { required: true, min: 0, max: 10_000_000, integer: true, label: "Stock" }) : undefined

  if (databaseReady()) {
    if (action === "delete") {
      const rows = await Product.find({ _id: { $in: dbIds } }).select("_id")
      await removeProductReferences(rows.map((row) => row._id))
      await Product.deleteMany({ _id: { $in: dbIds } })
    } else {
      const update = action === "activate" ? { $set: { active: true } } : action === "deactivate" ? { $set: { active: false } } : { $set: { stock } }
      await Product.updateMany({ _id: { $in: dbIds } }, update, { runValidators: true })
    }
    return res.json({ success: true, message: `Bulk ${action} completed`, data: { action, requested: dbIds.length } })
  }
  const requested = new Set(dbIds)
  if (action === "delete") {
    const deals = memory.deals.filter((deal) => deal.products.some((entry) => requested.has(String(entry.product))))
    await Promise.all(deals.map((deal) => restoreDealProducts(deal)))
    const remaining = memory.products.filter((product) => !requested.has(String(product._id)))
    memory.products.splice(0, memory.products.length, ...remaining)
    memory.deals.forEach((deal) => { deal.products = deal.products.filter((entry) => !requested.has(String(entry.product))) })
  } else {
    memory.products.forEach((product) => {
      if (!requested.has(String(product._id))) return
      if (action === "activate") product.active = true
      if (action === "deactivate") product.active = false
      if (action === "set-stock" || action === "stock") product.stock = stock
      product.updatedAt = new Date()
    })
  }
  return res.json({ success: true, message: `Bulk ${action} completed`, data: { action, requested: dbIds.length } })
})
