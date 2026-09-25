import { Router } from "express"
import { changePassword, login, logout, me, register, updateProfile } from "../controllers/authController.js"
import { protect } from "../middleware/auth.js"
import { rateLimit } from "../middleware/security.js"

const router = Router()
router.post("/register", rateLimit({ windowMs: 60_000, max: 10 }), register)
router.post("/login", rateLimit({ windowMs: 60_000, max: 20 }), login)
router.get("/me", protect, me)
router.post("/logout", protect, logout)
router.patch("/profile", protect, updateProfile)
router.patch("/password", protect, changePassword)
export default router
