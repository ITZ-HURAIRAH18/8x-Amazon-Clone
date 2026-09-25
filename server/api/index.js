import { createApp } from "../src/app.js"
import { connectDatabase } from "../src/config/db.js"
import { env } from "../src/config/env.js"

const app = createApp()

export default async function handler(req, res) {
  let databaseUnavailable = false
  try {
    const connected = await connectDatabase()
    databaseUnavailable = env.nodeEnv === "production" && !connected
  } catch (error) {
    databaseUnavailable = env.nodeEnv === "production"
    if (!databaseUnavailable) console.warn(`MongoDB connection unavailable (${error?.name || "Error"})`)
  }
  req.databaseUnavailable = databaseUnavailable
  return app(req, res)
}
