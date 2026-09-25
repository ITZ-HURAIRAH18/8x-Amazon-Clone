import { Router } from "express"
import { listCoupons, validateCoupon } from "../controllers/couponController.js"
import { protect } from "../middleware/auth.js"

const router = Router()
router.get("/", protect, listCoupons)
router.post("/validate", protect, validateCoupon)
export default router
