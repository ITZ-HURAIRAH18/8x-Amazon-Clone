import { Deal } from "../models/Deal.js"
import { Product } from "../models/Product.js"
import { databaseReady } from "../config/db.js"
import { memory } from "../data/memory.js"

export const money = (value) => Math.round(Number(value || 0) * 100) / 100

export function calculateDealPrice(originalPrice, discountType, discountValue) {
  const original = money(originalPrice)
  if (discountType === "fixed") return money(Math.max(0, original - Number(discountValue || 0)))
  return money(original * (1 - Number(discountValue || 0) / 100))
}

export function discountPercent(originalPrice, dealPrice) {
  const original = Number(originalPrice || 0)
  if (original <= 0) return 0
  return Math.max(0, Math.min(100, Math.round((1 - Number(dealPrice || 0) / original) * 100)))
}

export const dealIsEffective = (deal, now = new Date()) => Boolean(
  deal
  && deal.active
  && new Date(deal.startsAt).getTime() <= now.getTime()
  && new Date(deal.endsAt).getTime() > now.getTime(),
)

const plainDeal = (deal) => (typeof deal?.toObject === "function" ? deal.toObject() : deal)

export async function assertNoDealOverlap(productIds, excludedDealId = null, startsAt, endsAt) {
  if (!databaseReady()) {
    const ids = new Set(productIds.map(String))
    const overlap = memory.deals.find((deal) => String(deal._id) !== String(excludedDealId || "") && dealIsEffective(deal) && new Date(deal.startsAt) < new Date(endsAt) && new Date(deal.endsAt) > new Date(startsAt) && deal.products.some((entry) => ids.has(String(entry.product))))
    if (overlap) {
      const error = new Error("One or more products already belong to an overlapping active deal")
      error.statusCode = 409
      error.code = "DEAL_OVERLAP"
      throw error
    }
    return
  }
  const overlap = await Deal.exists({
    _id: { $ne: excludedDealId },
    active: true,
    startsAt: { $lt: endsAt },
    endsAt: { $gt: startsAt },
    "products.product": { $in: productIds },
  })
  if (overlap) {
    const error = new Error("One or more products already belong to an overlapping active deal")
    error.statusCode = 409
    error.code = "DEAL_OVERLAP"
    throw error
  }
}

async function productHasOtherDeal(productId, excludedDealId) {
  if (!databaseReady()) {
    return memory.deals.some((deal) => String(deal._id) !== String(excludedDealId || "") && dealIsEffective(deal) && deal.products.some((entry) => String(entry.product) === String(productId)))
  }
  return Boolean(await Deal.exists({
    _id: { $ne: excludedDealId },
    active: true,
    startsAt: { $lte: new Date() },
    endsAt: { $gt: new Date() },
    "products.product": productId,
  }))
}

export async function restoreDealProducts(deal) {
  if (!deal) return
  const value = plainDeal(deal)
  const snapshots = value.products || []
  if (databaseReady()) {
    await Promise.all(snapshots.map(async (snapshot) => {
      if (await productHasOtherDeal(snapshot.product, value._id)) return
      await Product.findByIdAndUpdate(snapshot.product, {
        $set: {
          price: snapshot.previousPrice ?? snapshot.originalPrice,
          originalPrice: snapshot.originalPrice,
          discount: snapshot.previousDiscount ?? discountPercent(snapshot.originalPrice, snapshot.originalPrice),
          deal: snapshot.previousDeal ?? false,
          dealEndsAt: snapshot.previousDealEndsAt ?? null,
        },
      })
    }))
    await Deal.updateOne({ _id: value._id }, { $set: { claimedQuantity: 0 } })
    return
  }
  for (const snapshot of snapshots) {
    if (await productHasOtherDeal(snapshot.product, value._id)) continue
    const product = memory.products.find((entry) => String(entry._id) === String(snapshot.product))
    if (!product) continue
    product.price = snapshot.previousPrice ?? snapshot.originalPrice
    product.originalPrice = snapshot.originalPrice
    product.discount = snapshot.previousDiscount ?? 0
    product.deal = snapshot.previousDeal ?? false
    product.dealEndsAt = snapshot.previousDealEndsAt ?? null
  }
  const memoryDeal = databaseReady() ? null : memory.deals.find((entry) => String(entry._id) === String(value._id))
  if (memoryDeal) memoryDeal.claimedQuantity = 0
}

export async function applyDealProducts(deal) {
  if (!deal) return
  const value = plainDeal(deal)
  const productIds = value.products.map((entry) => entry.product)
  if (!productIds.length) return
  if (databaseReady()) {
    const products = await Product.find({ _id: { $in: productIds }, active: { $ne: false } }).lean()
    if (products.length !== productIds.length) {
      const error = new Error("One or more deal products are unavailable")
      error.statusCode = 409
      error.code = "PRODUCT_UNAVAILABLE"
      throw error
    }
    const byId = new Map(products.map((product) => [String(product._id), product]))
    await Promise.all(products.map((product) => {
      const snapshot = value.products.find((entry) => String(entry.product) === String(product._id))
      const originalPrice = snapshot.originalPrice ?? product.originalPrice ?? product.price
      const dealPrice = calculateDealPrice(originalPrice, value.discountType, value.discountValue)
      return Product.findByIdAndUpdate(product._id, {
        $set: {
          price: dealPrice,
          originalPrice,
          discount: discountPercent(originalPrice, dealPrice),
          deal: true,
          dealEndsAt: value.endsAt,
          badge: "Limited time deal",
        },
      })
    }))
    if (byId.size !== productIds.length) {
      const error = new Error("One or more deal products are unavailable")
      error.statusCode = 409
      error.code = "PRODUCT_UNAVAILABLE"
      throw error
    }
    return
  }
  for (const entry of value.products) {
    const product = memory.products.find((candidate) => String(candidate._id) === String(entry.product))
    if (!product || product.active === false) continue
    product.price = calculateDealPrice(entry.originalPrice, value.discountType, value.discountValue)
    product.originalPrice = entry.originalPrice
    product.discount = discountPercent(entry.originalPrice, product.price)
    product.deal = true
    product.dealEndsAt = value.endsAt
    product.badge = "Limited time deal"
  }
}

export async function reserveDealStock(items = []) {
  const now = new Date()
  const reservations = []
  for (const item of items) {
    const quantity = Number(item.quantity || 0)
    if (quantity < 1) continue
    if (databaseReady()) {
      const deal = await Deal.findOne({ active: true, startsAt: { $lte: now }, endsAt: { $gt: now }, "products.product": item.product }).lean()
      if (!deal) continue
      const updated = await Deal.findOneAndUpdate(
        {
          _id: deal._id,
          active: true,
          startsAt: { $lte: now },
          endsAt: { $gt: now },
          $or: [
            { stockLimit: null },
            { stockLimit: { $exists: false } },
            { $expr: { $lte: [{ $add: [{ $ifNull: ["$claimedQuantity", 0] }, quantity] }, "$stockLimit"] } },
          ],
        },
        { $inc: { claimedQuantity: quantity } },
        { new: true },
      )
      if (!updated) {
        await releaseDealStock(reservations)
        const error = new Error(`The deal for ${item.title || "a product"} has reached its stock limit`)
        error.statusCode = 409
        error.code = "DEAL_STOCK_LIMIT"
        throw error
      }
      reservations.push({ dealId: deal._id, product: item.product, quantity })
    } else {
      const deal = memory.deals.find((entry) => dealIsEffective(entry, now) && entry.products.some((product) => String(product.product) === String(item.product)))
      if (!deal) continue
      if (deal.stockLimit != null && Number(deal.claimedQuantity || 0) + quantity > Number(deal.stockLimit)) {
        await releaseDealStock(reservations)
        const error = new Error(`The deal for ${item.title || "a product"} has reached its stock limit`)
        error.statusCode = 409
        error.code = "DEAL_STOCK_LIMIT"
        throw error
      }
      deal.claimedQuantity = Number(deal.claimedQuantity || 0) + quantity
      reservations.push({ dealId: deal._id, product: item.product, quantity })
    }
  }
  return reservations
}

export async function releaseDealStock(reservations = []) {
  for (const reservation of reservations) {
    if (databaseReady()) await Deal.updateOne({ _id: reservation.dealId, claimedQuantity: { $gte: reservation.quantity } }, { $inc: { claimedQuantity: -reservation.quantity } })
    else {
      const deal = memory.deals.find((entry) => String(entry._id) === String(reservation.dealId))
      if (deal) deal.claimedQuantity = Math.max(0, Number(deal.claimedQuantity || 0) - reservation.quantity)
    }
  }
}

export async function refreshDealStates() {
  const now = new Date()
  if (databaseReady()) {
    const deals = await Deal.find({
      active: true,
      $or: [{ startsAt: { $lte: now } }, { endsAt: { $lte: now } }],
    }).lean()
    for (const value of deals) {
      if (dealIsEffective(value, now)) await applyDealProducts(value)
      else {
        await restoreDealProducts(value)
        await Deal.updateOne({ _id: value._id, active: true }, { $set: { active: false } })
      }
    }
    return
  }
  for (const value of memory.deals) {
    if (!value.active) continue
    if (dealIsEffective(value, now)) await applyDealProducts(value)
    else {
      await restoreDealProducts(value)
      value.active = false
    }
  }
}
