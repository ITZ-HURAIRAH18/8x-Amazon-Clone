import bcrypt from "bcryptjs"
import mongoose from "mongoose"
import { connectDatabase, disconnectDatabase } from "./config/db.js"
import { env } from "./config/env.js"
import { User } from "./models/User.js"

const email = String(process.env.ADMIN_EMAIL || env.adminEmail || "").trim().toLowerCase()
const password = String(process.env.ADMIN_PASSWORD || env.adminPassword || "")
const name = String(process.env.ADMIN_NAME || env.adminName || "Administrator").trim()

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("ADMIN_EMAIL must be a valid email address")
  process.exitCode = 1
} else if (password.length < 12 || password.length > 128) {
  console.error("ADMIN_PASSWORD must contain between 12 and 128 characters")
  process.exitCode = 1
} else if (name.length < 2 || name.length > 120) {
  console.error("ADMIN_NAME must contain between 2 and 120 characters")
  process.exitCode = 1
} else {
  let connected = false
  try {
    connected = await connectDatabase()
  } catch {
    connected = false
  }
  if (!connected) {
    console.error("MongoDB is required to seed a persistent administrator account")
    process.exitCode = 1
  } else {
    const passwordHash = await bcrypt.hash(password, 12)
    const now = new Date()
    const existing = await User.findOne({ email }).select("+passwordHash")
    if (existing) {
      existing.name = name
      existing.passwordHash = passwordHash
      existing.role = "admin"
      existing.status = "active"
      existing.statusReason = "Seeded administrator"
      existing.statusChangedAt = now
      existing.tokenVersion = Number(existing.tokenVersion || 0) + 1
      await existing.save()
      console.log(`Administrator ${email} was updated successfully`)
    } else {
      await User.create({
        name,
        email,
        passwordHash,
        role: "admin",
        status: "active",
        statusReason: "Seeded administrator",
        statusChangedAt: now,
        tokenVersion: 0,
        addresses: [],
      })
      console.log(`Administrator ${email} was created successfully`)
    }
    await disconnectDatabase()
  }
}

if (mongoose.connection.readyState !== 0) await mongoose.disconnect()
