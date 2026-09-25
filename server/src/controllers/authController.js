import bcrypt from "bcryptjs"
import { User } from "../models/User.js"
import { databaseReady } from "../config/db.js"
import { memory, id } from "../data/memory.js"
import { signToken } from "../utils/token.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { createAdminNotification } from "./notificationController.js"

const emailValue = (email) => String(email || "").trim().toLowerCase()
const safeUser = (user) => ({
  id: String(user._id || user.id),
  _id: String(user._id || user.id),
  name: user.name,
  email: user.email,
  role: user.role || "customer",
  status: user.status || "active",
  addresses: user.addresses || [],
  defaultAddressId: user.defaultAddressId || null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
})

function validateCredentials(body) {
  const name = String(body.name || "").trim()
  const email = emailValue(body.email)
  const password = String(body.password || "")
  if (name.length < 1 || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6 || password.length > 128) {
    const error = new Error("A valid name, email, and password of at least 6 characters are required")
    error.statusCode = 400
    error.code = "VALIDATION_ERROR"
    throw error
  }
  return { name, email, password }
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = validateCredentials(req.body)
  const passwordHash = await bcrypt.hash(password, 12)
  let user
  if (databaseReady()) {
    user = await User.create({ name, email, passwordHash, role: "customer", status: "active", addresses: [] })
  } else {
    if (memory.users.some((entry) => entry.email === email)) {
      const error = new Error("An account with that email already exists")
      error.statusCode = 409
      error.code = "DUPLICATE"
      throw error
    }
    user = { _id: id("usr"), name, email, passwordHash, role: "customer", status: "active", tokenVersion: 0, addresses: [], defaultAddressId: null, createdAt: new Date(), updatedAt: new Date() }
    memory.users.push(user)
  }
  try { await createAdminNotification({ type: "admin-customer", title: "New customer registration", message: `${user.name} created an account.`, link: `/admin/users/${String(user._id)}`, metadata: { userId: String(user._id) } }, { dedupeKey: `new-customer:${user._id}` }) } catch { /* registration remains authoritative */ }
  return res.status(201).json({ success: true, data: { user: safeUser(user), token: signToken(user) } })
})

export const login = asyncHandler(async (req, res) => {
  const email = emailValue(req.body.email)
  const password = String(req.body.password || "")
  if (!email || !password) return res.status(400).json({ success: false, message: "Email and password are required", code: "VALIDATION_ERROR" })
  let user
  if (databaseReady()) {
    user = await User.findOne({ email }).select("+passwordHash")
  } else {
    user = memory.users.find((entry) => entry.email === email)
  }
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ success: false, message: "Incorrect email or password", code: "AUTH_INVALID" })
  if (user.status && user.status !== "active") return res.status(403).json({ success: false, message: "This account is not active", code: "ACCOUNT_INACTIVE" })
  user.lastLoginAt = new Date()
  if (databaseReady()) await user.save()
  return res.json({ success: true, data: { user: safeUser(user), token: signToken(user) } })
})

export const me = asyncHandler(async (req, res) => res.json({ success: true, data: safeUser(req.user) }))

export const updateProfile = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim()
  if (name.length < 2 || name.length > 120) return res.status(400).json({ success: false, message: "A valid name is required", code: "VALIDATION_ERROR" })
  if (databaseReady()) {
    const user = await User.findByIdAndUpdate(req.user._id, { $set: { name } }, { new: true, runValidators: true })
    if (!user) return res.status(404).json({ success: false, message: "Account not found", code: "USER_NOT_FOUND" })
    return res.json({ success: true, data: safeUser(user) })
  }
  const user = memory.users.find((entry) => String(entry._id) === String(req.user._id))
  if (!user) return res.status(404).json({ success: false, message: "Account not found", code: "USER_NOT_FOUND" })
  user.name = name
  return res.json({ success: true, data: safeUser(user) })
})

export const changePassword = asyncHandler(async (req, res) => {
  const currentPassword = String(req.body.currentPassword || "")
  const newPassword = String(req.body.newPassword || "")
  if (newPassword.length < 6 || newPassword.length > 128) return res.status(400).json({ success: false, message: "New password must be at least 6 characters", code: "VALIDATION_ERROR" })
  const user = databaseReady() ? await User.findById(req.user._id).select("+passwordHash") : memory.users.find((entry) => String(entry._id) === String(req.user._id))
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) return res.status(400).json({ success: false, message: "Current password is incorrect", code: "PASSWORD_INVALID" })
  user.passwordHash = await bcrypt.hash(newPassword, 12)
  user.tokenVersion = Number(user.tokenVersion || 0) + 1
  if (databaseReady()) await user.save()
  return res.json({ success: true, data: { updated: true, reauthenticate: true } })
})

export const logout = asyncHandler(async (req, res) => {
  if (databaseReady()) {
    await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } })
  } else {
    const user = memory.users.find((entry) => String(entry._id) === String(req.user._id))
    if (user) user.tokenVersion = Number(user.tokenVersion || 0) + 1
  }
  return res.json({ success: true, message: "Signed out", data: { loggedOut: true } })
})
