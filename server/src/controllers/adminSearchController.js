import { Product } from "../models/Product.js"
import { Order } from "../models/Order.js"
import { User } from "../models/User.js"
import { Coupon } from "../models/Coupon.js"
import { Category } from "../models/Category.js"
import { Brand } from "../models/Brand.js"
import { databaseReady } from "../config/db.js"
import { memory } from "../data/memory.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { text } from "../utils/validation.js"
import { ensureTaxonomyRecords } from "../services/taxonomyService.js"

const item = (value) => ({ id: String(value._id || value.id), type: value.type, title: value.title, subtitle: value.subtitle, image: value.image, status: value.status, link: value.link, createdAt: value.createdAt })

export const adminSearch = asyncHandler(async (req, res) => {
  const query = text(req.query.q ?? req.query.search, { required: true, min: 1, max: 100, label: "Search query" })
  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
  if (databaseReady()) {
    await ensureTaxonomyRecords()
    const [products, orders, customers, coupons, categories, brands] = await Promise.all([
      Product.find({ $or: [{ title: regex }, { sku: regex }, { category: regex }, { brand: regex }] }).sort({ updatedAt: -1 }).limit(5).lean(),
      Order.aggregate([
        { $lookup: { from: "users", localField: "user", foreignField: "_id", as: "user" } },
        { $set: { user: { $first: "$user" } } },
        { $match: { $or: [{ orderNumber: regex }, { "user.name": regex }, { "user.email": regex }] } },
        { $sort: { createdAt: -1 } },
        { $limit: 5 },
      ]),
      User.find({ $or: [{ name: regex }, { email: regex }] }).select("name email role status createdAt").sort({ createdAt: -1 }).limit(5).lean(),
      Coupon.find({ $or: [{ code: regex }, { description: regex }] }).select("code description active startsAt expiresAt usageCount createdAt").sort({ expiresAt: 1 }).limit(5).lean(),
      Category.find({ $or: [{ name: regex }, { description: regex }] }).sort({ name: 1 }).limit(5).lean(),
      Brand.find({ $or: [{ name: regex }, { description: regex }] }).sort({ name: 1 }).limit(5).lean(),
    ])
    const [productCount, orderCount, customerCount, couponCount, categoryCount, brandCount] = await Promise.all([
      Product.countDocuments({ $or: [{ title: regex }, { sku: regex }, { category: regex }, { brand: regex }] }),
      Order.aggregate([{ $lookup: { from: "users", localField: "user", foreignField: "_id", as: "user" } }, { $match: { $or: [{ orderNumber: regex }, { "user.name": regex }, { "user.email": regex }] } }, { $count: "total" }]),
      User.countDocuments({ $or: [{ name: regex }, { email: regex }] }),
      Coupon.countDocuments({ $or: [{ code: regex }, { description: regex }] }),
      Category.countDocuments({ $or: [{ name: regex }, { description: regex }] }),
      Brand.countDocuments({ $or: [{ name: regex }, { description: regex }] }),
    ])
    const mapped = {
      products: products.map((value) => item({ ...value, type: "product", title: value.title, subtitle: `${value.sku} · ${value.brand}`, image: value.images?.[0], link: `/admin/products/${value._id}` })),
      orders: orders.map((value) => item({ ...value, type: "order", title: value.orderNumber, subtitle: `${value.user?.name || "Customer"} · $${Number(value.total || 0).toFixed(2)}`, link: `/admin/orders/${value._id}` })),
      customers: customers.map((value) => item({ ...value, type: "customer", title: value.name, subtitle: value.email, link: `/admin/users/${value._id}` })),
      coupons: coupons.map((value) => item({ ...value, type: "coupon", title: value.code, subtitle: value.description, link: "/admin/coupons" })),
      categories: categories.map((value) => item({ ...value, type: "category", title: value.name, subtitle: value.description, link: "/admin/categories" })),
      brands: brands.map((value) => item({ ...value, type: "brand", title: value.name, subtitle: value.description, link: "/admin/brands" })),
    }
    const counts = { products: productCount, orders: orderCount[0]?.total || 0, customers: customerCount, coupons: couponCount, categories: categoryCount, brands: brandCount }
    return res.json({ success: true, data: { query, ...mapped, results: Object.fromEntries(Object.entries(mapped).map(([type, values]) => [type, { items: values, total: counts[type] }])) } })
  }

  const users = new Map(memory.users.map((user) => [String(user._id), user]))
  const term = query.toLowerCase()
  const includes = (...values) => values.join(" ").toLowerCase().includes(term)
  const products = memory.products.filter((value) => includes(value.title, value.sku, value.category, value.brand)).slice(0, 5).map((value) => item({ ...value, type: "product", title: value.title, subtitle: `${value.sku} · ${value.brand}`, image: value.images?.[0], link: `/admin/products/${value._id}` }))
  const allOrders = memory.orders.map((value) => ({ ...value, user: users.get(String(value.user)) }))
  const orders = allOrders.filter((value) => includes(value.orderNumber, value.user?.name, value.user?.email)).slice(0, 5).map((value) => item({ ...value, type: "order", title: value.orderNumber, subtitle: `${value.user?.name || "Customer"} · $${Number(value.total || 0).toFixed(2)}`, link: `/admin/orders/${value._id}` }))
  const customers = memory.users.filter((value) => includes(value.name, value.email)).slice(0, 5).map((value) => item({ ...value, type: "customer", title: value.name, subtitle: value.email, link: `/admin/users/${value._id}` }))
  const coupons = memory.coupons.filter((value) => includes(value.code, value.description)).slice(0, 5).map((value) => item({ ...value, type: "coupon", title: value.code, subtitle: value.description, link: "/admin/coupons" }))
  const categories = memory.categories.filter((value) => includes(value.name, value.description)).slice(0, 5).map((value) => item({ ...value, type: "category", title: value.name, subtitle: value.description, link: "/admin/categories" }))
  const brands = memory.brands.filter((value) => includes(value.name, value.description)).slice(0, 5).map((value) => item({ ...value, type: "brand", title: value.name, subtitle: value.description, link: "/admin/brands" }))
  const mapped = { products, orders, customers, coupons, categories, brands }
  const counts = {
    products: memory.products.filter((value) => includes(value.title, value.sku, value.category, value.brand)).length,
    orders: allOrders.filter((value) => includes(value.orderNumber, value.user?.name, value.user?.email)).length,
    customers: memory.users.filter((value) => includes(value.name, value.email)).length,
    coupons: memory.coupons.filter((value) => includes(value.code, value.description)).length,
    categories: memory.categories.filter((value) => includes(value.name, value.description)).length,
    brands: memory.brands.filter((value) => includes(value.name, value.description)).length,
  }
  return res.json({ success: true, data: { query, ...mapped, results: Object.fromEntries(Object.entries(mapped).map(([type, values]) => [type, { items: values, total: counts[type] }])) } })
})
