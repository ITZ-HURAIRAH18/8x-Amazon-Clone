import { Router } from "express"
import { listProducts, getProduct, createProduct } from "../controllers/productController.js"

const router = Router()
router.get("/", listProducts)
router.post("/", createProduct)
router.get("/:id", getProduct)
export default router
