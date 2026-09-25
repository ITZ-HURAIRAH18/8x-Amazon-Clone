import mongoose from "mongoose"
import { Cart } from "../models/Cart.js"
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

function serializeDemoCart(cart) {
  return {
    id: cart.id,
    items: cart.items
      .map((item) => {
        const product = findDemoProduct(item.productId)
        return product ? { id: item.id, quantity: item.quantity, product: demoProductJson(product) } : null
      })
      .filter(Boolean),
    updatedAt: cart.updatedAt,
  }
}

async function serializeDbCart(cart) {
  if (!cart) return { id: null, items: [] }
  await cart.populate({ path: "items.product", select: "-__v" })
  return {
    id: String(cart._id),
    items: cart.items
      .filter((item) => item.product)
      .map((item) => ({ id: String(item._id), quantity: item.quantity, product: { ...item.product.toJSON(), id: String(item.product._id) } })),
    updatedAt: cart.updatedAt,
  }
}

async function readCart(userId) {
  if (databaseReady()) return Cart.findOne({ user: userId })
  return memory.carts.get(String(userId)) || { id: id("cart"), user: String(userId), items: [], updatedAt: new Date() }
}

async function writeCart(userId, cart) {
  if (databaseReady()) return Cart.findOneAndUpdate({ user: userId }, cart, { upsert: true, new: true, setDefaultsOnInsert: true })
  cart.updatedAt = new Date()
  memory.carts.set(String(userId), cart)
  return cart
}

export const getCart = asyncHandler(async (req, res) => {
  const cart = await readCart(req.user._id)
  return res.json({ data: databaseReady() ? await serializeDbCart(cart) : serializeDemoCart(cart) })
})

export const addToCart = asyncHandler(async (req, res) => {
  const productId = String(req.body.productId || "")
  const quantity = Math.max(1, Math.min(99, Number(req.body.quantity) || 1))
  const product = await findProduct(productId)
  if (!product) return res.status(404).json({ message: "Product not found", code: "PRODUCT_NOT_FOUND" })
  if (product.stock < quantity) return res.status(400).json({ message: "Requested quantity is not available", code: "OUT_OF_STOCK" })

  if (databaseReady()) {
    const cart = (await Cart.findOne({ user: req.user._id })) || new Cart({ user: req.user._id, items: [] })
    const existing = cart.items.find((item) => String(item.product) === productId)
    if (existing) {
      existing.quantity = Math.min(product.stock, existing.quantity + quantity)
    } else {
      cart.items.push({ product: product._id, quantity })
    }
    const saved = await cart.save()
    return res.status(201).json({ data: await serializeDbCart(saved) })
  }

  const cart = await readCart(req.user._id)
  const existing = cart.items.find((item) => String(item.productId) === productId)
  if (existing) existing.quantity = Math.min(product.stock, existing.quantity + quantity)
  else cart.items.push({ id: id("item"), productId, quantity })
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
    const cart = await Cart.findOneAndUpdate(
      { user: req.user._id },
      { $pull: { items: { _id: req.params.itemId } } },
      { new: true },
    )
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

export const mergeCart = asyncHandler(async (req, res) => {
  const incoming = Array.isArray(req.body.items) ? req.body.items : []
  for (const incomingItem of incoming) {
    const product = await findProduct(incomingItem.productId || incomingItem.id)
    const quantity = Math.max(1, Math.min(99, Number(incomingItem.quantity) || 1))
    if (!product || product.stock < quantity) continue
    if (databaseReady()) {
      const cart = (await Cart.findOne({ user: req.user._id })) || new Cart({ user: req.user._id, items: [] })
      const existing = cart.items.find((item) => String(item.product) === String(product._id))
      if (existing) existing.quantity = Math.min(product.stock, existing.quantity + quantity)
      else cart.items.push({ product: product._id, quantity })
      await cart.save()
    } else {
      const cart = await readCart(req.user._id)
      const existing = cart.items.find((item) => String(item.productId) === String(product._id))
      if (existing) existing.quantity = Math.min(product.stock, existing.quantity + quantity)
      else cart.items.push({ id: id("item"), productId: String(product._id), quantity })
      await writeCart(req.user._id, cart)
    }
  }
  return getCart(req, res)
})
