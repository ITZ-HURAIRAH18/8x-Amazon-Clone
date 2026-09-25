import dotenv from "dotenv"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..")
dotenv.config({ path: path.join(root, "server", ".env") })
dotenv.config({ path: path.join(root, ".env") })

const number = (value, fallback) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const env = {
  port: number(process.env.PORT, 5000),
  mongoUri: process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/AmazonClone",
  mongoDnsServers: process.env.MONGO_DNS_SERVERS || "8.8.8.8,1.1.1.1,8.8.4.4",
  jwtSecret: process.env.JWT_SECRET || "amazon-clone-development-secret-change-me",
  orderStatusToken: process.env.ORDER_STATUS_TOKEN || "",
  productAdminToken: process.env.PRODUCT_ADMIN_TOKEN || "",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  nodeEnv: process.env.NODE_ENV || "development",
}

if (env.nodeEnv === "production" && env.jwtSecret === "amazon-clone-development-secret-change-me") {
  throw new Error("JWT_SECRET must be set in production")
}
