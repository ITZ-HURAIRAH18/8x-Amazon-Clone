import mongoose from "mongoose"
import { Product } from "../models/Product.js"
import { databaseReady } from "../config/db.js"
import demoProducts from "../data/products.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const objectId = (value) => (mongoose.isValidObjectId(value) ? value : null)
const numberOrUndefined = (value) => {
  if (value === undefined || value === null || value === "") return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1_000_000_000 ? parsed : undefined
}

function fallbackProduct(product) {
  return { ...product, id: String(product._id), images: product.images || [product.image].filter(Boolean), createdAt: product.createdAt || new Date().toISOString(), updatedAt: product.updatedAt || new Date().toISOString() }
}

function splitValues(value) {
  return String(value || "").split(",").map((entry) => entry.trim()).filter(Boolean)
}

function filterDemo(query) {
  const { search, category, minPrice, maxPrice, rating, brand, availability, featured, bestseller, deal, deals, prime } = query
  let result = [...demoProducts]
  if (search) {
    const term = new RegExp(escapeRegex(search), "i")
    result = result.filter((product) => term.test(`${product.title} ${product.description} ${product.category} ${product.brand} ${(product.features || []).join(" ")}`))
  }
  if (category) result = result.filter((product) => product.category.toLowerCase() === String(category).toLowerCase())
  if (brand) {
    const brands = splitValues(brand).map((entry) => entry.toLowerCase())
    result = result.filter((product) => brands.includes(product.brand.toLowerCase()))
  }
  const min = numberOrUndefined(minPrice)
  const max = numberOrUndefined(maxPrice)
  if (min !== undefined) result = result.filter((product) => product.price >= min)
  if (max !== undefined) result = result.filter((product) => product.price <= max)
  const minimumRating = numberOrUndefined(rating)
  if (minimumRating !== undefined) result = result.filter((product) => product.rating >= minimumRating)
  if (availability === "in-stock") result = result.filter((product) => product.stock > 0)
  if (availability === "out-of-stock") result = result.filter((product) => product.stock < 1)
  if (featured === "true") result = result.filter((product) => product.featured)
  if (bestseller === "true") result = result.filter((product) => product.bestseller)
  if (deal === "true" || deals === "true") result = result.filter((product) => product.deal)
  const minimumDiscount = numberOrUndefined(query.minDiscount ?? query.discount)
  if (minimumDiscount !== undefined) result = result.filter((product) => Number(product.discount || 0) >= minimumDiscount)
  if (prime === "true") result = result.filter((product) => product.prime)
  return result
}

function sortDemo(result, sort) {
  const sorted = [...result]
  const by = {
    newest: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    priceAsc: (a, b) => a.price - b.price,
    "price-low": (a, b) => a.price - b.price,
    priceDesc: (a, b) => b.price - a.price,
    "price-high": (a, b) => b.price - a.price,
    rating: (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
    reviews: (a, b) => b.reviewCount - a.reviewCount,
    featured: (a, b) => Number(b.featured) - Number(a.featured) || b.rating - a.rating,
    "best-sellers": (a, b) => Number(b.bestseller) - Number(a.bestseller) || b.reviewCount - a.reviewCount,
    "biggest-discount": (a, b) => Number(b.discount || 0) - Number(a.discount || 0) || b.rating - a.rating,
  }
  return sorted.sort(by[sort] || by.featured)
}

function buildDbFilter(query) {
  const filter = {}
  if (query.search) {
    const term = new RegExp(escapeRegex(query.search), "i")
    filter.$or = [{ title: term }, { description: term }, { category: term }, { brand: term }, { features: term }]
  }
  if (query.category) filter.category = new RegExp(`^${escapeRegex(query.category)}$`, "i")
  if (query.brand) {
    const brands = splitValues(query.brand).map((brand) => new RegExp(`^${escapeRegex(brand)}$`, "i"))
    filter.$and ||= []
    filter.$and.push({ $or: brands.map((brand) => ({ brand })) })
  }
  const min = numberOrUndefined(query.minPrice)
  const max = numberOrUndefined(query.maxPrice)
  if (min !== undefined || max !== undefined) {
    filter.price = {}
    if (min !== undefined) filter.price.$gte = min
    if (max !== undefined) filter.price.$lte = max
  }
  const minimumRating = numberOrUndefined(query.rating)
  if (minimumRating !== undefined) filter.rating = { $gte: minimumRating }
  if (query.availability === "in-stock") filter.stock = { $gt: 0 }
  if (query.availability === "out-of-stock") filter.stock = { $lte: 0 }
  if (query.featured === "true") filter.featured = true
  if (query.bestseller === "true") filter.bestseller = true
  if (query.deal === "true" || query.deals === "true") filter.deal = true
  const minimumDiscount = numberOrUndefined(query.minDiscount ?? query.discount)
  if (minimumDiscount !== undefined) filter.discount = { $gte: minimumDiscount }
  if (query.prime === "true") filter.prime = true
  return filter
}

function dbSort(sort) {
  return {
    newest: { createdAt: -1 },
    priceAsc: { price: 1 },
    "price-low": { price: 1 },
    priceDesc: { price: -1 },
    "price-high": { price: -1 },
    rating: { rating: -1, reviewCount: -1 },
    reviews: { reviewCount: -1 },
    featured: { featured: -1, rating: -1, reviewCount: -1 },
    "best-sellers": { bestseller: -1, reviewCount: -1 },
    "biggest-discount": { discount: -1, rating: -1 },
  }[sort] || { featured: -1, rating: -1, reviewCount: -1 }
}

export const listProducts = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(48, Math.max(1, Number(req.query.limit) || 24))
  const query = { ...req.query, search: req.query.search || req.query.q || "" }
  let products
  let total
  if (databaseReady()) {
    const filter = buildDbFilter(query)
    const [rows, count] = await Promise.all([
      Product.find(filter).sort(dbSort(query.sort)).skip((page - 1) * limit).limit(limit).lean(),
      Product.countDocuments(filter),
    ])
    products = rows.map((row) => ({ ...row, id: String(row._id) }))
    total = count
  } else {
    const filtered = sortDemo(filterDemo(query), query.sort)
    total = filtered.length
    products = filtered.slice((page - 1) * limit, page * limit).map(fallbackProduct)
  }
  return res.json({ data: products, meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } })
})

export const getProductFacets = asyncHandler(async (_req, res) => {
  if (databaseReady()) {
    const [categories, brands, range] = await Promise.all([
      Product.distinct("category"),
      Product.distinct("brand"),
      Product.aggregate([{ $group: { _id: null, minPrice: { $min: "$price" }, maxPrice: { $max: "$price" } } }]),
    ])
    const bounds = range[0] || {}
    return res.json({ data: { categories: categories.sort(), brands: brands.sort(), minPrice: Number(bounds.minPrice || 0), maxPrice: Number(bounds.maxPrice || 0) } })
  }
  const prices = demoProducts.map((item) => item.price)
  return res.json({ data: { categories: [...new Set(demoProducts.map((item) => item.category))].sort(), brands: [...new Set(demoProducts.map((item) => item.brand))].sort(), minPrice: Math.min(...prices), maxPrice: Math.max(...prices) } })
})

async function resolveProduct(id) {
  if (databaseReady()) {
    const query = objectId(id) ? { $or: [{ _id: id }, { slug: id }] } : { slug: id }
    return Product.findOne(query).lean()
  }
  return demoProducts.find((item) => String(item._id) === id || item.slug === id) || null
}

export const getProduct = asyncHandler(async (req, res) => {
  const product = await resolveProduct(req.params.id)
  if (!product) return res.status(404).json({ message: "Product not found", code: "PRODUCT_NOT_FOUND" })
  return res.json({ data: fallbackProduct(product) })
})

export const getRecommendations = asyncHandler(async (req, res) => {
  const product = await resolveProduct(req.params.id)
  if (!product) return res.status(404).json({ message: "Product not found", code: "PRODUCT_NOT_FOUND" })
  if (databaseReady()) {
    const rows = await Product.find({ _id: { $ne: product._id }, $or: [{ category: product.category }, { brand: product.brand }] }).sort({ bestseller: -1, rating: -1 }).limit(8).lean()
    return res.json({ data: rows.map((row) => ({ ...row, id: String(row._id) })) })
  }
  const rows = demoProducts.filter((item) => item._id !== product._id && (item.category === product.category || item.brand === product.brand)).sort((a, b) => Number(b.bestseller) - Number(a.bestseller) || b.rating - a.rating).slice(0, 8)
  return res.json({ data: rows.map(fallbackProduct) })
})

export const createProduct = asyncHandler(async (req, res) => {
  if (!databaseReady()) return res.status(503).json({ message: "Product creation requires MongoDB", code: "DATABASE_REQUIRED" })
  const product = await Product.create(req.body)
  return res.status(201).json({ data: { ...product.toJSON(), id: String(product._id) } })
})
