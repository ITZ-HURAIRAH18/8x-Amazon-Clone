import bcrypt from "bcryptjs"
import { User } from "../models/User.js"
import { databaseReady } from "../config/db.js"
import { memory, id } from "../data/memory.js"
import { env } from "../config/env.js"
import { signAdminToken } from "../utils/token.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/validation.js"

const emailValue = (email) => String(email || "").trim().toLowerCase()

export function safeAdmin(user) {
  return {
    id: String(user._id || user.id),
    _id: String(user._id || user.id),
    name: user.name,
    email: user.email,
    role: user.role || "customer",
    status: user.status || "active",
    lastLoginAt: user.lastLoginAt || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

async function ensureMemoryAdmin() {
  if (databaseReady() || memory.users.some((user) => user.role === "admin")) return
  const email = emailValue(env.adminEmail)
  const password = String(env.adminPassword || "")
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12) return
  const existing = memory.users.find((user) => user.email === email)
  const now = new Date()
  if (existing) {
    existing.role = "admin"
    existing.status = "active"
    existing.passwordHash = await bcrypt.hash(password, 12)
    existing.tokenVersion = Number(existing.tokenVersion || 0) + 1
    return
  }
  memory.users.push({
    _id: id("admin"),
    name: String(env.adminName || "Administrator").trim().slice(0, 120),
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: "admin",
    status: "active",
    tokenVersion: 0,
    addresses: [],
    defaultAddressId: null,
    createdAt: now,
    updatedAt: now,
  })
}

export const adminLogin = asyncHandler(async (req, res) => {
  const email = emailValue(req.body.email)
  const password = String(req.body.password || "")
  if (!email || !password || password.length > 128) throw new ApiError("A valid email and password are required")

  await ensureMemoryAdmin()
  const user = databaseReady()
    ? await User.findOne({ email }).select("+passwordHash")
    : memory.users.find((entry) => entry.email === email)
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ success: false, message: "Incorrect administrator email or password", code: "AUTH_INVALID" })
  }
  if (user.role !== "admin") return res.status(403).json({ success: false, message: "This account does not have administrator access", code: "ADMIN_REQUIRED" })
  if (user.status && user.status !== "active") return res.status(403).json({ success: false, message: "This administrator account is not active", code: "ACCOUNT_INACTIVE" })

  user.lastLoginAt = new Date()
  if (databaseReady()) await user.save()
  return res.json({ success: true, message: "Administrator authenticated", data: { user: safeAdmin(user), token: signAdminToken(user) } })
})

export const adminMe = asyncHandler(async (req, res) => res.json({ success: true, data: safeAdmin(req.user) }))

export const adminLogout = asyncHandler(async (req, res) => {
  if (databaseReady()) await User.updateOne({ _id: req.user._id, role: "admin" }, { $inc: { tokenVersion: 1 } })
  else {
    const user = memory.users.find((entry) => String(entry._id) === String(req.user._id))
    if (user) user.tokenVersion = Number(user.tokenVersion || 0) + 1
  }
  return res.json({ success: true, message: "Administrator signed out", data: { loggedOut: true } })
})
