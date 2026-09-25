import { Review } from "../models/Review.js"
import { Product } from "../models/Product.js"
import { databaseReady } from "../config/db.js"
import { memory } from "../data/memory.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError, enumValue, escapeRegex, idOf, isMongoId, number, pagination, text, withPagination } from "../utils/validation.js"
import { updateProductRating } from "./reviewController.js"

const statuses = ["Pending", "Approved", "Hidden", "Rejected"]

function serialize(value) {
  const product = value.product && typeof value.product === "object" ? value.product : {}
  const user = value.user && typeof value.user === "object" ? value.user : {}
  return {
    id: idOf(value),
    rating: value.rating,
    title: value.title,
    comment: value.comment,
    verifiedPurchase: Boolean(value.verifiedPurchase),
    helpfulCount: value.helpfulCount || 0,
    status: value.status || "Approved",
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    moderatedAt: value.moderatedAt || null,
    user: { id: String(user._id || value.user || ""), name: user.name || value.userName || "Customer", email: user.email || "" },
    product: { id: String(product._id || value.product || ""), title: product.title || value.productTitle || "Deleted product", image: product.images?.[0] || value.productImage || "" },
    order: value.order ? String(value.order?._id || value.order) : null,
  }
}

export const listReviews = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query, { defaultLimit: 20 })
  const search = text(req.query.search || req.query.q, { max: 120, label: "Search" })
  const status = req.query.status && req.query.status !== "all" ? enumValue(String(req.query.status).toLowerCase().replace(/^./, (character) => character.toUpperCase()), statuses, { label: "Review status" }) : undefined
  const rating = req.query.rating ? number(req.query.rating, { min: 1, max: 5, integer: true, label: "Rating" }) : undefined
  const productId = req.query.productId && isMongoId(req.query.productId) ? req.query.productId : undefined
  if (req.query.productId && !productId) throw new ApiError("Invalid product identifier")

  if (databaseReady()) {
    const match = {}
    if (status) match.status = status
    else match.$or = [{ status: { $exists: false } }, { status: { $nin: ["Hidden", "Rejected"] } }]
    if (rating) match.rating = rating
    if (productId) match.product = productId
    const sort = { newest: { createdAt: -1 }, oldest: { createdAt: 1 }, highest: { rating: -1, createdAt: -1 }, lowest: { rating: 1, createdAt: -1 } }[req.query.sort] || { createdAt: -1 }
    const [result] = await Review.aggregate([
      { $match: match },
      { $lookup: { from: "users", localField: "user", foreignField: "_id", as: "user" } },
      { $lookup: { from: "products", localField: "product", foreignField: "_id", as: "product" } },
      { $set: { user: { $first: "$user" }, product: { $first: "$product" } } },
      ...(search ? [{ $match: { $or: [{ title: new RegExp(escapeRegex(search), "i") }, { comment: new RegExp(escapeRegex(search), "i") }, { "product.title": new RegExp(escapeRegex(search), "i") }, { "user.name": new RegExp(escapeRegex(search), "i") }] } }] : []),
      { $sort: sort },
      { $facet: { rows: [{ $skip: skip }, { $limit: limit }], count: [{ $count: "total" }], summary: [{ $group: { _id: null, averageRating: { $avg: "$rating" } } }] } },
    ])
    return res.json({
      success: true,
      ...withPagination(result.rows.map(serialize), result.count[0]?.total || 0, page, limit),
      meta: { page, limit, total: result.count[0]?.total || 0, pages: Math.max(1, Math.ceil((result.count[0]?.total || 0) / limit)), averageRating: Math.round(Number(result.summary[0]?.averageRating || 0) * 10) / 10 },
    })
  }

  const userMap = new Map(memory.users.map((user) => [String(user._id), user]))
  const productMap = new Map(memory.products.map((product) => [String(product._id), product]))
  const term = search.toLowerCase()
  let rows = memory.reviews.map((review) => {
    const product = productMap.get(String(review.product))
    const user = userMap.get(String(review.user))
    return { ...review, status: review.status || "Approved", productTitle: product?.title || "Deleted product", productImage: product?.images?.[0] || "", userName: user?.name || review.userName || "Customer", product }
  }).filter((review) => {
    if (status && review.status !== status) return false
    if (!status && ["Hidden", "Rejected"].includes(review.status)) return false
    if (rating && review.rating !== rating) return false
    if (productId && String(review.product) !== productId) return false
    if (term && !`${review.title} ${review.comment} ${review.productTitle} ${review.userName}`.toLowerCase().includes(term)) return false
    return true
  })
  rows.sort((a, b) => req.query.sort === "oldest" ? new Date(a.createdAt) - new Date(b.createdAt)
    : req.query.sort === "highest" ? b.rating - a.rating
      : req.query.sort === "lowest" ? a.rating - b.rating
        : new Date(b.createdAt) - new Date(a.createdAt))
  const summary = rows.length ? Math.round((rows.reduce((sum, review) => sum + review.rating, 0) / rows.length) * 10) / 10 : 0
  return res.json({ success: true, ...withPagination(rows.slice(skip, skip + limit).map(serialize), rows.length, page, limit), meta: { page, limit, total: rows.length, pages: Math.max(1, Math.ceil(rows.length / limit)), averageRating: summary } })
})

export const getReview = asyncHandler(async (req, res) => {
  let review
  if (databaseReady()) {
    if (!isMongoId(req.params.id)) throw new ApiError("Review not found", 404, "REVIEW_NOT_FOUND")
    review = await Review.findById(req.params.id).populate("user", "name email").populate("product", "title images").lean()
  } else {
    review = memory.reviews.find((entry) => String(entry._id) === req.params.id)
    if (review) review = { ...review, user: memory.users.find((user) => String(user._id) === String(review.user)), product: memory.products.find((product) => String(product._id) === String(review.product)) }
  }
  if (!review) throw new ApiError("Review not found", 404, "REVIEW_NOT_FOUND")
  return res.json({ success: true, data: serialize(review) })
})

export const moderateReview = asyncHandler(async (req, res) => {
  const requestedStatus = String(req.body.status || "").trim()
  const status = enumValue(requestedStatus.toLowerCase().replace(/^./, (character) => character.toUpperCase()), statuses, { required: true, label: "Review status" })
  let review
  if (databaseReady()) {
    if (!isMongoId(req.params.id)) throw new ApiError("Review not found", 404, "REVIEW_NOT_FOUND")
    review = await Review.findByIdAndUpdate(req.params.id, { $set: { status, moderatedBy: req.user._id, moderatedAt: new Date() } }, { new: true, runValidators: true }).populate("user", "name").populate("product", "title images")
  } else {
    review = memory.reviews.find((entry) => String(entry._id) === req.params.id)
    if (review) Object.assign(review, { status, moderatedBy: String(req.user._id), moderatedAt: new Date(), updatedAt: new Date() })
  }
  if (!review) throw new ApiError("Review not found", 404, "REVIEW_NOT_FOUND")
  if (databaseReady()) await updateProductRating(review.product?._id || review.product)
  else {
    const product = memory.products.find((entry) => String(entry._id) === String(review.product))
    const approved = memory.reviews.filter((entry) => String(entry.product) === String(review.product) && (!entry.status || entry.status === "Approved"))
    if (product) {
      product.rating = approved.length ? Math.round((approved.reduce((sum, entry) => sum + entry.rating, 0) / approved.length) * 10) / 10 : 0
      product.reviewCount = approved.length
    }
  }
  return res.json({ success: true, message: `Review ${status.toLowerCase()}`, data: serialize(review) })
})

export const deleteReview = asyncHandler(async (req, res) => {
  let review
  if (databaseReady()) {
    if (!isMongoId(req.params.id)) throw new ApiError("Review not found", 404, "REVIEW_NOT_FOUND")
    review = await Review.findByIdAndDelete(req.params.id)
  } else review = memory.reviews.find((entry) => String(entry._id) === req.params.id)
  if (!review) throw new ApiError("Review not found", 404, "REVIEW_NOT_FOUND")
  if (databaseReady()) await updateProductRating(review.product)
  else {
    const product = memory.products.find((entry) => String(entry._id) === String(review.product))
    const approved = memory.reviews.filter((entry) => String(entry.product) === String(review.product) && (!entry.status || entry.status === "Approved"))
    if (product) {
      product.rating = approved.length ? Math.round((approved.reduce((sum, entry) => sum + entry.rating, 0) / approved.length) * 10) / 10 : 0
      product.reviewCount = approved.length
    }
  }
  return res.json({ success: true, message: "Review deleted", data: { id: req.params.id } })
})
