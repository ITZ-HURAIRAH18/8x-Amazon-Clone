import mongoose from "mongoose"
import { Cart } from "../models/Cart.js"
import { Wishlist } from "../models/Wishlist.js"
import { Product } from "../models/Product.js"
import { databaseReady } from "../config/db.js"
import { memory, id } from "../data/memory.js"
import demoProducts from "../data/products.js"
import { asyncHandler } from "../utils/asyncHandler.js"

function findDemoProduct(productId) {
  return demoProducts.find((product) => String(product._id) === String(productId) || product.slug === productId)
}

function demoProductJson(product) {
  return { ...product, id: String(product._id) }
}

async function findProduct(productId) {
  if (databaseReady()) {
    if (!mongoose.isValidObjectId(productId)) return null
    return Product.findById(productId)
  }
  return findDemoProduct(productId) || null
}

function serializeDemoItems(items = []) {
  return items.map((item) => {
    const product = findDemoProduct(item.productId)
    return product ? { id: item.id, quantity: item.quantity, product: demoProductJson(product) } : null
  }).filter(Boolean)
}

function serializeDemoCart(cart) {
  const items = serializeDemoItems(cart.items)
  const savedItems = serializeDemoItems(cart.savedItems)
  const unavailableItems = [...cart.items, ...cart.savedItems].filter((item) => !findDemoProduct(item.productId) || findDemoProduct(item.productId).stock < 1)
  return { id: cart.id, items, savedItems, unavailableItems, updatedAt: cart.updatedAt }
}

async function serializeDbCart(cart) {
  if (!cart) return { id: null, items: [], savedItems: [], unavailableItems: [] }
  await cart.populate({ path: "items.product savedItems.product", select: "-__v" })
  const serialize = (item) => item.product ? { id: String(item._id), quantity: item.quantity, product: { ...item.product.toJSON(), id: String(item.product._id) } } : null
  const items = cart.items.map(serialize).filter(Boolean)
  const savedItems = cart.savedItems.map(serialize).filter(Boolean)
  const unavailableItems = [...cart.items, ...cart.savedItems].filter((item) => !item.product || item.product.stock < 1).map((item) => ({ id: String(item._id), productId: item.product ? String(item.product._id) : String(item.product), quantity: item.quantity }))
  return { id: String(cart._id), items, savedItems, unavailableItems, updatedAt: cart.updatedAt }
}

async function readCart(userId) {
  if (databaseReady()) return Cart.findOne({ user: userId })
  return memory.carts.get(String(userId)) || { id: id("cart"), user: String(userId), items: [], savedItems: [], updatedAt: new Date() }
}

async function writeCart(userId, cart) {
  if (databaseReady()) {
    const payload = {
      items: (cart.items || []).map((item) => ({ product: item.product?._id || item.product, quantity: item.quantity })),
      savedItems: (cart.savedItems || []).map((item) => ({ product: item.product?._id || item.product, quantity: item.quantity })),
    }
    return Cart.findOneAndUpdate({ user: userId }, payload, { upsert: true, new: true, setDefaultsOnInsert: true })
  }
  cart.updatedAt = new Date()
  memory.carts.set(String(userId), cart)
  return cart
}

function activePayload(cart) {
  return databaseReady() ? serializeDbCart(cart) : serializeDemoCart(cart)
}

export const getCart = asyncHandler(async (req, res) => res.json({ data: await activePayload(await readCart(req.user._id)) }))

export const clearCart = asyncHandler(async (req, res) => {
  if (databaseReady()) await Cart.deleteOne({ user: req.user._id })
  else memory.carts.delete(String(req.user._id))
  return res.json({ data: { id: null, items: [], savedItems: [], unavailableItems: [] } })
})

export const addToCart = asyncHandler(async (req, res) => {
  const productId = String(req.body.productId || "")
  const quantity = Math.max(1, Math.min(99, Number(req.body.quantity) || 1))
  const product = await findProduct(productId)
  if (!product) return res.status(404).json({ message: "Product not found", code: "PRODUCT_NOT_FOUND" })
  if (product.stock < quantity) return res.status(400).json({ message: "Requested quantity is not available", code: "OUT_OF_STOCK" })

  if (databaseReady()) {
    const cart = (await Cart.findOne({ user: req.user._id })) || new Cart({ user: req.user._id, items: [], savedItems: [] })
    const existing = cart.items.find((item) => String(item.product) === String(product._id))
    if (existing) existing.quantity = Math.min(product.stock, existing.quantity + quantity)
    else cart.items.push({ product: product._id, quantity })
    const saved = await cart.save()
    return res.status(201).json({ data: await serializeDbCart(saved) })
  }

  const cart = await readCart(req.user._id)
  cart.savedItems ||= []
  const existing = cart.items.find((item) => String(item.productId) === String(product._id))
  if (existing) existing.quantity = Math.min(product.stock, existing.quantity + quantity)
  else cart.items.push({ id: id("item"), productId: String(product._id), quantity })
  await writeCart(req.user._id, cart)
  return res.status(201).json({ data: serializeDemoCart(cart) })
})

export const updateCartItem = asyncHandler(async (req, res) => {
  const quantity = Number(req.body.quantity)
  if (!Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ message: "Quantity must be at least 1", code: "VALIDATION_ERROR" })
  if (databaseReady()) {
    const cart = await Cart.findOne({ user: req.user._id, "items._id": req.params.itemId })
    if (!cart) return res.status(404).json({ message: "Cart item not found", code: "CART_ITEM_NOT_FOUND" })
    const item = cart.items.id(req.params.itemId)
    const product = await Product.findById(item.product)
    if (!product || product.stock < quantity) return res.status(400).json({ message: "Requested quantity is not available", code: "OUT_OF_STOCK" })
    item.quantity = quantity
    return res.json({ data: await serializeDbCart(await cart.save()) })
  }
  const cart = await readCart(req.user._id)
  const item = cart.items.find((entry) => entry.id === req.params.itemId)
  if (!item) return res.status(404).json({ message: "Cart item not found", code: "CART_ITEM_NOT_FOUND" })
  const product = findDemoProduct(item.productId)
  if (!product || product.stock < quantity) return res.status(400).json({ message: "Requested quantity is not available", code: "OUT_OF_STOCK" })
  item.quantity = quantity
  await writeCart(req.user._id, cart)
  return res.json({ data: serializeDemoCart(cart) })
})

export const removeCartItem = asyncHandler(async (req, res) => {
  if (databaseReady()) {
    const cart = await Cart.findOneAndUpdate({ user: req.user._id }, { $pull: { items: { _id: req.params.itemId } } }, { new: true })
    if (!cart) return res.status(404).json({ message: "Cart item not found", code: "CART_ITEM_NOT_FOUND" })
    return res.json({ data: await serializeDbCart(cart) })
  }
  const cart = await readCart(req.user._id)
  const before = cart.items.length
  cart.items = cart.items.filter((item) => item.id !== req.params.itemId)
  if (cart.items.length === before) return res.status(404).json({ message: "Cart item not found", code: "CART_ITEM_NOT_FOUND" })
  await writeCart(req.user._id, cart)
  return res.json({ data: serializeDemoCart(cart) })
})

export const moveCartItemToWishlist = asyncHandler(async (req, res) => {
  if (databaseReady()) {
    const cart = await Cart.findOne({ user: req.user._id, "items._id": req.params.itemId })
    if (!cart) return res.status(404).json({ message: "Cart item not found", code: "CART_ITEM_NOT_FOUND" })
    const item = cart.items.id(req.params.itemId)
    const wishlist = (await Wishlist.findOne({ user: req.user._id })) || new Wishlist({ user: req.user._id, items: [] })
    if (!wishlist.items.some((entry) => String(entry.product) === String(item.product))) wishlist.items.push({ product: item.product, addedAt: new Date() })
    item.deleteOne()
    await Promise.all([cart.save(), wishlist.save()])
    return res.json({ data: { moved: true, productId: String(item.product) } })
  }
  const cart = await readCart(req.user._id)
  const item = cart.items.find((entry) => entry.id === req.params.itemId)
  if (!item) return res.status(404).json({ message: "Cart item not found", code: "CART_ITEM_NOT_FOUND" })
  const items = memory.wishlists.get(String(req.user._id)) || []
  if (!items.some((entry) => String(entry.productId) === String(item.productId))) items.push({ id: id("wish"), productId: item.productId, addedAt: new Date() })
  memory.wishlists.set(String(req.user._id), items)
  cart.items = cart.items.filter((entry) => entry.id !== req.params.itemId)
  await writeCart(req.user._id, cart)
  return res.json({ data: { moved: true, productId: item.productId } })
})

export const saveCartItemForLater = asyncHandler(async (req, res) => {
  if (databaseReady()) {
    const cart = await Cart.findOne({ user: req.user._id, "items._id": req.params.itemId })
    if (!cart) return res.status(404).json({ message: "Cart item not found", code: "CART_ITEM_NOT_FOUND" })
    const item = cart.items.id(req.params.itemId)
    if (!cart.savedItems.some((entry) => String(entry.product) === String(item.product))) cart.savedItems.push({ product: item.product, quantity: item.quantity })
    item.deleteOne()
    return res.json({ data: await serializeDbCart(await cart.save()) })
  }
  const cart = await readCart(req.user._id)
  const item = cart.items.find((entry) => entry.id === req.params.itemId)
  if (!item) return res.status(404).json({ message: "Cart item not found", code: "CART_ITEM_NOT_FOUND" })
  cart.savedItems ||= []
  if (!cart.savedItems.some((entry) => entry.productId === item.productId)) cart.savedItems.push({ ...item, id: id("saved") })
  cart.items = cart.items.filter((entry) => entry.id !== req.params.itemId)
  await writeCart(req.user._id, cart)
  return res.json({ data: serializeDemoCart(cart) })
})

export const moveSavedItemToCart = asyncHandler(async (req, res) => {
  if (databaseReady()) {
    const cart = await Cart.findOne({ user: req.user._id, "savedItems._id": req.params.itemId })
    if (!cart) return res.status(404).json({ message: "Saved item not found", code: "SAVED_ITEM_NOT_FOUND" })
    const saved = cart.savedItems.id(req.params.itemId)
    const product = await Product.findById(saved.product)
    if (!product || product.stock < 1) return res.status(409).json({ message: "This item is currently unavailable", code: "OUT_OF_STOCK" })
    const active = cart.items.find((item) => String(item.product) === String(saved.product))
    if (active) active.quantity = Math.min(product.stock, active.quantity + saved.quantity)
    else cart.items.push({ product: saved.product, quantity: saved.quantity })
    saved.deleteOne()
    return res.json({ data: await serializeDbCart(await cart.save()) })
  }
  const cart = await readCart(req.user._id)
  const saved = cart.savedItems?.find((entry) => entry.id === req.params.itemId)
  if (!saved) return res.status(404).json({ message: "Saved item not found", code: "SAVED_ITEM_NOT_FOUND" })
  const product = findDemoProduct(saved.productId)
  if (!product || product.stock < 1) return res.status(409).json({ message: "This item is currently unavailable", code: "OUT_OF_STOCK" })
  const active = cart.items.find((entry) => entry.productId === saved.productId)
  if (active) active.quantity = Math.min(product.stock, active.quantity + saved.quantity)
  else cart.items.push({ id: id("item"), productId: saved.productId, quantity: saved.quantity })
  cart.savedItems = cart.savedItems.filter((entry) => entry.id !== req.params.itemId)
  await writeCart(req.user._id, cart)
  return res.json({ data: serializeDemoCart(cart) })
})

export const removeSavedItem = asyncHandler(async (req, res) => {
  if (databaseReady()) {
    const cart = await Cart.findOneAndUpdate({ user: req.user._id }, { $pull: { savedItems: { _id: req.params.itemId } } }, { new: true })
    if (!cart) return res.status(404).json({ message: "Saved item not found", code: "SAVED_ITEM_NOT_FOUND" })
    return res.json({ data: await serializeDbCart(cart) })
  }
  const cart = await readCart(req.user._id)
  cart.savedItems = (cart.savedItems || []).filter((item) => item.id !== req.params.itemId)
  await writeCart(req.user._id, cart)
  return res.json({ data: serializeDemoCart(cart) })
})

export const mergeCart = asyncHandler(async (req, res) => {
  const incoming = Array.isArray(req.body.items) ? req.body.items : []
  for (const incomingItem of incoming) {
    const product = await findProduct(incomingItem.productId || incomingItem.id)
    const quantity = Math.max(1, Math.min(99, Number(incomingItem.quantity) || 1))
    if (!product || product.stock < quantity) continue
    if (databaseReady()) {
      const cart = (await Cart.findOne({ user: req.user._id })) || new Cart({ user: req.user._id, items: [], savedItems: [] })
      const existing = cart.items.find((item) => String(item.product) === String(product._id))
      if (existing) existing.quantity = Math.min(product.stock, existing.quantity + quantity)
      else cart.items.push({ product: product._id, quantity })
      await cart.save()
    } else {
      const cart = await readCart(req.user._id)
      cart.savedItems ||= []
      const existing = cart.items.find((item) => item.productId === String(product._id))
      if (existing) existing.quantity = Math.min(product.stock, existing.quantity + quantity)
      else cart.items.push({ id: id("item"), productId: String(product._id), quantity })
      await writeCart(req.user._id, cart)
    }
  }
  return getCart(req, res)
})
