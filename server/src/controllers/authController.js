import bcrypt from "bcryptjs"
import { User } from "../models/User.js"
import { databaseReady } from "../config/db.js"
import { memory, id } from "../data/memory.js"
import { signToken } from "../utils/token.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const emailValue = (email) => String(email || "").trim().toLowerCase()
const safeUser = (user) => {
  if (typeof user.toSafeObject === "function") return user.toSafeObject()
  const { passwordHash, ...safe } = user
  return safe
}

function validateCredentials(body) {
  const name = String(body.name || "").trim()
  const email = emailValue(body.email)
  const password = String(body.password || "")
  if (!name || !email || password.length < 6) {
    const error = new Error("Name, email, and a password of at least 6 characters are required")
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
    user = await User.create({ name, email, passwordHash, addresses: [] })
  } else {
    if (memory.users.some((entry) => entry.email === email)) {
      const error = new Error("An account with that email already exists")
      error.statusCode = 409
      error.code = "DUPLICATE"
      throw error
    }
    user = { _id: id("usr"), name, email, passwordHash, addresses: [], defaultAddressId: null, createdAt: new Date() }
    memory.users.push(user)
  }
  return res.status(201).json({ data: { user: safeUser(user), token: signToken(user) } })
})

export const login = asyncHandler(async (req, res) => {
  const email = emailValue(req.body.email)
  const password = String(req.body.password || "")
  if (!email || !password) return res.status(400).json({ message: "Email and password are required", code: "VALIDATION_ERROR" })
  let user
  if (databaseReady()) user = await User.findOne({ email }).select("+passwordHash")
  else user = memory.users.find((entry) => entry.email === email)
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ message: "Incorrect email or password", code: "AUTH_INVALID" })
  return res.json({ data: { user: safeUser(user), token: signToken(user) } })
})

export const me = asyncHandler(async (req, res) => res.json({ data: safeUser(req.user) }))

export const updateProfile = asyncHandler(async (req, res) => {
  const name = String(req.body.name || "").trim()
  if (!name) return res.status(400).json({ message: "Name is required", code: "VALIDATION_ERROR" })
  if (databaseReady()) {
    const user = await User.findByIdAndUpdate(req.user._id, { $set: { name } }, { new: true, runValidators: true })
    if (!user) return res.status(404).json({ message: "Account not found", code: "USER_NOT_FOUND" })
    return res.json({ data: safeUser(user) })
  }
  const user = memory.users.find((entry) => String(entry._id) === String(req.user._id))
  if (!user) return res.status(404).json({ message: "Account not found", code: "USER_NOT_FOUND" })
  user.name = name
  return res.json({ data: safeUser(user) })
})

export const changePassword = asyncHandler(async (req, res) => {
  const currentPassword = String(req.body.currentPassword || "")
  const newPassword = String(req.body.newPassword || "")
  if (newPassword.length < 6) return res.status(400).json({ message: "New password must be at least 6 characters", code: "VALIDATION_ERROR" })
  const user = databaseReady() ? await User.findById(req.user._id).select("+passwordHash") : memory.users.find((entry) => String(entry._id) === String(req.user._id))
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) return res.status(400).json({ message: "Current password is incorrect", code: "PASSWORD_INVALID" })
  user.passwordHash = await bcrypt.hash(newPassword, 12)
  if (databaseReady()) await user.save()
  return res.json({ data: { updated: true } })
})
