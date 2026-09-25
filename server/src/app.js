import express from "express"
import cors from "cors"
import morgan from "morgan"
import productRoutes from "./routes/productRoutes.js"
import authRoutes from "./routes/authRoutes.js"
import cartRoutes from "./routes/cartRoutes.js"
import orderRoutes from "./routes/orderRoutes.js"
import wishlistRoutes from "./routes/wishlistRoutes.js"
import addressRoutes from "./routes/addressRoutes.js"
import couponRoutes from "./routes/couponRoutes.js"
import notificationRoutes from "./routes/notificationRoutes.js"
import reviewRoutes from "./routes/reviewRoutes.js"
import adminRoutes from "./routes/adminRoutes.js"
import { errorHandler, notFound } from "./middleware/error.js"
import { rateLimit, securityHeaders } from "./middleware/security.js"
import { databaseReady } from "./config/db.js"
import { env } from "./config/env.js"

export function createApp() {
  const app = express()
  app.disable("x-powered-by")
  app.set("trust proxy", 1)
  app.use(securityHeaders)
  const rawClientOrigins = (env.clientUrl || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean)

  const localOrigins = env.nodeEnv === "production" ? [] : [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5175",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]
  const allowedOrigins = new Set([
    ...rawClientOrigins,
    ...rawClientOrigins.map((o) => o.replace(/\/$/, "")),
    ...localOrigins,
    "https://amazon-clone-client-five.vercel.app",
    "https://amazon-clone-client-five.vercel.app/",
  ])

  const isAllowedOrigin = (origin) => {
    if (!origin) return true
    const normalizedOrigin = origin.replace(/\/$/, "")
    if (allowedOrigins.has(origin) || allowedOrigins.has(normalizedOrigin)) return true
    // Allow any local host/IP development origin only outside production.
    if (env.nodeEnv !== "production" && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true
    return false
  }

  app.use(
    cors({
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
          callback(null, true)
        } else {
          callback(null, false)
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  )
  const jsonParser = express.json({ limit: "1mb" })
  app.use((req, res, next) => {
    // Vercel may parse the request body before Express receives it. Mark it as
    // consumed so body-parser does not try to read the already-ended stream.
    if (req.body !== undefined) {
      req._body = true
      return next()
    }
    return jsonParser(req, res, next)
  })
  app.use(morgan(env.nodeEnv === "production" ? "combined" : "dev"))
  app.get("/api/health", (_req, res) => res.json({ data: { status: "ok", database: databaseReady() ? "connected" : "demo-fallback" } }))
  app.use("/api/products", productRoutes)
  app.use("/api/auth", authRoutes)
  app.use("/api/cart", cartRoutes)
  app.use("/api/orders", orderRoutes)
  app.use("/api/wishlist", wishlistRoutes)
  app.use("/api/addresses", addressRoutes)
  app.use("/api/coupons", couponRoutes)
  app.use("/api/notifications", notificationRoutes)
  app.use("/api/reviews", reviewRoutes)
  app.use("/api/admin", adminRoutes)
  app.use(notFound)
  app.use(errorHandler)
  return app
}

export default createApp
