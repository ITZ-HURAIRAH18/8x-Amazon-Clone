import mongoose from "mongoose"
import { Product } from "../models/Product.js"
import { databaseReady } from "../config/db.js"
import demoProducts from "../data/products.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const objectId = (value) => (mongoose.isValidObjectId(value) ? value : null)

function fallbackProduct(product) {
  return {
    ...product,
    id: String(product._id),
    createdAt: product.createdAt || new Date().toISOString(),
    updatedAt: product.updatedAt || new Date().toISOString(),
  }
}

function filterDemo(query) {
  const { search, category, minPrice, maxPrice, rating, brand, availability, featured, bestseller, deal } = query
  let result = [...demoProducts]
  if (search) {
    const term = new RegExp(escapeRegex(search), "i")
    result = result.filter((product) => term.test(`${product.title} ${product.category} ${product.brand}`))
  }
  if (category) result = result.filter((product) => product.category.toLowerCase() === category.toLowerCase())
  if (brand) result = result.filter((product) => product.brand.toLowerCase() === brand.toLowerCase())
  if (minPrice !== undefined) result = result.filter((product) => product.price >= Number(minPrice))
  if (maxPrice !== undefined) result = result.filter((product) => product.price <= Number(maxPrice))
  if (rating !== undefined) result = result.filter((product) => product.rating >= Number(rating))
  if (availability === "in-stock") result = result.filter((product) => product.stock > 0)
  if (featured === "true") result = result.filter((product) => product.featured)
  if (bestseller === "true") result = result.filter((product) => product.bestseller)
  if (deal === "true") result = result.filter((product) => product.deal)
  return result
}

function sortDemo(result, sort) {
  const sorted = [...result]
  const by = {
    newest: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    priceAsc: (a, b) => a.price - b.price,
    priceDesc: (a, b) => b.price - a.price,
    rating: (a, b) => b.rating - a.rating,
    reviews: (a, b) => b.reviewCount - a.reviewCount,
  }
  return sorted.sort(by[sort] || by.newest)
}

export const listProducts = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(60, Math.max(1, Number(req.query.limit) || 24))
  const query = req.query
  let products
  let total

  if (databaseReady()) {
    const filter = {}
    if (query.search) {
      const term = new RegExp(escapeRegex(query.search), "i")
      filter.$or = [{ title: term }, { category: term }, { brand: term }]
    }
    if (query.category) filter.category = new RegExp(`^${escapeRegex(query.category)}$`, "i")
    if (query.brand) filter.brand = new RegExp(`^${escapeRegex(query.brand)}$`, "i")
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      filter.price = {}
      if (query.minPrice !== undefined) filter.price.$gte = Number(query.minPrice)
      if (query.maxPrice !== undefined) filter.price.$lte = Number(query.maxPrice)
    }
    if (query.rating !== undefined) filter.rating = { $gte: Number(query.rating) }
    if (query.availability === "in-stock") filter.stock = { $gt: 0 }
    if (query.featured === "true") filter.featured = true
    if (query.bestseller === "true") filter.bestseller = true
    if (query.deal === "true") filter.deal = true
    const sortMap = {
      newest: { createdAt: -1 },
      priceAsc: { price: 1 },
      priceDesc: { price: -1 },
      rating: { rating: -1, reviewCount: -1 },
      reviews: { reviewCount: -1 },
    }
    const [rows, count] = await Promise.all([
      Product.find(filter)
        .sort(sortMap[query.sort] || sortMap.newest)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ])
    products = rows.map((row) => ({ ...row, id: String(row._id) }))
    total = count
  } else {
    const filtered = sortDemo(filterDemo(query), query.sort)
    total = filtered.length
    products = filtered.slice((page - 1) * limit, page * limit).map(fallbackProduct)
  }

  res.json({ data: products, meta: { page, limit, total, pages: Math.ceil(total / limit) } })
})

export const getProduct = asyncHandler(async (req, res) => {
  const { id } = req.params
  if (databaseReady()) {
    const query = objectId(id) ? { $or: [{ _id: id }, { slug: id }] } : { slug: id }
    const product = await Product.findOne(query).lean()
    if (!product) return res.status(404).json({ message: "Product not found", code: "PRODUCT_NOT_FOUND" })
    return res.json({ data: { ...product, id: String(product._id) } })
  }
  const product = demoProducts.find((item) => String(item._id) === id || item.slug === id)
  if (!product) return res.status(404).json({ message: "Product not found", code: "PRODUCT_NOT_FOUND" })
  return res.json({ data: fallbackProduct(product) })
})

export const createProduct = asyncHandler(async (req, res) => {
  if (!databaseReady()) return res.status(503).json({ message: "Product creation requires MongoDB", code: "DATABASE_REQUIRED" })
  const product = await Product.create(req.body)
  return res.status(201).json({ data: { ...product.toJSON(), id: String(product._id) } })
})
