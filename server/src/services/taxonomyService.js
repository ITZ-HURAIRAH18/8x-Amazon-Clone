import { Category } from "../models/Category.js"
import { Brand } from "../models/Brand.js"
import { Product } from "../models/Product.js"
import { databaseReady } from "../config/db.js"
import { memory } from "../data/memory.js"
import { slugify } from "../utils/validation.js"

// Syncing taxonomy and reading the active sets used to run four extra database
// round-trips on every request that touched a product (add to cart, product
// detail, wishlist). These values change rarely, so they are cached briefly in
// process and refreshed in the background once the entry expires.
const CACHE_TTL_MS = 60_000
let cache = { categories: null, brands: null, expiresAt: 0 }
let refreshing = null

const attachConfigured = (set) => {
  Object.defineProperty(set, "configured", { value: true })
  return set
}

export function invalidateTaxonomyCache() {
  cache = { categories: null, brands: null, expiresAt: 0 }
}

async function loadSets() {
  if (!databaseReady()) {
    return {
      categories: attachConfigured(new Set(memory.categories.filter((entry) => entry.active).map((entry) => entry.name))),
      brands: attachConfigured(new Set(memory.brands.filter((entry) => entry.active).map((entry) => entry.name))),
    }
  }
  const [categoryRows, brandRows] = await Promise.all([
    Category.find({ active: { $ne: false } }).select("name").lean(),
    Brand.find({ active: { $ne: false } }).select("name").lean(),
  ])
  return {
    categories: attachConfigured(new Set(categoryRows.map((row) => row.name))),
    brands: attachConfigured(new Set(brandRows.map((row) => row.name))),
  }
}

async function refresh() {
  if (!databaseReady()) return
  try {
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
    cache = { categories: null, brands: null, expiresAt: 0 }
  } catch {
    // A failed sync must never break browsing; the next request retries.
  }
}

/**
 * Creates any missing Category/Brand documents for values already used by
 * products. Call this after a catalog write, not on every read.
 */
export async function ensureTaxonomyRecords() {
  if (!databaseReady()) return
  await refresh()
  const sets = await loadSets()
  cache = { categories: sets.categories, brands: sets.brands, expiresAt: Date.now() + CACHE_TTL_MS }
}

async function cachedSets() {
  const now = Date.now()
  if (cache.categories && cache.brands && cache.expiresAt > now) return cache
  if (!refreshing) {
    // Refresh in the background so the current request is never blocked.
    refreshing = refresh().finally(() => { refreshing = null })
  }
  if (cache.categories && cache.brands) return cache
  const sets = await loadSets()
  cache = { categories: sets.categories, brands: sets.brands, expiresAt: now + CACHE_TTL_MS }
  return cache
}

export const activeCategoryNames = async () => (await cachedSets()).categories
export const activeBrandNames = async () => (await cachedSets()).brands
