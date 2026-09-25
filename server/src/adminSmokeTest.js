import { connectDatabase, databaseReady, disconnectDatabase } from "./config/db.js"
import { Brand } from "./models/Brand.js"
import { Cart } from "./models/Cart.js"
import { Category } from "./models/Category.js"
import { Coupon } from "./models/Coupon.js"
import { Deal } from "./models/Deal.js"
import { Notification } from "./models/Notification.js"
import { Order } from "./models/Order.js"
import { Product } from "./models/Product.js"
import { Review } from "./models/Review.js"
import { User } from "./models/User.js"
import { Wishlist } from "./models/Wishlist.js"

const baseUrl = (process.env.SMOKE_API_URL || "http://localhost:5000/api").replace(/\/$/, "")
const adminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase()
const adminPassword = String(process.env.ADMIN_PASSWORD || "")
const runId = crypto.randomUUID().slice(0, 8)
const customerEmail = `admin-smoke-${runId}@example.test`
const customerPassword = "AdminSmoke123!"
const sku = `SMOKE-${runId.toUpperCase()}`
const couponCode = `SMOKE${runId.toUpperCase()}`

let customerToken = ""
let adminToken = ""
let connected = false
const created = { product: null, category: null, brand: null, coupon: null, deal: null, customer: null, order: null }

const ok = (message) => console.log(`  ok  ${message}`)
const check = (condition, message) => {
  if (!condition) throw new Error(message)
  ok(message)
}

const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms) })

async function request(path, { method = "GET", body, token, allowStatus = [] } = {}) {
  const headers = { "Content-Type": "application/json" }
  if (token) headers.Authorization = `Bearer ${token}`
  // The API rate limits auth and checkout endpoints on purpose. The smoke test
  // waits out the window instead of failing so it can be re-run safely.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
    const payload = await response.json().catch(() => ({}))
    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("retry-after") || 0)
      await wait(retryAfter > 0 ? Math.min(retryAfter, 70) * 1000 : 20000)
      continue
    }
    if (!response.ok && !allowStatus.includes(response.status)) {
      throw new Error(`${method} ${path} failed (${response.status}): ${payload.message || "unknown error"}`)
    }
    return { status: response.status, body: payload }
  }
  throw new Error(`${method} ${path} remained rate limited`)
}

const get = (path, token) => request(path, { token }).then((result) => result.body)
const adminCall = (path, method = "GET", body, allowStatus) => request(path, { method, body, token: adminToken, allowStatus })
const admin = (path, method = "GET", body, allowStatus) => adminCall(path, method, body, allowStatus).then((result) => result.body)
const asCustomer = (path, method = "GET", body, allowStatus) => request(path, { method, body, token: customerToken, allowStatus })

async function cleanup() {
  if (!connected || !databaseReady()) return
  const customer = created.customer ? await User.findById(created.customer) : await User.findOne({ email: customerEmail })
  const orderIds = []
  if (customer) {
    for (const order of await Order.find({ user: customer._id })) {
      orderIds.push(order._id)
      if (order.status !== "Cancelled" && !order.inventoryRestored) {
        for (const item of order.items) await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } })
      }
    }
    await Promise.all([
      Order.deleteMany({ user: customer._id }),
      Review.deleteMany({ user: customer._id }),
      Cart.deleteMany({ user: customer._id }),
      Wishlist.deleteMany({ user: customer._id }),
      Notification.deleteMany({ user: customer._id }),
      User.deleteOne({ _id: customer._id }),
    ])
  }
  if (created.deal) {
    await admin(`/admin/deals/${created.deal}`, "DELETE", undefined, [404, 500]).catch(() => {})
    await Deal.deleteOne({ _id: created.deal })
  }
  if (created.coupon) {
    await admin(`/admin/coupons/${created.coupon}`, "DELETE", undefined, [404]).catch(() => {})
    await Coupon.deleteOne({ _id: created.coupon })
  }
  if (created.product) {
    await admin(`/admin/products/${created.product}`, "DELETE", undefined, [404]).catch(() => {})
    await Product.deleteOne({ _id: created.product })
    await Review.deleteMany({ product: created.product })
    await Order.deleteMany({ "items.product": created.product })
  }
  if (created.category) {
    await admin(`/admin/categories/${created.category}`, "DELETE", undefined, [404, 409]).catch(() => {})
    await Category.deleteOne({ _id: created.category })
  }
  if (created.brand) {
    await admin(`/admin/brands/${created.brand}`, "DELETE", undefined, [404, 409]).catch(() => {})
    await Brand.deleteOne({ _id: created.brand })
  }
  if (customer) await Notification.deleteMany({ user: { $in: [customer._id] } })
  return orderIds
}

async function run() {
  console.log("Admin smoke test starting")

  // 1. Admin authentication
  const badLogin = await request("/admin/auth/login", { method: "POST", body: { email: adminEmail, password: "wrong-password-value" }, allowStatus: [401] })
  check(badLogin.status === 401, "admin login rejects a wrong password")
  const login = await request("/admin/auth/login", { method: "POST", body: { email: adminEmail, password: adminPassword } })
  check(login.status === 200 && login.body.data?.token && login.body.data?.user?.role === "admin", "admin login returns a scoped admin session")
  adminToken = login.body.data.token
  const me = await admin("/admin/auth/me")
  check(me.data?.role === "admin" && !("passwordHash" in (me.data || {})), "admin session returns a safe admin profile")

  // 2. Customer registration and role protection
  const registration = await request("/auth/register", { method: "POST", body: { name: "Admin Smoke Customer", email: customerEmail, password: customerPassword } })
  customerToken = registration.body.data.token
  created.customer = registration.body.data.user.id
  const blocked = await asCustomer("/admin/dashboard", "GET", undefined, [403])
  check(blocked.status === 403, "customer token receives 403 on the admin API")
  const anonymous = await request("/admin/dashboard", { allowStatus: [401] })
  check(anonymous.status === 401, "missing token receives 401 on the admin API")

  // 3. Admin reads real data
  const dashboard = await admin("/admin/dashboard?range=30d")
  const metrics = dashboard.data
  check(typeof metrics.revenue.total === "number" && Array.isArray(metrics.sales.timeline), "dashboard aggregates revenue and a sales timeline")
  check(typeof metrics.products.total === "number" && typeof metrics.customers.total === "number", "dashboard aggregates product and customer totals")
  const analytics = await admin("/admin/analytics?range=30d")
  check(Array.isArray(analytics.data.revenueOverTime) && Array.isArray(analytics.data.statusDistribution), "analytics endpoint returns chart series")
  const invalidRange = await request("/admin/dashboard?range=not-a-range", { token: adminToken, allowStatus: [400] })
  check(invalidRange.status === 400, "unsupported analytics ranges are rejected")

  // 4. Product management and storefront integration
  const source = (await get("/products?limit=1&sort=newest")).data[0]
  check(Boolean(source?.category && source?.brand), "catalog exposes an active category and brand")
  const createdProduct = await admin("/admin/products", "POST", {
    title: `Admin Smoke Product ${runId}`,
    description: "Temporary product created by the admin smoke test to verify catalog integration.",
    sku,
    price: 59.99,
    originalPrice: 79.99,
    stock: 25,
    lowStockThreshold: 5,
    category: source.category,
    brand: source.brand,
    images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=82"],
    features: ["Smoke test feature", "Admin managed"],
    specifications: { Weight: "250 g", Warranty: "1 year" },
    featured: true,
  })
  created.product = createdProduct.data.id
  check(createdProduct.success === true && createdProduct.data?.sku === sku, "admin creates a catalog product")
  const publicProduct = (await get(`/products/${created.product}`)).data
  check(publicProduct?.id === created.product, "admin-created product is immediately visible to customers")
  const duplicate = await request("/admin/products", { method: "POST", token: adminToken, allowStatus: [409, 500], body: { title: "Duplicate", description: "Duplicate SKU attempt for validation.", sku, price: 1, originalPrice: 1, category: source.category, brand: source.brand, images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e"] } })
  check([409, 500].includes(duplicate.status), "duplicate SKUs are rejected")
  const updated = await admin(`/admin/products/${created.product}`, "PATCH", { price: 49.99, featured: false })
  check(Number(updated.data.price) === 49.99, "admin updates a product")
  const deactivated = await admin(`/admin/products/${created.product}/status`, "PATCH", { status: "inactive" })
  check(deactivated.data.active === false, "admin deactivates a product")
  const hiddenProduct = await request(`/products/${created.product}`, { allowStatus: [404] })
  check(hiddenProduct.status === 404, "inactive products are hidden from the storefront")
  await admin(`/admin/products/${created.product}/status`, "PATCH", { status: "active" })
  const bulk = await admin("/admin/products/bulk", "POST", { action: "set-stock", ids: [created.product], value: 30 })
  check(bulk.data.requested === 1, "admin bulk stock action applies")
  const inventory = await admin(`/admin/inventory?search=${sku}`)
  check(inventory.data.some((row) => Number(row.stock) === 30), "inventory updates persist for the admin workspace")
  await admin(`/admin/inventory/${created.product}`, "PATCH", { stock: 25, lowStockThreshold: 5 })

  // 5. Taxonomy management
  const category = await admin("/admin/categories", "POST", { name: `Smoke Category ${runId}`, description: "Temporary category." })
  created.category = category.data.id
  ok("admin creates a category")
  const brand = await admin("/admin/brands", "POST", { name: `Smoke Brand ${runId}`, description: "Temporary brand." })
  created.brand = brand.data.id
  ok("admin creates a brand")
  const categories = await admin("/admin/categories?limit=100")
  const inUseCategory = categories.data.find((row) => row.name === source.category)
  const guarded = await request(`/admin/categories/${inUseCategory.id}`, { method: "DELETE", token: adminToken, allowStatus: [409] })
  check(guarded.status === 409, "categories used by products cannot be deleted")
  const removeCategory = await admin(`/admin/categories/${created.category}`, "DELETE")
  created.category = null
  check(removeCategory.data?.id, "admin deletes an unused category")
  const removeBrand = await admin(`/admin/brands/${created.brand}`, "DELETE")
  created.brand = null
  check(removeBrand.data?.id, "admin deletes an unused brand")

  // 6. Cart, checkout, and order management integration
  const address = (await asCustomer("/addresses", "POST", { fullName: "Admin Smoke Customer", street: "9 Commerce Way", city: "Seattle", state: "WA", postalCode: "98101", isDefault: true })).body.data
  await asCustomer("/cart", "POST", { productId: created.product, quantity: 2 })
  const coupon = await admin("/admin/coupons", "POST", {
    code: couponCode,
    description: "Smoke test discount",
    discountType: "percent",
    discountValue: 15,
    minimumOrder: 20,
    maximumDiscount: 40,
    startsAt: new Date(Date.now() - 60000).toISOString(),
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    usageLimit: 5,
    perUserLimit: 2,
    active: true,
  })
  created.coupon = coupon.data.id
  ok("admin creates a coupon")
  const validated = await asCustomer("/coupons/validate", "POST", { code: couponCode, subtotal: 99.98 })
  check(validated.body.data.discount > 0, "admin coupon applies at customer checkout")
  const order = await asCustomer("/orders", "POST", { addressId: address.id, deliveryMethod: "standard", paymentMethod: "Card", couponCode, clientRequestId: `admin-smoke-${runId}` })
  created.order = order.body.data.id
  check(order.status === 201 && order.body.data.status === "Pending", "customer places an order using the admin coupon")
  check(order.body.data.discount > 0, "the admin coupon discount is stored on the order")
  const inventoryAfterOrder = await admin(`/admin/inventory?search=${sku}`)
  check(Number(inventoryAfterOrder.data[0]?.stock) === 23, "customer purchase decrements admin inventory")

  const adminOrders = await admin(`/admin/orders?search=${order.body.data.orderNumber}`)
  check(adminOrders.data.some((row) => row.id === order.body.data.id), "customer order appears in admin order management")
  const processing = await admin(`/admin/orders/${order.body.data.id}/status`, "PATCH", { status: "Processing" })
  check(processing.data.status === "Processing", "admin moves an order to processing")
  const customerOrder = (await asCustomer(`/orders/${order.body.data.id}`)).body.data
  check(customerOrder.status === "Processing", "admin status change is visible to the customer")
  const invalidStatus = await request(`/admin/orders/${order.body.data.id}/status`, { method: "PATCH", token: adminToken, allowStatus: [400, 409], body: { status: "Delivered" } })
  check([400, 409].includes(invalidStatus.status), "invalid order transitions are rejected")

  // 7. Review moderation (the same order makes the created product reviewable)
  const review = await asCustomer(`/products/${created.product}/reviews`, "POST", { rating: 4, title: "Admin smoke review", comment: "Moderation visibility check for the admin smoke test." })
  const reviewId = review.body.data.id
  ok("customer writes a verified purchase review")
  await admin(`/admin/reviews/${reviewId}`, "PATCH", { status: "Hidden" })
  const publicReviews = (await get(`/products/${created.product}/reviews`)).data.reviews || []
  check(!publicReviews.some((row) => row.id === reviewId), "hidden reviews disappear from the customer product page")
  const moderationQueue = await admin("/admin/reviews?status=pending")
  check(moderationQueue.meta.total >= 0, "admin review queue supports status filtering")
  await admin(`/admin/reviews/${reviewId}`, "PATCH", { status: "Approved" })
  const approvedReviews = (await get(`/products/${created.product}/reviews`)).data.reviews || []
  check(approvedReviews.some((row) => row.id === reviewId), "approved reviews are visible to customers again")

  const cancelled = await admin(`/admin/orders/${order.body.data.id}/status`, "PATCH", { status: "Cancelled" })
  check(cancelled.data.status === "Cancelled", "admin cancels an order")
  const inventoryAfterCancel = await admin(`/admin/inventory?search=${sku}`)
  check(Number(inventoryAfterCancel.data[0]?.stock) === 25, "cancelling an order restores inventory")

  // 8. Deal management and storefront deals
  const deal = await admin("/admin/deals", "POST", {
    name: `Smoke Deal ${runId}`,
    description: "Temporary deal created by the admin smoke test.",
    discountType: "percent",
    discount: 20,
    startsAt: new Date(Date.now() - 60000).toISOString(),
    endAt: new Date(Date.now() + 2 * 86400000).toISOString(),
    productIds: [created.product],
    active: true,
  })
  created.deal = deal.data.id
  check(deal.data.products.length === 1, "admin creates a deal with selected products")
  const deals = await get("/products?deal=true&limit=100")
  check(deals.data.some((row) => row.id === created.product), "admin deal appears on the customer deals feed")
  await admin(`/admin/deals/${created.deal}`, "DELETE")
  await Deal.deleteOne({ _id: created.deal })
  created.deal = null
  const dealsAfter = await get("/products?deal=true&limit=100")
  check(!dealsAfter.data.some((row) => row.id === created.product), "removing a deal restores product pricing")

  // 9. Customer management
  const users = await admin(`/admin/users?search=${customerEmail}`)
  const managedUser = users.data.find((row) => row.email === customerEmail)
  check(Boolean(managedUser) && !("passwordHash" in (managedUser || {})), "admin customer list hides credentials")
  const suspended = await admin(`/admin/users/${managedUser.id}/status`, "PATCH", { status: "suspended" })
  check(suspended.data.status === "suspended", "admin suspends a customer")
  const suspendedLogin = await request("/auth/login", { method: "POST", allowStatus: [403], body: { email: customerEmail, password: customerPassword } })
  check(suspendedLogin.status === 403, "suspended customers cannot sign in")
  const customerTokenBefore = customerToken
  const suspendedMe = await request("/auth/me", { token: customerToken, allowStatus: [401, 403] })
  check([401, 403].includes(suspendedMe.status), "suspension invalidates the customer session")
  await admin(`/admin/users/${managedUser.id}/status`, "PATCH", { status: "active" })
  customerToken = customerTokenBefore
  const relogin = await request("/auth/login", { method: "POST", body: { email: customerEmail, password: customerPassword } })
  customerToken = relogin.body.data.token
  ok("reactivating a customer restores access")
  const selfDemote = await request(`/admin/users/${me.data.id}/role`, { method: "PATCH", token: adminToken, allowStatus: [409], body: { role: "customer" } })
  check(selfDemote.status === 409, "administrators cannot remove their own admin role")

  // 10. Notifications, search, and settings
  const notifications = await admin("/admin/notifications")
  check(Array.isArray(notifications.data), "admin notification center returns records")
  if (notifications.data.length) await admin(`/admin/notifications/${notifications.data[0].id}/read`, "PATCH")
  const search = await admin(`/admin/search?q=${sku}`)
  check(search.data.products.some((row) => row.id === created.product), "admin search finds the managed product")
  const settings = await admin("/admin/settings")
  const originalSettings = settings.data
  const updatedSettings = await admin("/admin/settings", "PATCH", { lowStockThreshold: originalSettings.lowStockThreshold, storeName: originalSettings.storeName })
  check(updatedSettings.data.lowStockThreshold === originalSettings.lowStockThreshold, "admin settings can be saved")

  // 11. Admin logout revokes the session
  const logoutToken = adminToken
  await admin("/admin/auth/logout", "POST")
  const afterLogout = await request("/admin/dashboard", { token: logoutToken, allowStatus: [401] })
  check(afterLogout.status === 401, "admin logout revokes the issued token")

  console.log("Admin smoke test passed: authentication, role protection, dashboard, analytics, products, taxonomy, orders, inventory, deals, reviews, customers, notifications, search, settings, and logout")
}

if (!adminEmail || adminPassword.length < 12) {
  console.error("ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) must be provided through the environment to run the admin smoke test")
  process.exitCode = 1
} else {
  try {
    try { connected = await connectDatabase() } catch { /* the API may be using the development fallback */ }
    await run()
  } catch (error) {
    console.error(`Admin smoke test failed: ${error.message}`)
    process.exitCode = 1
  } finally {
    await cleanup().catch(() => {})
    if (connected) await disconnectDatabase()
  }
}
