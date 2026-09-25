import { Deal } from "../models/Deal.js"
import { Product } from "../models/Product.js"
import { databaseReady } from "../config/db.js"
import { memory, id } from "../data/memory.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError, boolean, dateValue, enumValue, escapeRegex, httpUrl, idOf, isMongoId, number, objectIdList, pagination, slugify, text, withPagination } from "../utils/validation.js"
import { applyDealProducts, assertNoDealOverlap, calculateDealPrice, dealIsEffective, discountPercent, refreshDealStates, restoreDealProducts } from "../services/dealService.js"
import { createAdminNotification } from "./notificationController.js"

const statusLabels = ["Scheduled", "Active", "Expired", "Inactive", "Ended"]

function effectiveStatus(deal) {
  const now = Date.now()
  if (!deal.active) return "Inactive"
  if (new Date(deal.endsAt).getTime() <= now) return "Expired"
  if (new Date(deal.startsAt).getTime() > now) return "Scheduled"
  return "Active"
}

async function hydrateDeal(deal) {
  if (!deal || typeof deal.toObject !== "function" && deal.products?.some((entry) => entry.product && typeof entry.product === "object")) return deal
  if (databaseReady()) return Deal.findById(deal._id).populate("products.product", "title images sku stock").lean()
  const productMap = new Map(memory.products.map((product) => [String(product._id), product]))
  return { ...(typeof deal.toObject === "function" ? deal.toObject() : deal), products: deal.products.map((entry) => ({ ...entry, product: productMap.get(String(entry.product)) })) }
}

function serialize(deal) {
  const products = (deal.products || []).map((entry) => {
    const product = entry.product && typeof entry.product === "object" ? entry.product : null
    return {
      id: String(product?._id || entry.product),
      title: product?.title || entry.title || "Product",
      image: product?.images?.[0] || entry.image || "",
      sku: product?.sku || entry.sku || "",
      stock: product?.stock ?? entry.stock ?? 0,
      originalPrice: entry.originalPrice,
      dealPrice: entry.dealPrice,
      discount: discountPercent(entry.originalPrice, entry.dealPrice),
    }
  })
  return {
    id: idOf(deal),
    name: deal.name,
    slug: deal.slug,
    description: deal.description || "",
    bannerImage: deal.bannerImage || "",
    discountType: deal.discountType,
    discountValue: deal.discountValue,
    discount: Number(deal.discountValue || 0),
    startsAt: deal.startsAt,
    endsAt: deal.endsAt,
    startAt: deal.startsAt,
    endAt: deal.endsAt,
    stockLimit: deal.stockLimit,
    claimedQuantity: deal.claimedQuantity || 0,
    active: deal.active !== false,
    featured: Boolean(deal.featured),
    status: effectiveStatus(deal),
    products,
    productIds: products.map((product) => product.id),
    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
  }
}

async function loadProducts(ids) {
  if (databaseReady()) {
    const rows = await Product.find({ _id: { $in: ids }, active: { $ne: false } }).lean()
    if (rows.length !== ids.length) throw new ApiError("One or more selected products are unavailable", 400, "PRODUCT_INVALID")
    return rows
  }
  return ids.map((productId) => {
    const product = memory.products.find((entry) => String(entry._id) === productId && entry.active !== false)
    if (!product) throw new ApiError("One or more selected products are unavailable", 400, "PRODUCT_INVALID")
    return product
  })
}

function buildPayload(body, existing = null) {
  const required = (field, fallback) => body[field] !== undefined ? body[field] : existing ? existing[field] : fallback
  const name = text(required("name"), { required: true, min: 3, max: 140, label: "Deal name" })
  const slug = slugify(body.slug || name)
  if (!slug) throw new ApiError("Deal slug could not be generated")
  const description = text(required("description", ""), { max: 1000, label: "Description" })
  const bannerImage = httpUrl(required("bannerImage", ""), { label: "Deal banner" })
  const discountType = enumValue(required("discountType", "percent"), ["percent", "fixed"], { required: true, label: "Discount type" })
  const discountInput = body.discount !== undefined ? body.discount : body.discountPercent !== undefined ? body.discountPercent : required("discountValue")
  const discountValue = number(discountInput, { required: true, min: discountType === "percent" ? 0.01 : 0.01, max: discountType === "percent" ? 90 : 10_000_000, label: "Discount" })
  const startsAt = dateValue(body.startsAt ?? body.startAt ?? required("startsAt", new Date()), { required: true, label: "Start date" })
  const endsAt = dateValue(body.endsAt ?? body.endAt ?? required("endsAt"), { required: true, label: "End date" })
  if (endsAt <= startsAt) throw new ApiError("Deal end date must be after its start date")
  const stockLimitRaw = required("stockLimit", null)
  const stockLimit = stockLimitRaw == null || stockLimitRaw === "" ? null : number(stockLimitRaw, { min: 1, max: 10_000_000, integer: true, label: "Stock limit" })
  return {
    name,
    slug,
    description,
    bannerImage,
    discountType,
    discountValue,
    startsAt,
    endsAt,
    stockLimit,
    active: boolean(body.active, existing?.active ?? true),
    featured: boolean(body.featured, existing?.featured ?? false),
  }
}

function selectedProductIds(value, { required = false } = {}) {
  if (databaseReady()) return objectIdList(value, { required, max: 100, label: "Deal products" })
  if (!Array.isArray(value)) {
    if (required) throw new ApiError("Deal products must be an array")
    return []
  }
  const ids = [...new Set(value.map(String))]
  if (required && !ids.length) throw new ApiError("Select at least one product")
  if (ids.length > 100) throw new ApiError("A deal cannot contain more than 100 products")
  return ids
}

function snapshotsFor(payload, productIds, products, existingSnapshots = []) {
  return products.map((product) => {
    const previous = existingSnapshots.find((entry) => String(entry.product) === String(product._id))
    const originalPrice = previous?.originalPrice ?? Number(product.originalPrice ?? product.price)
    return {
      product: product._id,
      originalPrice,
      dealPrice: calculateDealPrice(originalPrice, payload.discountType, payload.discountValue),
      previousPrice: previous?.previousPrice ?? Number(product.price),
      previousDiscount: previous?.previousDiscount ?? Number(product.discount || 0),
      previousDeal: previous?.previousDeal ?? Boolean(product.deal),
      previousDealEndsAt: previous?.previousDealEndsAt ?? product.dealEndsAt ?? null,
    }
  })
}

export const listDeals = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query, { defaultLimit: 20 })
  await refreshDealStates()
  const search = text(req.query.search || req.query.q, { max: 120, label: "Search" })
  const activeFilter = req.query.active
  if (activeFilter !== undefined && !["true", "false", "all"].includes(String(activeFilter))) throw new ApiError("Invalid deal active filter")
  const filter = {}
  if (search) filter.name = new RegExp(escapeRegex(search), "i")
  if (activeFilter === "true") filter.active = true
  if (activeFilter === "false") filter.active = false
  if (databaseReady()) {
    const [rows, total] = await Promise.all([Deal.find(filter).populate("products.product", "title images sku stock").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(), Deal.countDocuments(filter)])
    return res.json({ success: true, ...withPagination(rows.map(serialize), total, page, limit) })
  }
  const term = search.toLowerCase()
  const rows = memory.deals.filter((deal) => (!term || deal.name.toLowerCase().includes(term)) && (activeFilter === undefined || activeFilter === "all" || String(deal.active) === activeFilter)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const productMap = new Map(memory.products.map((product) => [String(product._id), product]))
  const hydrated = rows.map((deal) => ({ ...deal, products: deal.products.map((entry) => ({ ...entry, product: productMap.get(String(entry.product)) })) }))
  return res.json({ success: true, ...withPagination(hydrated.slice(skip, skip + limit).map(serialize), rows.length, page, limit) })
})

export const getDeal = asyncHandler(async (req, res) => {
  await refreshDealStates()
  const deal = databaseReady()
    ? await Deal.findById(req.params.id).populate("products.product", "title images sku stock").lean()
    : (() => { const value = memory.deals.find((entry) => String(entry._id) === req.params.id); if (!value) return null; return { ...value, products: value.products.map((entry) => ({ ...entry, product: memory.products.find((product) => String(product._id) === String(entry.product)) })) } })()
  if (!deal) throw new ApiError("Deal not found", 404, "DEAL_NOT_FOUND")
  return res.json({ success: true, data: serialize(deal) })
})

export const createDeal = asyncHandler(async (req, res) => {
  const payload = buildPayload(req.body)
  if (!databaseReady() && memory.deals.some((entry) => entry.name.toLowerCase() === payload.name.toLowerCase() || entry.slug === payload.slug)) throw new ApiError("A deal with that name or slug already exists", 409, "DUPLICATE")
  const productIds = selectedProductIds(req.body.productIds ?? req.body.products, { required: true })
  const products = await loadProducts(productIds)
  await assertNoDealOverlap(productIds, null, payload.startsAt, payload.endsAt)
  const productsPayload = snapshotsFor(payload, productIds, products)
  let deal
  if (databaseReady()) deal = await Deal.create({ ...payload, products: productsPayload })
  else {
    const now = new Date()
    deal = { _id: id("deal"), ...payload, products: productsPayload, claimedQuantity: 0, createdAt: now, updatedAt: now }
    memory.deals.push(deal)
  }
  if (dealIsEffective(deal)) await applyDealProducts(deal)
  if (new Date(deal.endsAt) - Date.now() <= 7 * 86400000) await createAdminNotification({ type: "admin-deal", title: "Deal ending soon", message: `Deal ${deal.name} is ending soon.`, link: "/admin/deals", metadata: { dealId: String(deal._id), endsAt: deal.endsAt } }, { dedupeKey: `deal-expiry:${deal._id}` })
  return res.status(201).json({ success: true, message: "Deal created", data: serialize(await hydrateDeal(deal)) })
})

export const updateDeal = asyncHandler(async (req, res) => {
  const existing = databaseReady() ? await Deal.findById(req.params.id) : memory.deals.find((entry) => String(entry._id) === req.params.id)
  if (!existing) throw new ApiError("Deal not found", 404, "DEAL_NOT_FOUND")
  const oldValue = typeof existing.toObject === "function" ? existing.toObject() : { ...existing, products: existing.products.map((entry) => ({ ...entry })) }
  const payload = buildPayload(req.body, existing)
  if (!databaseReady() && memory.deals.some((entry) => String(entry._id) !== String(existing._id) && (entry.name.toLowerCase() === payload.name.toLowerCase() || entry.slug === payload.slug))) throw new ApiError("A deal with that name or slug already exists", 409, "DUPLICATE")
  const productIds = req.body.productIds !== undefined || req.body.products !== undefined
    ? selectedProductIds(req.body.productIds ?? req.body.products, { required: true })
    : oldValue.products.map((entry) => String(entry.product))
  const products = await loadProducts(productIds)
  const oldProductIds = oldValue.products.map((entry) => String(entry.product))
  if (Number(oldValue.claimedQuantity || 0) > 0 && (payload.active === false || productIds.length !== oldProductIds.length || productIds.some((productId) => !oldProductIds.includes(String(productId))))) throw new ApiError("Deals with claimed stock cannot be deactivated or have products removed", 409, "DEAL_HAS_CLAIMED_STOCK")
  await assertNoDealOverlap(productIds, existing._id, payload.startsAt, payload.endsAt)
  const productsPayload = snapshotsFor(payload, productIds, products, oldValue.products)
  await restoreDealProducts(oldValue)
  let deal
  try {
    if (databaseReady()) {
      Object.assign(existing, payload, { products: productsPayload })
      await existing.save()
      deal = existing
    } else {
      Object.assign(existing, payload, { products: productsPayload, updatedAt: new Date() })
      deal = existing
    }
    if (dealIsEffective(deal)) await applyDealProducts(deal)
  } catch (error) {
    if (databaseReady()) {
      const { _id, ...oldFields } = oldValue
      await Deal.findByIdAndUpdate(_id, { $set: oldFields })
      await applyDealProducts(oldValue)
    } else {
      Object.assign(existing, oldValue, { products: oldValue.products.map((entry) => ({ ...entry })), updatedAt: new Date() })
      if (dealIsEffective(existing)) await applyDealProducts(existing)
    }
    throw error
  }
  return res.json({ success: true, message: "Deal updated", data: serialize(await hydrateDeal(deal)) })
})

export const deleteDeal = asyncHandler(async (req, res) => {
  const deal = databaseReady() ? await Deal.findById(req.params.id) : memory.deals.find((entry) => String(entry._id) === req.params.id)
  if (!deal) throw new ApiError("Deal not found", 404, "DEAL_NOT_FOUND")
  if (Number(deal.claimedQuantity || 0) > 0) throw new ApiError("Deals with claimed stock cannot be deleted", 409, "DEAL_HAS_CLAIMED_STOCK")
  await restoreDealProducts(deal)
  if (databaseReady()) await Deal.deleteOne({ _id: deal._id })
  if (!databaseReady()) {
    const index = memory.deals.findIndex((entry) => String(entry._id) === req.params.id)
    memory.deals.splice(index, 1)
  }
  return res.json({ success: true, message: "Deal deleted", data: { id: req.params.id } })
})
