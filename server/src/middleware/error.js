export function notFound(req, res, next) {
  if (req.path.startsWith("/api")) return res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` })
  return next()
}

export function errorHandler(error, _req, res, _next) {
  console.error(error)
  if (error?.name === "ValidationError") {
    return res.status(400).json({ message: "Validation failed", code: "VALIDATION_ERROR", details: Object.values(error.errors || {}) })
  }
  if (error?.code === 11000) {
    return res.status(409).json({ message: "An account with that email already exists", code: "DUPLICATE" })
  }
  const status = error.statusCode || (error.name === "CastError" ? 400 : 500)
  return res.status(status).json({ message: error.message || "Unexpected server error", code: error.code || "SERVER_ERROR" })
}
