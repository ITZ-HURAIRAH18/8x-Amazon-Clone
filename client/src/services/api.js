import axios from "axios"

const configuredApiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api"
const apiBaseUrl = configuredApiUrl.replace(/\/$/, "").endsWith("/api")
  ? configuredApiUrl.replace(/\/$/, "")
  : `${configuredApiUrl.replace(/\/$/, "")}/api`

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { "Content-Type": "application/json" },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("amazon_clone_token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
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
  moveSavedToCart: async (itemId) => unwrap(await api.post(`/cart/saved/${itemId}/move-to-cart`)),
  removeSaved: async (itemId) => unwrap(await api.delete(`/cart/saved/${itemId}`)),
}

export const wishlistApi = {
  get: async () => unwrap(await api.get("/wishlist")),
  add: async (productId) => unwrap(await api.post("/wishlist", { productId })),
  remove: async (productId) => unwrap(await api.delete(`/wishlist/${encodeURIComponent(productId)}`)),
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

export function errorMessage(error, fallback = "Something went wrong. Please try again.") {
  return error?.response?.data?.message || error?.message || fallback
}
