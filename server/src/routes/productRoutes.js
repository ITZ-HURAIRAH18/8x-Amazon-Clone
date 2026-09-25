import { Router } from "express"
import { createProduct, getProduct, getProductFacets, getRecommendations, listProducts } from "../controllers/productController.js"
import { createReview, deleteReview, listReviews, updateReview } from "../controllers/reviewController.js"
import { protect } from "../middleware/auth.js"
import { env } from "../config/env.js"

const requireProductAdmin = (req, res, next) => {
  if (!env.productAdminToken || req.headers["x-product-admin-token"] !== env.productAdminToken) return res.status(403).json({ message: "Product management requires the operations token", code: "PRODUCT_FORBIDDEN" })
  return next()
}

const router = Router()
router.get("/", listProducts)
router.get("/facets", getProductFacets)
router.post("/", protect, requireProductAdmin, createProduct)
router.get("/:id/recommendations", getRecommendations)
router.get("/:id/reviews", listReviews)
router.post("/:id/reviews", protect, createReview)
router.patch("/:id/reviews/:reviewId", protect, updateReview)
router.delete("/:id/reviews/:reviewId", protect, deleteReview)
router.get("/:id", getProduct)
export default router
