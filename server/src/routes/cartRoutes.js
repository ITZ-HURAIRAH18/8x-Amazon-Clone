import { Router } from "express"
import { addToCart, clearCart, getCart, mergeCart, moveCartItemToWishlist, moveSavedItemToCart, removeCartItem, removeSavedItem, saveCartItemForLater, updateCartItem } from "../controllers/cartController.js"
import { protect } from "../middleware/auth.js"

const router = Router()
router.use(protect)
router.get("/", getCart)
router.delete("/", clearCart)
router.post("/", addToCart)
router.post("/merge", mergeCart)
router.patch("/:itemId", updateCartItem)
router.delete("/:itemId", removeCartItem)
router.post("/:itemId/save-for-later", saveCartItemForLater)
router.post("/:itemId/move-to-wishlist", moveCartItemToWishlist)
router.post("/saved/:itemId/move-to-cart", moveSavedItemToCart)
router.delete("/saved/:itemId", removeSavedItem)
export default router
