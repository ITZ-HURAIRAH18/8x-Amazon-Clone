import { Category } from "../models/Category.js"
import { Product } from "../models/Product.js"
import { databaseReady } from "../config/db.js"
import { memory, id } from "../data/memory.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError, boolean, escapeRegex, httpUrl, idOf, isMongoId, number, pagination, slugify, text, withPagination } from "../utils/validation.js"
import { ensureTaxonomyRecords } from "../services/taxonomyService.js"

const sorts = { newest: { createdAt: -1 }, oldest: { createdAt: 1 }, name: { name: 1 }, products: { productCount: -1 } }

function serialize(value) {
  return {
    id: idOf(value),
    name: value.name,
    slug: value.slug,
    description: value.description || "",
    image: value.image || "",
    active: value.active !== false,
    productCount: Number(value.productCount || 0),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }
}

function validateBody(body, partial = false) {
  const payload = {}
  if (!partial || body.name !== undefined) payload.name = text(body.name, { required: true, min: 2, max: 100, label: "Category name" })
  if (body.slug !== undefined || !partial) payload.slug = slugify(body.slug || payload.name)
  if (!payload.slug) throw new ApiError("Category slug could not be generated")
  if (body.description !== undefined) payload.description = text(body.description, { max: 500, label: "Description" })
  if (body.image !== undefined) payload.image = httpUrl(body.image, { label: "Category image" })
  if (body.active !== undefined) payload.active = boolean(body.active, true)
  return payload
}

export const listCategories = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query, { defaultLimit: 50, maxLimit: 100 })
  const search = text(req.query.search || req.query.q, { max: 100, label: "Search" })
  const status = req.query.status
  if (status && !["active", "inactive", "all"].includes(status)) throw new ApiError("Invalid category status")
  await ensureTaxonomyRecords()

  if (databaseReady()) {
    const match = {}
    if (search) match.name = new RegExp(escapeRegex(search), "i")
    if (status === "active") match.active = { $ne: false }
    if (status === "inactive") match.active = false
    const [result] = await Category.aggregate([
      { $match: match },
      {
        $lookup: {
          from: "products",
          let: { categoryName: "$name" },
          pipeline: [{ $match: { $expr: { $and: [{ $eq: ["$category", "$$categoryName"] }, { $ne: ["$active", false] }] } } }],
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
  let rows = memory.categories.filter((entry) => !term || entry.name.toLowerCase().includes(term))
  if (status === "active") rows = rows.filter((entry) => entry.active)
  if (status === "inactive") rows = rows.filter((entry) => !entry.active)
  rows = rows.map((entry) => ({ ...entry, productCount: memory.products.filter((product) => product.active !== false && product.category.toLowerCase() === entry.name.toLowerCase()).length }))
  rows.sort((a, b) => req.query.sort === "newest" ? new Date(b.createdAt) - new Date(a.createdAt) : req.query.sort === "oldest" ? new Date(a.createdAt) - new Date(b.createdAt) : req.query.sort === "products" ? b.productCount - a.productCount : a.name.localeCompare(b.name))
  return res.json({ success: true, ...withPagination(rows.slice(skip, skip + limit).map(serialize), rows.length, page, limit) })
})

export const getCategory = asyncHandler(async (req, res) => {
  await ensureTaxonomyRecords()
  if (databaseReady()) {
    if (!isMongoId(req.params.id)) throw new ApiError("Category not found", 404, "CATEGORY_NOT_FOUND")
    const category = await Category.findById(req.params.id).lean()
    if (!category) throw new ApiError("Category not found", 404, "CATEGORY_NOT_FOUND")
    const productCount = await Product.countDocuments({ category: new RegExp(`^${category.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"), active: { $ne: false } })
    return res.json({ success: true, data: serialize({ ...category, productCount }) })
  }
  const category = memory.categories.find((entry) => String(entry._id) === req.params.id)
  if (!category) throw new ApiError("Category not found", 404, "CATEGORY_NOT_FOUND")
  const productCount = memory.products.filter((product) => product.active !== false && product.category.toLowerCase() === category.name.toLowerCase()).length
  return res.json({ success: true, data: serialize({ ...category, productCount }) })
})

export const createCategory = asyncHandler(async (req, res) => {
  const payload = validateBody(req.body)
  if (databaseReady()) {
    const category = await Category.create(payload)
    return res.status(201).json({ success: true, message: "Category created", data: serialize(category) })
  }
  if (memory.categories.some((entry) => entry.name.toLowerCase() === payload.name.toLowerCase() || entry.slug === payload.slug)) throw new ApiError("A category with that name or slug already exists", 409, "DUPLICATE")
  const now = new Date()
  const category = { _id: id("category"), ...payload, active: payload.active ?? true, createdAt: now, updatedAt: now }
  memory.categories.push(category)
  return res.status(201).json({ success: true, message: "Category created", data: serialize(category) })
})

export const updateCategory = asyncHandler(async (req, res) => {
  const payload = validateBody(req.body, true)
  if (!isMongoId(req.params.id) && !memory.categories.some((entry) => String(entry._id) === req.params.id)) throw new ApiError("Category not found", 404, "CATEGORY_NOT_FOUND")
  if (databaseReady()) {
    const category = await Category.findById(req.params.id)
    if (!category) throw new ApiError("Category not found", 404, "CATEGORY_NOT_FOUND")
    const oldName = category.name
    Object.assign(category, payload)
    await category.save()
    if (payload.name && payload.name !== oldName) {
      try {
        await Product.updateMany({ category: oldName }, { $set: { category: payload.name } })
      } catch (error) {
        await Category.updateOne({ _id: category._id }, { $set: { name: oldName } })
        throw error
      }
    }
    return res.json({ success: true, message: "Category updated", data: serialize({ ...category.toObject(), productCount: await Product.countDocuments({ category: payload.name || oldName }) }) })
  }
  const category = memory.categories.find((entry) => String(entry._id) === req.params.id)
  if (!category) throw new ApiError("Category not found", 404, "CATEGORY_NOT_FOUND")
  const oldName = category.name
  Object.assign(category, payload)
  if (payload.name && payload.name !== oldName) memory.products.forEach((product) => { if (product.category === oldName) product.category = payload.name })
  category.updatedAt = new Date()
  return res.json({ success: true, message: "Category updated", data: serialize(category) })
})

export const deleteCategory = asyncHandler(async (req, res) => {
  if (!isMongoId(req.params.id) && !memory.categories.some((entry) => String(entry._id) === req.params.id)) throw new ApiError("Category not found", 404, "CATEGORY_NOT_FOUND")
  if (databaseReady()) {
    const category = await Category.findById(req.params.id)
    if (!category) throw new ApiError("Category not found", 404, "CATEGORY_NOT_FOUND")
    const count = await Product.countDocuments({ category: new RegExp(`^${category.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") })
    if (count) throw new ApiError(`Reassign or delete ${count} product(s) before deleting this category`, 409, "CATEGORY_IN_USE")
    await category.deleteOne()
    return res.json({ success: true, message: "Category deleted", data: { id: req.params.id } })
  }
  const index = memory.categories.findIndex((entry) => String(entry._id) === req.params.id)
  if (index < 0) throw new ApiError("Category not found", 404, "CATEGORY_NOT_FOUND")
  const category = memory.categories[index]
  if (memory.products.some((product) => product.category.toLowerCase() === category.name.toLowerCase())) throw new ApiError("Reassign or delete all products before deleting this category", 409, "CATEGORY_IN_USE")
  memory.categories.splice(index, 1)
  return res.json({ success: true, message: "Category deleted", data: { id: req.params.id } })
})
