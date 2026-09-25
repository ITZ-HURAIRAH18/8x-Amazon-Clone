import { createApp } from "../src/app.js"
import { connectDatabase } from "../src/config/db.js"

const app = createApp()

export default async function handler(req, res) {
  try {
    await connectDatabase()
  } catch (error) {
    // Keep the demo fallback available when MongoDB is not configured.
    console.error("MongoDB connection unavailable:", error.message)
  }
  return app(req, res)
}
