import axios from "axios"

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("amazon_clone_token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const unwrap = (response) => response.data?.data ?? response.data

export const productApi = {
  list: async (params = {}) => {
    const response = await api.get("/products", { params })
    return response.data
  },
  get: async (id) => unwrap(await api.get(`/products/${encodeURIComponent(id)}`)),
}

export const authApi = {
  login: async (credentials) => unwrap(await api.post("/auth/login", credentials)),
  register: async (details) => unwrap(await api.post("/auth/register", details)),
  me: async () => unwrap(await api.get("/auth/me")),
}

export const cartApi = {
  get: async () => unwrap(await api.get("/cart")),
  add: async (productId, quantity) => unwrap(await api.post("/cart", { productId, quantity })),
  update: async (itemId, quantity) => unwrap(await api.patch(`/cart/${itemId}`, { quantity })),
  remove: async (itemId) => unwrap(await api.delete(`/cart/${itemId}`)),
  merge: async (items) => unwrap(await api.post("/cart/merge", { items })),
}

export const orderApi = {
  create: async (details) => unwrap(await api.post("/orders", details)),
  list: async () => unwrap(await api.get("/orders")),
  get: async (id) => unwrap(await api.get(`/orders/${id}`)),
}

export function errorMessage(error, fallback = "Something went wrong. Please try again.") {
  return error?.response?.data?.message || error?.message || fallback
}
