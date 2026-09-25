import dns from "node:dns"
import mongoose from "mongoose"
import { env } from "./env.js"

function safeMongoError(error) {
  return {
    name: error?.name || "Error",
    code: error?.code || "UNKNOWN",
  }
}

export async function connectDatabase() {
  const dnsServers = String(process.env.MONGO_DNS_SERVERS || "").split(",").map((value) => value.trim()).filter(Boolean)
  if (dnsServers.length) dns.setServers(dnsServers)
  mongoose.connection.on("connected", () => console.log("MongoDB connected"))
  mongoose.connection.on("error", (error) => {
    const safe = safeMongoError(error)
    console.error(`MongoDB connection error (${safe.name}, ${safe.code})`)
  })
  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 })
    return true
  } catch (error) {
    const safe = safeMongoError(error)
    console.warn(`MongoDB unavailable; API will use demo fallback data (${safe.name}, ${safe.code})`)
    return false
  }
}

export function databaseReady() {
  return mongoose.connection.readyState === 1
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect()
}
