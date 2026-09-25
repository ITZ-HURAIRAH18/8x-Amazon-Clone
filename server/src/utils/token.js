import jwt from "jsonwebtoken"
import { env } from "../config/env.js"

export function signToken(user) {
  return jwt.sign({ sub: String(user._id), email: user.email }, env.jwtSecret, { expiresIn: "7d" })
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret)
}
