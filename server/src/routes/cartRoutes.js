import { Router } from "express"
import { addToCart, getCart, mergeCart, removeCartItem, updateCartItem } from "../controllers/cartController.js"
import { protect } from "../middleware/auth.js"

const router = Router()
router.use(protect)
router.get("/", getCart)
router.post("/", addToCart)
router.post("/merge", mergeCart)
router.patch("/:itemId", updateCartItem)
router.delete("/:itemId", removeCartItem)
export default router
