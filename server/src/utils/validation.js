import mongoose from "mongoose"

export class ApiError extends Error {
  constructor(message, statusCode = 400, code = "VALIDATION_ERROR", details) {
    super(message)
    this.name = "ApiError"
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export const fail = (message, statusCode = 400, code = "VALIDATION_ERROR", details) => {
  throw new ApiError(message, statusCode, code, details)
}

export const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
export const isMongoId = (value) => mongoose.isValidObjectId(String(value || ""))
export const objectId = (value) => (isMongoId(value) ? String(value) : null)

export function text(value, { required = false, max = 500, min = 0, label = "Value" } = {}) {
  const result = String(value ?? "").trim()
  if (required && !result) fail(`${label} is required`)
  if (result.length < min) fail(`${label} must be at least ${min} characters`)
  if (result.length > max) fail(`${label} must be ${max} characters or fewer`)
  return result
}

export function number(value, { required = false, min = 0, max = Number.MAX_SAFE_INTEGER, integer = false, label = "Value" } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) fail(`${label} is required`)
    return undefined
  }
  const result = Number(value)
  if (!Number.isFinite(result)) fail(`${label} must be a valid number`)
  if (integer && !Number.isInteger(result)) fail(`${label} must be a whole number`)
  if (result < min || result > max) fail(`${label} must be between ${min} and ${max}`)
  return result
}

export function boolean(value, fallback = undefined) {
  if (value === undefined) return fallback
  if (value === true || value === "true" || value === "1" || value === 1) return true
  if (value === false || value === "false" || value === "0" || value === 0) return false
  fail("Boolean values must be true or false")
}

export function enumValue(value, allowed, { required = false, label = "Value" } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) fail(`${label} is required`)
    return undefined
  }
  const result = String(value).trim()
  if (!allowed.includes(result)) fail(`${label} must be one of: ${allowed.join(", ")}`)
  return result
}

export function dateValue(value, { required = false, label = "Date" } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) fail(`${label} is required`)
    return undefined
  }
  const result = new Date(value)
  if (Number.isNaN(result.getTime())) fail(`${label} must be a valid date`)
  return result
}

export function httpUrl(value, { required = false, label = "URL" } = {}) {
  const raw = String(value ?? "").trim()
  if (!raw) {
    if (required) fail(`${label} is required`)
    return ""
  }
  if (raw.length > 2048) fail(`${label} must be 2048 characters or fewer`)
  try {
    const parsed = new URL(raw)
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) fail(`${label} must be a public HTTP(S) URL`)
    return parsed.toString()
  } catch {
    fail(`${label} must be a valid HTTP(S) URL`)
  }
}

export function objectIdList(value, { required = false, max = 100, label = "IDs" } = {}) {
  if (!Array.isArray(value)) {
    if (required) fail(`${label} must be an array`)
    return []
  }
  const unique = [...new Set(value.map(String))]
  if (!unique.length && required) fail(`${label} must contain at least one value`)
  if (unique.length > max) fail(`${label} cannot contain more than ${max} values`)
  if (unique.some((entry) => !isMongoId(entry))) fail(`${label} contains an invalid identifier`)
  return unique
}

export function plainObject(value, label = "Value") {
  if (value === undefined) return undefined
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`)
  if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) fail(`${label} must be a plain object`)
  return value
}

export function safeSpecifications(value) {
  if (value === undefined) return undefined
  const input = plainObject(value, "Specifications")
  const output = {}
  for (const [rawKey, rawValue] of Object.entries(input).slice(0, 100)) {
    const key = text(rawKey, { required: true, max: 100, label: "Specification name" })
    if (["string", "number", "boolean"].includes(typeof rawValue)) output[key] = typeof rawValue === "string" ? rawValue.slice(0, 1000) : rawValue
    else if (rawValue == null) output[key] = ""
    else fail(`Specification "${key}" must be text, a number, or a boolean`)
  }
  return output
}

export function stringList(value, { required = false, maxItems = 50, maxLength = 500, label = "Items" } = {}) {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) fail(`${label} must be an array`)
  if (required && !value.length) fail(`${label} must contain at least one item`)
  if (value.length > maxItems) fail(`${label} cannot contain more than ${maxItems} items`)
  return [...new Set(value.map((entry) => text(entry, { required: true, max: maxLength, label })).filter(Boolean))]
}

export const slugify = (value) => String(value || "")
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 140)

export function pagination(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(1, Math.min(100000, Math.floor(Number(query.page) || 1)))
  const limit = Math.max(1, Math.min(maxLimit, Math.floor(Number(query.limit) || defaultLimit)))
  return { page, limit, skip: (page - 1) * limit }
}

export const idOf = (value) => String(value?._id || value?.id || value || "")

export function withPagination(rows, total, page, limit) {
  return {
    data: rows,
    meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  }
}
