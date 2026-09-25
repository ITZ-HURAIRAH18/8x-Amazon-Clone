import { createApp } from "../src/app.js"
import { connectDatabase } from "../src/config/db.js"
import { env } from "../src/config/env.js"

const app = createApp()

export default async function handler(req, res) {
  try {
    await connectDatabase()
  } catch (error) {
    if (env.nodeEnv === "production") return res.status(503).json({ message: "Database unavailable", code: "DATABASE_UNAVAILABLE" })
    console.warn(`MongoDB connection unavailable (${error?.name || "Error"})`)
  }
  return app(req, res)
}
