import { Router } from "express"
import { addWishlistItem, clearWishlist, getWishlist, moveWishlistToCart, removeWishlistItem } from "../controllers/wishlistController.js"
import { protect } from "../middleware/auth.js"

const router = Router()
router.use(protect)
router.get("/", getWishlist)
router.post("/", addWishlistItem)
router.delete("/", clearWishlist)
router.post("/:productId/move-to-cart", moveWishlistToCart)
router.delete("/:productId", removeWishlistItem)
export default router
