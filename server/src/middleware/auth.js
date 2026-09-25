import { User } from "../models/User.js"
import { databaseReady } from "../config/db.js"
import { memory } from "../data/memory.js"
import { verifyToken } from "../utils/token.js"

async function resolveUser(token) {
  const payload = verifyToken(token)
  if (databaseReady()) return User.findById(payload.sub)
  return memory.users.find((user) => String(user._id) === payload.sub) || null
}

export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || ""
    const token = header.startsWith("Bearer ") ? header.slice(7) : null
    if (!token) return res.status(401).json({ message: "Authentication required", code: "AUTH_REQUIRED" })
    const user = await resolveUser(token)
    if (!user) return res.status(401).json({ message: "Invalid or expired session", code: "AUTH_INVALID" })
    req.user = user
    return next()
  } catch {
    return res.status(401).json({ message: "Invalid or expired session", code: "AUTH_INVALID" })
  }
}

export async function optionalAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || ""
    const token = header.startsWith("Bearer ") ? header.slice(7) : null
    if (token) req.user = await resolveUser(token)
  } catch {
    // Optional authentication never blocks browsing.
  }
  return next()
}
