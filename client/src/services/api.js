import axios from "axios"

const configuredApiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api" : "http://localhost:5000/api")
const normalizedApiUrl = configuredApiUrl.replace(/\/$/, "")
const apiBaseUrlValue = normalizedApiUrl.endsWith("/api") || normalizedApiUrl.startsWith("/") ? normalizedApiUrl : `${normalizedApiUrl}/api`

export const api = axios.create({
  baseURL: apiBaseUrlValue,
  headers: { "Content-Type": "application/json" },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("amazon_clone_token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use((response) => response, (error) => {
  if (error?.response?.status === 401) {
    localStorage.removeItem("amazon_clone_token")
    localStorage.removeItem("amazon_clone_user")
    window.dispatchEvent(new Event("amazon:session-expired"))
  }
  return Promise.reject(error)
})

export const adminClient = axios.create({
  baseURL: apiBaseUrlValue,
  headers: { "Content-Type": "application/json" },
})

adminClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("amazon_clone_admin_token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

adminClient.interceptors.response.use((response) => response, (error) => {
  if (error?.response?.status === 401) {
    localStorage.removeItem("amazon_clone_admin_token")
    localStorage.removeItem("amazon_clone_admin_user")
    window.dispatchEvent(new Event("amazon:admin-session-expired"))
  }
  return Promise.reject(error)
})

const unwrap = (response) => response.data?.data ?? response.data

export const productApi = {
  list: async (params = {}) => (await api.get("/products", { params })).data,
  get: async (id) => unwrap(await api.get(`/products/${encodeURIComponent(id)}`)),
  facets: async () => unwrap(await api.get("/products/facets")),
  recommendations: async (id) => unwrap(await api.get(`/products/${encodeURIComponent(id)}/recommendations`)),
  reviews: async (id, params = {}) => (await api.get(`/products/${encodeURIComponent(id)}/reviews`, { params })).data,
  createReview: async (id, details) => unwrap(await api.post(`/products/${encodeURIComponent(id)}/reviews`, details)),
  updateReview: async (id, reviewId, details) => unwrap(await api.patch(`/products/${encodeURIComponent(id)}/reviews/${reviewId}`, details)),
  deleteReview: async (id, reviewId) => unwrap(await api.delete(`/products/${encodeURIComponent(id)}/reviews/${reviewId}`)),
  mine: async () => unwrap(await api.get("/reviews/mine")),
}

export const authApi = {
  login: async (credentials) => unwrap(await api.post("/auth/login", credentials)),
  register: async (details) => unwrap(await api.post("/auth/register", details)),
  me: async () => unwrap(await api.get("/auth/me")),
  logout: async () => unwrap(await api.post("/auth/logout")),
  updateProfile: async (details) => unwrap(await api.patch("/auth/profile", details)),
  changePassword: async (details) => unwrap(await api.patch("/auth/password", details)),
}

export const cartApi = {
  get: async () => unwrap(await api.get("/cart")),
  add: async (productId, quantity) => unwrap(await api.post("/cart", { productId, quantity })),
  update: async (itemId, quantity) => unwrap(await api.patch(`/cart/${itemId}`, { quantity })),
  remove: async (itemId) => unwrap(await api.delete(`/cart/${itemId}`)),
  clear: async () => unwrap(await api.delete("/cart")),
  merge: async (items) => unwrap(await api.post("/cart/merge", { items })),
  saveForLater: async (itemId) => unwrap(await api.post(`/cart/${itemId}/save-for-later`)),
  moveToWishlist: async (itemId) => unwrap(await api.post(`/cart/${itemId}/move-to-wishlist`)),
  moveSavedToCart: async (itemId) => unwrap(await api.post(`/cart/saved/${itemId}/move-to-cart`)),
  removeSaved: async (itemId) => unwrap(await api.delete(`/cart/saved/${itemId}`)),
}

export const wishlistApi = {
  get: async () => unwrap(await api.get("/wishlist")),
  add: async (productId) => unwrap(await api.post("/wishlist", { productId })),
  remove: async (productId) => unwrap(await api.delete(`/wishlist/${encodeURIComponent(productId)}`)),
  moveToCart: async (productId) => unwrap(await api.post(`/wishlist/${encodeURIComponent(productId)}/move-to-cart`)),
  clear: async () => unwrap(await api.delete("/wishlist")),
}

export const orderApi = {
  create: async (details) => unwrap(await api.post("/orders", details)),
  list: async () => unwrap(await api.get("/orders")),
  get: async (id) => unwrap(await api.get(`/orders/${id}`)),
  updateStatus: async (id, status) => unwrap(await api.patch(`/orders/${id}/status`, { status })),
}

export const addressApi = {
  list: async () => unwrap(await api.get("/addresses")),
  add: async (address) => unwrap(await api.post("/addresses", address)),
  update: async (id, address) => unwrap(await api.patch(`/addresses/${id}`, address)),
  remove: async (id) => unwrap(await api.delete(`/addresses/${id}`)),
  setDefault: async (id) => unwrap(await api.post(`/addresses/${id}/default`)),
}

export const couponApi = {
  list: async () => unwrap(await api.get("/coupons")),
  validate: async (code, subtotal) => unwrap(await api.post("/coupons/validate", { code, subtotal })),
}

export const notificationApi = {
  list: async () => (await api.get("/notifications")).data,
  markRead: async (id) => unwrap(await api.patch(`/notifications/${id}/read`)),
  markAllRead: async () => unwrap(await api.patch("/notifications/read-all")),
}

export const adminApi = {
  auth: {
    login: async (credentials) => unwrap(await adminClient.post("/admin/auth/login", credentials)),
    me: async () => unwrap(await adminClient.get("/admin/auth/me")),
    logout: async () => unwrap(await adminClient.post("/admin/auth/logout")),
  },
  dashboard: async (params = {}) => (await adminClient.get("/admin/dashboard", { params })).data,
  analytics: async (params = {}) => (await adminClient.get("/admin/analytics", { params })).data,
  revenue: async (params = {}) => (await adminClient.get("/admin/analytics/revenue", { params })).data,
  ordersAnalytics: async (params = {}) => (await adminClient.get("/admin/analytics/orders", { params })).data,
  productsAnalytics: async (params = {}) => (await adminClient.get("/admin/analytics/products", { params })).data,
  categoriesAnalytics: async (params = {}) => (await adminClient.get("/admin/analytics/categories", { params })).data,
  customersAnalytics: async (params = {}) => (await adminClient.get("/admin/analytics/customers", { params })).data,
  products: {
    list: async (params = {}) => (await adminClient.get("/admin/products", { params })).data,
    get: async (id) => unwrap(await adminClient.get(`/admin/products/${id}`)),
    create: async (details) => unwrap(await adminClient.post("/admin/products", details)),
    update: async (id, details) => unwrap(await adminClient.patch(`/admin/products/${id}`, details)),
    remove: async (id) => unwrap(await adminClient.delete(`/admin/products/${id}`)),
    status: async (id, status) => unwrap(await adminClient.patch(`/admin/products/${id}/status`, { status })),
    bulk: async (action, ids, value) => unwrap(await adminClient.post("/admin/products/bulk", { action, ids, value, confirm: action === "delete" })),
  },
  categories: {
    list: async (params = {}) => (await adminClient.get("/admin/categories", { params })).data,
    create: async (details) => unwrap(await adminClient.post("/admin/categories", details)),
    update: async (id, details) => unwrap(await adminClient.patch(`/admin/categories/${id}`, details)),
    remove: async (id) => unwrap(await adminClient.delete(`/admin/categories/${id}`)),
  },
  brands: {
    list: async (params = {}) => (await adminClient.get("/admin/brands", { params })).data,
    create: async (details) => unwrap(await adminClient.post("/admin/brands", details)),
    update: async (id, details) => unwrap(await adminClient.patch(`/admin/brands/${id}`, details)),
    remove: async (id) => unwrap(await adminClient.delete(`/admin/brands/${id}`)),
  },
  orders: {
    list: async (params = {}) => (await adminClient.get("/admin/orders", { params })).data,
    get: async (id) => unwrap(await adminClient.get(`/admin/orders/${id}`)),
    status: async (id, status) => unwrap(await adminClient.patch(`/admin/orders/${id}/status`, { status })),
  },
  users: {
    list: async (params = {}) => (await adminClient.get("/admin/users", { params })).data,
    get: async (id) => unwrap(await adminClient.get(`/admin/users/${id}`)),
    status: async (id, status) => unwrap(await adminClient.patch(`/admin/users/${id}/status`, { status })),
    role: async (id, role) => unwrap(await adminClient.patch(`/admin/users/${id}/role`, { role })),
  },
  reviews: {
    list: async (params = {}) => (await adminClient.get("/admin/reviews", { params })).data,
    moderate: async (id, status) => unwrap(await adminClient.patch(`/admin/reviews/${id}`, { status })),
    remove: async (id) => unwrap(await adminClient.delete(`/admin/reviews/${id}`)),
  },
  coupons: {
    list: async (params = {}) => (await adminClient.get("/admin/coupons", { params })).data,
    create: async (details) => unwrap(await adminClient.post("/admin/coupons", details)),
    update: async (id, details) => unwrap(await adminClient.patch(`/admin/coupons/${id}`, details)),
    remove: async (id) => unwrap(await adminClient.delete(`/admin/coupons/${id}`)),
  },
  deals: {
    list: async (params = {}) => (await adminClient.get("/admin/deals", { params })).data,
    get: async (id) => unwrap(await adminClient.get(`/admin/deals/${id}`)),
    create: async (details) => unwrap(await adminClient.post("/admin/deals", details)),
    update: async (id, details) => unwrap(await adminClient.patch(`/admin/deals/${id}`, details)),
    remove: async (id) => unwrap(await adminClient.delete(`/admin/deals/${id}`)),
  },
  inventory: {
    list: async (params = {}) => (await adminClient.get("/admin/inventory", { params })).data,
    update: async (id, details) => unwrap(await adminClient.patch(`/admin/inventory/${id}`, details)),
  },
  notifications: {
    list: async (params = {}) => (await adminClient.get("/admin/notifications", { params })).data,
    markRead: async (id) => unwrap(await adminClient.patch(`/admin/notifications/${id}/read`)),
    markAllRead: async () => unwrap(await adminClient.patch("/admin/notifications/read-all")),
    clear: async () => unwrap(await adminClient.delete("/admin/notifications")),
  },
  search: async (q) => (await adminClient.get("/admin/search", { params: { q } })).data,
  settings: {
    get: async () => unwrap(await adminClient.get("/admin/settings")),
    update: async (details) => unwrap(await adminClient.patch("/admin/settings", details)),
  },
}

export const apiBaseUrl = apiBaseUrlValue

export function errorMessage(error, fallback = "Something went wrong. Please try again.") {
  const status = error?.response?.status
  const contentType = String(error?.response?.headers?.["content-type"] || "")
  // A deployed backend behind Vercel deployment protection answers with HTML
  // instead of JSON, and a missing function answers 404. Both look identical
  // to a shopper, so surface an actionable message instead of a raw status.
  if (status === 404 && contentType.includes("text/html")) return `The API is not available at ${apiBaseUrl}. Check VITE_API_URL and the backend deployment.`
  if (status === 403 && contentType.includes("text/html")) return "The API rejected this browser (CORS or deployment protection). Add the frontend origin to CLIENT_URL."
  if (!error?.response && (error?.code === "ERR_NETWORK" || /Network Error/i.test(error?.message || ""))) return `Cannot reach the API at ${apiBaseUrl}. Check your connection or the backend deployment.`
  return error?.response?.data?.message || error?.message || fallback
}
