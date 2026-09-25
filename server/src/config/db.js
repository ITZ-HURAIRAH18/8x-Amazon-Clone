import mongoose from "mongoose"
import { env } from "./env.js"

export async function connectDatabase() {
  mongoose.connection.on("connected", () => console.log("MongoDB connected"))
  mongoose.connection.on("error", (error) => console.error("MongoDB error:", error.message))
  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 })
    return true
  } catch (error) {
    console.warn(`MongoDB unavailable; API will use demo fallback data (${error.message})`)
    return false
  }
}

export function databaseReady() {
  return mongoose.connection.readyState === 1
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect()
}
