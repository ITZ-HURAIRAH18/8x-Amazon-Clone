import { Router } from "express"
import { createOrder, getOrder, listOrders, updateOrderStatus } from "../controllers/orderController.js"
import { protect } from "../middleware/auth.js"
import { env } from "../config/env.js"

const requireStatusToken = (req, res, next) => {
  if (!env.orderStatusToken || req.headers["x-order-status-token"] !== env.orderStatusToken) return res.status(403).json({ message: "Order status updates require the operations token", code: "STATUS_FORBIDDEN" })
  return next()
}

const router = Router()
router.use(protect)
router.get("/", listOrders)
router.post("/", createOrder)
router.get("/:id", getOrder)
router.patch("/:id/status", requireStatusToken, updateOrderStatus)
export default router
