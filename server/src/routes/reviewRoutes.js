import { Router } from "express"
import { listMyReviews } from "../controllers/reviewController.js"
import { protect } from "../middleware/auth.js"

const router = Router()
router.use(protect)
router.get("/mine", listMyReviews)
export default router
