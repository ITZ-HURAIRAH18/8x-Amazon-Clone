import express from "express"
import cors from "cors"
import morgan from "morgan"
import productRoutes from "./routes/productRoutes.js"
import authRoutes from "./routes/authRoutes.js"
import cartRoutes from "./routes/cartRoutes.js"
import orderRoutes from "./routes/orderRoutes.js"
import { errorHandler, notFound } from "./middleware/error.js"
import { databaseReady } from "./config/db.js"
import { env } from "./config/env.js"

export function createApp() {
  const app = express()
  const allowedOrigins = new Set([env.clientUrl, "http://localhost:5173", "http://127.0.0.1:5173"])
  app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)), credentials: true }))
  app.use(express.json({ limit: "1mb" }))
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"))
  app.get("/api/health", (_req, res) => res.json({ data: { status: "ok", database: databaseReady() ? "connected" : "demo-fallback" } }))
  app.use("/api/products", productRoutes)
  app.use("/api/auth", authRoutes)
  app.use("/api/cart", cartRoutes)
  app.use("/api/orders", orderRoutes)
  app.use(notFound)
  app.use(errorHandler)
  return app
}

export default createApp
