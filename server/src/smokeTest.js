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
  console.log(`Smoke test passed: search, wishlist, cart, coupon, order, review, and notifications (${order.id})`)
} catch (error) {
  console.error(`Smoke test failed: ${error.message}`)
  process.exitCode = 1
} finally {
  await cleanup()
  if (connected) await disconnectDatabase()
}
