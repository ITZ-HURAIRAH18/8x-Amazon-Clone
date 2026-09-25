import { User } from "../models/User.js"
import { databaseReady } from "../config/db.js"
import { memory } from "../data/memory.js"
import { verifyToken } from "../utils/token.js"

async function resolveUser(token) {
  const payload = verifyToken(token)
  const user = databaseReady()
    ? await User.findById(payload.sub)
    : memory.users.find((entry) => String(entry._id) === payload.sub) || null
  if (!user) return null
  if (payload.ver != null && Number(payload.ver) !== Number(user.tokenVersion || 0)) return null
  return user
}

function bearerToken(req) {
  const header = req.headers.authorization || ""
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null
}

export async function protect(req, res, next) {
  try {
    const token = bearerToken(req)
    if (!token) return res.status(401).json({ success: false, message: "Authentication required", code: "AUTH_REQUIRED" })
    const user = await resolveUser(token)
    if (!user) return res.status(401).json({ success: false, message: "Invalid or expired session", code: "AUTH_INVALID" })
    if (user.status && user.status !== "active") {
      return res.status(403).json({ success: false, message: "This account is not active", code: "ACCOUNT_INACTIVE" })
    }
    req.user = user
    return next()
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired session", code: "AUTH_INVALID" })
  }
}

export async function optionalAuth(req, _res, next) {
  try {
    const token = bearerToken(req)
    if (token) {
      const user = await resolveUser(token)
      if (user && (!user.status || user.status === "active")) req.user = user
    }
  } catch {
    // Optional authentication never blocks browsing.
  }
  return next()
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ success: false, message: "Authentication required", code: "AUTH_REQUIRED" })
  if (req.user.role !== "admin") return res.status(403).json({ success: false, message: "Administrator access is required", code: "ADMIN_REQUIRED" })
  if (req.user.status && req.user.status !== "active") return res.status(403).json({ success: false, message: "This administrator account is not active", code: "ACCOUNT_INACTIVE" })
  return next()
}
