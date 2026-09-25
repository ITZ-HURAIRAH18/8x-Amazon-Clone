import { Brand } from "../models/Brand.js"
import { Product } from "../models/Product.js"
import { databaseReady } from "../config/db.js"
import { memory, id } from "../data/memory.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError, boolean, escapeRegex, httpUrl, idOf, isMongoId, pagination, slugify, text, withPagination } from "../utils/validation.js"
import { ensureTaxonomyRecords } from "../services/taxonomyService.js"

const sorts = { newest: { createdAt: -1 }, oldest: { createdAt: 1 }, name: { name: 1 }, products: { productCount: -1 } }

function serialize(value) {
  return {
    id: idOf(value),
    name: value.name,
    slug: value.slug,
    description: value.description || "",
    logo: value.logo || value.image || "",
    active: value.active !== false,
    productCount: Number(value.productCount || 0),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }
}

function validateBody(body, partial = false) {
  const payload = {}
  if (!partial || body.name !== undefined) payload.name = text(body.name, { required: true, min: 2, max: 100, label: "Brand name" })
  if (body.slug !== undefined || !partial) payload.slug = slugify(body.slug || payload.name)
  if (!payload.slug) throw new ApiError("Brand slug could not be generated")
  if (body.description !== undefined) payload.description = text(body.description, { max: 500, label: "Description" })
  if (body.logo !== undefined || body.image !== undefined) payload.logo = httpUrl(body.logo ?? body.image, { label: "Brand logo" })
  if (body.active !== undefined) payload.active = boolean(body.active, true)
  return payload
}

export const listBrands = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query, { defaultLimit: 50, maxLimit: 100 })
  const search = text(req.query.search || req.query.q, { max: 100, label: "Search" })
  const status = req.query.status
  if (status && !["active", "inactive", "all"].includes(status)) throw new ApiError("Invalid brand status")
  await ensureTaxonomyRecords()

  if (databaseReady()) {
    const match = {}
    if (search) match.name = new RegExp(escapeRegex(search), "i")
    if (status === "active") match.active = { $ne: false }
    if (status === "inactive") match.active = false
    const [result] = await Brand.aggregate([
      { $match: match },
      {
        $lookup: {
          from: "products",
          let: { brandName: "$name" },
          pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$brand", "$$brandName"] }, { $ne: ["$active", false] }] } } }],
          as: "products",
        },
      },
      { $addFields: { productCount: { $size: "$products" } } },
      { $sort: sorts[req.query.sort] || sorts.name },
      { $facet: { rows: [{ $skip: skip }, { $limit: limit }], count: [{ $count: "total" }] } },
    ])
    const rows = result.rows.map(serialize)
    return res.json({ success: true, ...withPagination(rows, result.count[0]?.total || 0, page, limit) })
  }

  const term = search.toLowerCase()
  let rows = memory.brands.filter((entry) => !term || entry.name.toLowerCase().includes(term))
  if (status === "active") rows = rows.filter((entry) => entry.active)
  if (status === "inactive") rows = rows.filter((entry) => !entry.active)
  rows = rows.map((entry) => ({ ...entry, productCount: memory.products.filter((product) => product.active !== false && product.brand.toLowerCase() === entry.name.toLowerCase()).length }))
  rows.sort((a, b) => req.query.sort === "newest" ? new Date(b.createdAt) - new Date(a.createdAt) : req.query.sort === "oldest" ? new Date(a.createdAt) - new Date(b.createdAt) : req.query.sort === "products" ? b.productCount - a.productCount : a.name.localeCompare(b.name))
  return res.json({ success: true, ...withPagination(rows.slice(skip, skip + limit).map(serialize), rows.length, page, limit) })
})

export const getBrand = asyncHandler(async (req, res) => {
  await ensureTaxonomyRecords()
  if (databaseReady()) {
    if (!isMongoId(req.params.id)) throw new ApiError("Brand not found", 404, "BRAND_NOT_FOUND")
    const brand = await Brand.findById(req.params.id).lean()
    if (!brand) throw new ApiError("Brand not found", 404, "BRAND_NOT_FOUND")
    const productCount = await Product.countDocuments({ brand: new RegExp(`^${brand.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"), active: { $ne: false } })
    return res.json({ success: true, data: serialize({ ...brand, productCount }) })
  }
  const brand = memory.brands.find((entry) => String(entry._id) === req.params.id)
  if (!brand) throw new ApiError("Brand not found", 404, "BRAND_NOT_FOUND")
  const productCount = memory.products.filter((product) => product.active !== false && product.brand.toLowerCase() === brand.name.toLowerCase()).length
  return res.json({ success: true, data: serialize({ ...brand, productCount }) })
})

export const createBrand = asyncHandler(async (req, res) => {
  const payload = validateBody(req.body)
  if (databaseReady()) {
    const brand = await Brand.create(payload)
    return res.status(201).json({ success: true, message: "Brand created", data: serialize(brand) })
  }
  if (memory.brands.some((entry) => entry.name.toLowerCase() === payload.name.toLowerCase() || entry.slug === payload.slug)) throw new ApiError("A brand with that name or slug already exists", 409, "DUPLICATE")
  const now = new Date()
  const brand = { _id: id("brand"), ...payload, active: payload.active ?? true, createdAt: now, updatedAt: now }
  memory.brands.push(brand)
  return res.status(201).json({ success: true, message: "Brand created", data: serialize(brand) })
})

export const updateBrand = asyncHandler(async (req, res) => {
  const payload = validateBody(req.body, true)
  if (!isMongoId(req.params.id) && !memory.brands.some((entry) => String(entry._id) === req.params.id)) throw new ApiError("Brand not found", 404, "BRAND_NOT_FOUND")
  if (databaseReady()) {
    const brand = await Brand.findById(req.params.id)
    if (!brand) throw new ApiError("Brand not found", 404, "BRAND_NOT_FOUND")
    const oldName = brand.name
    Object.assign(brand, payload)
    await brand.save()
    if (payload.name && payload.name !== oldName) {
      try {
        await Product.updateMany({ brand: oldName }, { $set: { brand: payload.name } })
      } catch (error) {
        await Brand.updateOne({ _id: brand._id }, { $set: { name: oldName } })
        throw error
      }
    }
    return res.json({ success: true, message: "Brand updated", data: serialize({ ...brand.toObject(), productCount: await Product.countDocuments({ brand: payload.name || oldName }) }) })
  }
  const brand = memory.brands.find((entry) => String(entry._id) === req.params.id)
  if (!brand) throw new ApiError("Brand not found", 404, "BRAND_NOT_FOUND")
  const oldName = brand.name
  Object.assign(brand, payload)
  if (payload.name && payload.name !== oldName) memory.products.forEach((product) => { if (product.brand === oldName) product.brand = payload.name })
  brand.updatedAt = new Date()
  return res.json({ success: true, message: "Brand updated", data: serialize(brand) })
})

export const deleteBrand = asyncHandler(async (req, res) => {
  if (!isMongoId(req.params.id) && !memory.brands.some((entry) => String(entry._id) === req.params.id)) throw new ApiError("Brand not found", 404, "BRAND_NOT_FOUND")
  if (databaseReady()) {
    const brand = await Brand.findById(req.params.id)
    if (!brand) throw new ApiError("Brand not found", 404, "BRAND_NOT_FOUND")
    const count = await Product.countDocuments({ brand: new RegExp(`^${brand.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") })
    if (count) throw new ApiError(`Reassign or delete ${count} product(s) before deleting this brand`, 409, "BRAND_IN_USE")
    await brand.deleteOne()
    return res.json({ success: true, message: "Brand deleted", data: { id: req.params.id } })
  }
  const index = memory.brands.findIndex((entry) => String(entry._id) === req.params.id)
  if (index < 0) throw new ApiError("Brand not found", 404, "BRAND_NOT_FOUND")
  const brand = memory.brands[index]
  if (memory.products.some((product) => product.brand.toLowerCase() === brand.name.toLowerCase())) throw new ApiError("Reassign or delete all products before deleting this brand", 409, "BRAND_IN_USE")
  memory.brands.splice(index, 1)
  return res.json({ success: true, message: "Brand deleted", data: { id: req.params.id } })
})
