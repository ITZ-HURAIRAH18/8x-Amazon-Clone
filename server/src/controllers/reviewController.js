import mongoose from "mongoose"
import { Review } from "../models/Review.js"
import { Order } from "../models/Order.js"
import { Product } from "../models/Product.js"
import { databaseReady } from "../config/db.js"
import { memory, id } from "../data/memory.js"
import demoProducts from "../data/products.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const demoProduct = (productId) => demoProducts.find((product) => String(product._id) === String(productId) || product.slug === productId)

async function resolveProduct(productId) {
  if (databaseReady()) {
    if (!mongoose.isValidObjectId(productId)) return null
    return Product.findById(productId)
  }
  return demoProduct(productId) || null
}

function validateReview(body) {
  const rating = Number(body.rating)
  const title = String(body.title || "").trim()
  const comment = String(body.comment || "").trim()
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !title || !comment) {
    const error = new Error("A 1–5 star rating, title, and review are required")
    error.statusCode = 400
    error.code = "VALIDATION_ERROR"
    throw error
  }
  return { rating, title, comment }
}

function summary(reviews) {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  reviews.forEach((review) => { distribution[review.rating] = (distribution[review.rating] || 0) + 1 })
  const total = reviews.length
  const average = total ? Math.round((reviews.reduce((sum, review) => sum + Number(review.rating), 0) / total) * 10) / 10 : 0
  return { average, total, distribution }
}

function sortReviews(reviews, sort) {
  return [...reviews].sort((a, b) => {
    if (sort === "highest") return b.rating - a.rating || new Date(b.createdAt) - new Date(a.createdAt)
    if (sort === "lowest") return a.rating - b.rating || new Date(b.createdAt) - new Date(a.createdAt)
    if (sort === "helpful") return Number(b.helpfulCount || 0) - Number(a.helpfulCount || 0) || new Date(b.createdAt) - new Date(a.createdAt)
    return new Date(b.createdAt) - new Date(a.createdAt)
  })
}

function reviewJson(review) {
  return {
    id: String(review._id || review.id),
    rating: review.rating,
    title: review.title,
    comment: review.comment,
    verifiedPurchase: Boolean(review.verifiedPurchase),
    helpfulCount: review.helpfulCount || 0,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    user: review.user?.name || review.userName ? { id: String(review.user?._id || review.user || ""), name: review.user?.name || review.userName } : { name: "Amazon customer" },
  }
}

async function updateProductRating(productId) {
  if (!databaseReady()) return
  const reviews = await Review.find({ product: productId }).select("rating").lean()
  if (!reviews.length) {
    await Product.updateOne({ _id: productId }, { $set: { rating: 0, reviewCount: 0 } })
    return
  }
  const average = Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) / 10
  await Product.updateOne({ _id: productId }, { $set: { rating: average, reviewCount: reviews.length } })
}

export const listMyReviews = asyncHandler(async (req, res) => {
  if (databaseReady()) {
    const rows = await Review.find({ user: req.user._id }).populate("product", "title images id").sort({ createdAt: -1 }).lean()
    return res.json({ data: rows.map((review) => ({ ...reviewJson(review), product: review.product ? { ...review.product, id: String(review.product._id) } : null })) })
  }
  const rows = memory.reviews.filter((review) => String(review.user) === String(req.user._id)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  return res.json({ data: rows.map((review) => reviewJson(review)) })
})

export const listReviews = asyncHandler(async (req, res) => {
  const product = await resolveProduct(req.params.id || req.params.productId)
  if (!product) return res.status(404).json({ message: "Product not found", code: "PRODUCT_NOT_FOUND" })
  let reviews
  if (databaseReady()) {
    reviews = await Review.find({ product: product._id }).populate("user", "name").sort({ createdAt: -1 }).lean()
  } else {
    reviews = memory.reviews.filter((review) => String(review.product) === String(product._id)).map((review) => ({ ...review, user: { name: review.userName } }))
  }
  const ordered = sortReviews(reviews, req.query.sort)
  return res.json({ data: { reviews: ordered.map(reviewJson), summary: summary(reviews) } })
})

export const createReview = asyncHandler(async (req, res) => {
  const product = await resolveProduct(req.params.id || req.params.productId)
  if (!product) return res.status(404).json({ message: "Product not found", code: "PRODUCT_NOT_FOUND" })
  const { rating, title, comment } = validateReview(req.body)
  let order
  if (databaseReady()) {
    order = await Order.findOne({ user: req.user._id, "items.product": product._id, status: { $ne: "Cancelled" } }).sort({ createdAt: -1 })
    if (!order) return res.status(403).json({ message: "Only customers who purchased this product can review it", code: "REVIEW_NOT_ELIGIBLE" })
    const existing = await Review.findOne({ user: req.user._id, product: product._id })
    if (existing) return res.status(409).json({ message: "You have already reviewed this product", code: "REVIEW_EXISTS" })
    const review = await Review.create({ user: req.user._id, product: product._id, order: order._id, rating, title, comment, verifiedPurchase: true })
    await updateProductRating(product._id)
    return res.status(201).json({ data: reviewJson(review) })
  }
  const purchased = memory.orders.some((entry) => String(entry.user) === String(req.user._id) && entry.status !== "Cancelled" && entry.items.some((item) => String(item.product) === String(product._id)))
  if (!purchased) return res.status(403).json({ message: "Only customers who purchased this product can review it", code: "REVIEW_NOT_ELIGIBLE" })
  if (memory.reviews.some((review) => String(review.user) === String(req.user._id) && String(review.product) === String(product._id))) return res.status(409).json({ message: "You have already reviewed this product", code: "REVIEW_EXISTS" })
  const review = { _id: id("rev"), user: String(req.user._id), userName: req.user.name, product: String(product._id), rating, title, comment, verifiedPurchase: true, helpfulCount: 0, createdAt: new Date(), updatedAt: new Date() }
  memory.reviews.push(review)
  return res.status(201).json({ data: reviewJson(review) })
})

export const updateReview = asyncHandler(async (req, res) => {
  const { rating, title, comment } = validateReview(req.body)
  if (databaseReady()) {
    const review = await Review.findOne({ _id: req.params.reviewId, user: req.user._id })
    if (!review) return res.status(404).json({ message: "Review not found", code: "REVIEW_NOT_FOUND" })
    Object.assign(review, { rating, title, comment })
    await review.save()
    await updateProductRating(review.product)
    return res.json({ data: reviewJson(review) })
  }
  const review = memory.reviews.find((entry) => String(entry._id) === String(req.params.reviewId) && String(entry.user) === String(req.user._id))
  if (!review) return res.status(404).json({ message: "Review not found", code: "REVIEW_NOT_FOUND" })
  Object.assign(review, { rating, title, comment, updatedAt: new Date() })
  return res.json({ data: reviewJson(review) })
})

export const deleteReview = asyncHandler(async (req, res) => {
  if (databaseReady()) {
    const review = await Review.findOneAndDelete({ _id: req.params.reviewId, user: req.user._id })
    if (!review) return res.status(404).json({ message: "Review not found", code: "REVIEW_NOT_FOUND" })
    await updateProductRating(review.product)
    return res.json({ data: { id: req.params.reviewId } })
  }
  const index = memory.reviews.findIndex((entry) => String(entry._id) === String(req.params.reviewId) && String(entry.user) === String(req.user._id))
  if (index < 0) return res.status(404).json({ message: "Review not found", code: "REVIEW_NOT_FOUND" })
  memory.reviews.splice(index, 1)
  return res.json({ data: { id: req.params.reviewId } })
})
