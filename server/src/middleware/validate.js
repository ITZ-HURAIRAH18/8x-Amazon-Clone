import { ApiError, isMongoId } from "../utils/validation.js"

const runSchema = (value, schema, source) => {
  if (typeof schema === "function") {
    const result = schema(value, source)
    return result === true ? value : result
  }
  if (schema && typeof schema === "object" && !Array.isArray(schema)) {
    const output = { ...(value && typeof value === "object" ? value : {}) }
    for (const [field, rules] of Object.entries(schema)) {
      const rulesObject = typeof rules === "function" ? { validate: rules } : rules
      const { required, validate, transform } = rulesObject
      const current = value?.[field]
      if (required && (current === undefined || current === null || current === "")) throw new ApiError(`${field} is required`)
      if (validate) {
        const result = validate(current, value)
        if (result === false) throw new ApiError(`${field} is invalid`)
        if (result !== true && result !== undefined) output[field] = result
      } else if (transform) output[field] = transform(current, value)
    }
    return output
  }
  return value
}

export function validateRequest(schemas = {}) {
  return (req, _res, next) => {
    try {
      for (const source of ["params", "query", "body"]) {
        if (schemas[source] !== undefined) req[source] = runSchema(req[source], schemas[source], source)
      }
      return next()
    } catch (error) {
      return next(error)
    }
  }
}

export const validIdParam = (name = "id") => (value) => {
  if (!isMongoId(value?.[name])) throw new ApiError(`${name} must be a valid identifier`, 400, "VALIDATION_ERROR")
  return value
}
