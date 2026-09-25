import { Category } from "../models/Category.js"
import { Brand } from "../models/Brand.js"
import { Product } from "../models/Product.js"
import { databaseReady } from "../config/db.js"
import { memory } from "../data/memory.js"
import { slugify } from "../utils/validation.js"

export async function ensureTaxonomyRecords() {
  if (!databaseReady()) return
  const [categoryNames, brandNames] = await Promise.all([Product.distinct("category"), Product.distinct("brand")])
  const categoryOperations = categoryNames.filter(Boolean).map((name) => ({
    updateOne: {
      filter: { name },
      update: { $setOnInsert: { name, slug: slugify(name), active: true, description: `${name} products` } },
      upsert: true,
    },
  }))
  const brandOperations = brandNames.filter(Boolean).map((name) => ({
    updateOne: {
      filter: { name },
      update: { $setOnInsert: { name, slug: slugify(name), active: true, description: `${name} products` } },
      upsert: true,
    },
  }))
  if (categoryOperations.length) await Category.bulkWrite(categoryOperations, { ordered: false })
  if (brandOperations.length) await Brand.bulkWrite(brandOperations, { ordered: false })
}

export const activeCategoryNames = async () => {
  await ensureTaxonomyRecords()
  if (!databaseReady()) {
    const result = new Set(memory.categories.filter((entry) => entry.active).map((entry) => entry.name))
    Object.defineProperty(result, "configured", { value: true })
    return result
  }
  const rows = await Category.find({ active: { $ne: false } }).select("name").lean()
  const result = new Set(rows.map((row) => row.name))
  Object.defineProperty(result, "configured", { value: true })
  return result
}

export const activeBrandNames = async () => {
  await ensureTaxonomyRecords()
  if (!databaseReady()) {
    const result = new Set(memory.brands.filter((entry) => entry.active).map((entry) => entry.name))
    Object.defineProperty(result, "configured", { value: true })
    return result
  }
  const rows = await Brand.find({ active: { $ne: false } }).select("name").lean()
  const result = new Set(rows.map((row) => row.name))
  Object.defineProperty(result, "configured", { value: true })
  return result
}
