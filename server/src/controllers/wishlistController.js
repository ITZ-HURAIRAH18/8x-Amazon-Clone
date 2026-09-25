import mongoose from "mongoose"
import { Wishlist } from "../models/Wishlist.js"
import { Product } from "../models/Product.js"
import { databaseReady } from "../config/db.js"
import { memory, id } from "../data/memory.js"
import demoProducts from "../data/products.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const demoProduct = (productId) => demoProducts.find((product) => String(product._id) === String(productId) || product.slug === productId)
const productJson = (product) => ({ ...product, id: String(product._id) })

function demoList(userId) {
  return memory.wishlists.get(String(userId)) || []
}

function serializeDemo(items) {
  return items.map((item) => {
    const product = demoProduct(item.productId)
    return product ? { id: item.id, product: productJson(product), addedAt: item.addedAt } : null
  }).filter(Boolean)
}

async function serializeDb(wishlist) {
  if (!wishlist) return []
  await wishlist.populate({ path: "items.product", select: "-__v" })
  return wishlist.items.filter((item) => item.product).map((item) => ({ id: String(item._id || item.product._id), product: { ...item.product.toJSON(), id: String(item.product._id) }, addedAt: item.addedAt }))
}

async function findProduct(productId) {
  if (databaseReady()) {
    if (!mongoose.isValidObjectId(productId)) return null
    return Product.findById(productId)
  }
  return demoProduct(productId) || null
}

export const getWishlist = asyncHandler(async (req, res) => {
  if (databaseReady()) {
    const wishlist = await Wishlist.findOne({ user: req.user._id })
    return res.json({ data: await serializeDb(wishlist) })
  }
  return res.json({ data: serializeDemo(demoList(req.user._id)) })
})

export const addWishlistItem = asyncHandler(async (req, res) => {
  const productId = String(req.body.productId || "")
  const product = await findProduct(productId)
  if (!product) return res.status(404).json({ message: "Product not found", code: "PRODUCT_NOT_FOUND" })
  if (databaseReady()) {
    const wishlist = (await Wishlist.findOne({ user: req.user._id })) || new Wishlist({ user: req.user._id, items: [] })
    if (!wishlist.items.some((item) => String(item.product) === String(product._id))) wishlist.items.push({ product: product._id, addedAt: new Date() })
    await wishlist.save()
    return res.status(201).json({ data: await serializeDb(wishlist) })
  }
  const items = demoList(req.user._id)
  if (!items.some((item) => String(item.productId) === String(product._id))) items.push({ id: id("wish"), productId: String(product._id), addedAt: new Date() })
  memory.wishlists.set(String(req.user._id), items)
  return res.status(201).json({ data: serializeDemo(items) })
})

export const removeWishlistItem = asyncHandler(async (req, res) => {
  const productId = String(req.params.productId)
  if (databaseReady()) {
    const wishlist = await Wishlist.findOne({ user: req.user._id })
    if (!wishlist) return res.json({ data: [] })
    wishlist.items = wishlist.items.filter((item) => String(item.product) !== productId)
    await wishlist.save()
    return res.json({ data: await serializeDb(wishlist) })
  }
  const items = demoList(req.user._id).filter((item) => String(item.productId) !== productId)
  memory.wishlists.set(String(req.user._id), items)
  return res.json({ data: serializeDemo(items) })
})

export const clearWishlist = asyncHandler(async (req, res) => {
  if (databaseReady()) {
    await Wishlist.findOneAndUpdate({ user: req.user._id }, { items: [] }, { upsert: true, new: true })
    return res.json({ data: [] })
  }
  memory.wishlists.set(String(req.user._id), [])
  return res.json({ data: [] })
})
