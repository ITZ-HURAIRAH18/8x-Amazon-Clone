import jwt from "jsonwebtoken"
import { env } from "../config/env.js"

export function signToken(user, { type = "customer" } = {}) {
  return jwt.sign(
    {
      sub: String(user._id),
      email: user.email,
      type,
      ver: Number(user.tokenVersion || 0),
    },
    env.jwtSecret,
    { expiresIn: "7d" },
  )
}

export function signAdminToken(user) {
  return signToken(user, { type: "admin" })
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret)
}
