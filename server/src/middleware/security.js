const buckets = new Map()

export function securityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff")
  res.setHeader("X-Frame-Options", "DENY")
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin")
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
  next()
}

export function rateLimit({ windowMs = 60_000, max = 60, key = (req) => req.ip } = {}) {
  return (req, res, next) => {
    const now = Date.now()
    const id = key(req)
    const current = buckets.get(id)
    if (!current || current.resetAt <= now) {
      buckets.set(id, { count: 1, resetAt: now + windowMs })
      return next()
    }
    if (current.count >= max) {
      res.setHeader("Retry-After", Math.ceil((current.resetAt - now) / 1000))
      return res.status(429).json({ message: "Too many requests. Please try again shortly.", code: "RATE_LIMITED" })
    }
    current.count += 1
    return next()
  }
}

export function clearRateLimits() {
  buckets.clear()
}
