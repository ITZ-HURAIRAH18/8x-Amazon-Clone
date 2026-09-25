import { Router } from "express"
import { listCoupons, validateCoupon } from "../controllers/couponController.js"
import { protect } from "../middleware/auth.js"
import { rateLimit } from "../middleware/security.js"

const router = Router()
router.get("/", protect, listCoupons)
router.post("/validate", protect, rateLimit({ windowMs: 60_000, max: 30 }), validateCoupon)
export default router
