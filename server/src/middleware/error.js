export function notFound(req, res, next) {
  if (req.path.startsWith("/api")) return res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}`, code: "NOT_FOUND" })
  return next()
}

export function errorHandler(error, _req, res, _next) {
  console.error("API error", { name: error?.name || "Error", code: error?.code || "UNKNOWN" })
  if (error?.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      ...(error.errors ? { details: Object.fromEntries(Object.entries(error.errors).map(([key, value]) => [key, value.message])) } : {}),
    })
  }
  if (error?.name === "CastError") {
    return res.status(400).json({ success: false, message: "A supplied identifier or value has an invalid format", code: "VALIDATION_ERROR" })
  }
  if (error?.code === 11000 || error?.code === 11001) {
    return res.status(409).json({ success: false, message: "A record with that value already exists", code: "DUPLICATE" })
  }
  const status = Number(error?.statusCode) || 500
  const safeMessage = status >= 500 ? "Unexpected server error" : (error.message || "Request could not be completed")
  return res.status(status).json({
    success: false,
    message: safeMessage,
    code: typeof error?.code === "string" ? error.code : "SERVER_ERROR",
    ...(error?.details ? { details: error.details } : {}),
  })
}
