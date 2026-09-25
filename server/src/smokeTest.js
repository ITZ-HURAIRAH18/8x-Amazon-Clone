import { connectDatabase, databaseReady, disconnectDatabase } from "./config/db.js"
import { Cart } from "./models/Cart.js"
import { Notification } from "./models/Notification.js"
import { Order } from "./models/Order.js"
import { Product } from "./models/Product.js"
import { Review } from "./models/Review.js"
import { User } from "./models/User.js"
import { Wishlist } from "./models/Wishlist.js"

const baseUrl = (process.env.SMOKE_API_URL || "http://localhost:5000/api").replace(/\/$/, "")
const email = `smoke-${crypto.randomUUID()}@example.test`
const password = "SmokePass123!"
let token = ""
let connected = false

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(`${options.method || "GET"} ${path} failed (${response.status}): ${body.message || "unknown error"}`)
  return body
}

async function cleanup() {
  if (!connected || !databaseReady()) return
  const user = await User.findOne({ email })
  if (!user) return
  const orders = await Order.find({ user: user._id })
  for (const order of orders) {
    for (const item of order.items) await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } })
  }
  await Promise.all([
    Order.deleteMany({ user: user._id }),
    Review.deleteMany({ user: user._id }),
    Cart.deleteMany({ user: user._id }),
    Wishlist.deleteMany({ user: user._id }),
    Notification.deleteMany({ user: user._id }),
    User.deleteOne({ _id: user._id }),
  ])
}

try {
  try { connected = await connectDatabase() } catch { /* API may be using development fallback */ }
  const registration = await api("/auth/register", { method: "POST", body: JSON.stringify({ name: "Smoke Tester", email, password }) })
  token = registration.data.token
  const catalog = await api("/products?search=headphones&sort=price-low&limit=5")
  if (!catalog.data.length) throw new Error("Smoke test could not find a product")
  const product = catalog.data[0]

  // Every category must carry a real range of products, and paging through the
  // whole catalog must not repeat or skip a product.
  const facets = await api("/products/facets")
  const thin = []
  for (const name of facets.data.categories) {
    const scoped = await api(`/products?category=${encodeURIComponent(name)}&limit=1`)
    if (scoped.meta.total < 10) thin.push(`${name}=${scoped.meta.total}`)
  }
  if (thin.length) throw new Error(`Categories with fewer than 10 products: ${thin.join(", ")}`)

  const first = await api("/products?limit=60&page=1&sort=featured")
  const walked = []
  for (let page = 1; page <= first.meta.pages; page += 1) {
    const result = page === 1 ? first : await api(`/products?limit=60&page=${page}&sort=featured`)
    walked.push(...result.data.map((entry) => String(entry.id)))
  }
  if (walked.length !== first.meta.total) throw new Error(`Pagination returned ${walked.length} of ${first.meta.total} products`)
  if (new Set(walked).size !== walked.length) throw new Error("Pagination returned duplicate products across pages")
  await api("/wishlist", { method: "POST", body: JSON.stringify({ productId: product.id }) })
  await api(`/wishlist/${product.id}`, { method: "DELETE" })
  const address = (await api("/addresses", { method: "POST", body: JSON.stringify({ fullName: "Smoke Tester", street: "1 Test Street", city: "New York", state: "NY", postalCode: "10001", isDefault: true }) })).data
  const cart = (await api("/cart", { method: "POST", body: JSON.stringify({ productId: product.id, quantity: 1 }) })).data
  const itemId = cart.items[0].id
  const updated = (await api(`/cart/${itemId}`, { method: "PATCH", body: JSON.stringify({ quantity: 2 }) })).data
  if (updated.items[0].quantity !== 2) throw new Error("Cart quantity did not persist")
  const saved = (await api(`/cart/${itemId}/save-for-later`, { method: "POST" })).data
  if (saved.items.length || saved.savedItems.length !== 1) throw new Error("Save for later did not persist")
  await api(`/cart/saved/${saved.savedItems[0].id}/move-to-cart`, { method: "POST" })
  const subtotal = product.price * 2
  const coupon = await api("/coupons/validate", { method: "POST", body: JSON.stringify({ code: "SAVE10", subtotal }) })
  if (coupon.data.discount <= 0) throw new Error("Coupon did not apply")
  const order = (await api("/orders", { method: "POST", body: JSON.stringify({ addressId: address.id, deliveryMethod: "standard", paymentMethod: "Card", couponCode: "SAVE10", clientRequestId: `smoke-${crypto.randomUUID()}` }) })).data
  if (!order.id || order.status !== "Pending") throw new Error("Order was not created")
  await api(`/products/${product.id}/reviews`, { method: "POST", body: JSON.stringify({ rating: 5, title: "Smoke review", comment: "Verified purchase review." }) })
  const notifications = await api("/notifications")
  if (!notifications.meta.unread) throw new Error("Order notification was not created")
  await api("/auth/me")
  const login = await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) })
  if (!login.data.token) throw new Error("Login persistence check failed")
  token = login.data.token
  console.log(`Smoke test passed: category coverage (${facets.data.categories.length} categories, 10+ products each), pagination, search, wishlist, cart, coupon, order, review, notifications, and login (${order.id})`)
} catch (error) {
  console.error(`Smoke test failed: ${error.message}`)
  process.exitCode = 1
} finally {
  await cleanup()
  if (connected) await disconnectDatabase()
}
