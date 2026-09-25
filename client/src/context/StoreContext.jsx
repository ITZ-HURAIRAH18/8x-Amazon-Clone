import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { authApi, cartApi, errorMessage } from "../services/api"

const AuthContext = createContext(null)
const CartContext = createContext(null)
const GUEST_CART_KEY = "amazon_clone_guest_cart_v1"
const TOKEN_KEY = "amazon_clone_token"
const USER_KEY = "amazon_clone_user"

const readGuestCart = () => {
  try {
    const value = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "[]")
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

const writeGuestCart = (items) => localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items))

function normalizeCartItems(items = []) {
  return items
    .map((item) => ({
      id: item.id || item._id || `local-${item.product?.id || Date.now()}`,
      quantity: Number(item.quantity) || 1,
      product: item.product,
    }))
    .filter((item) => item.product)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || "null")
    } catch {
      return null
    }
  })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setReady(true)
      return
    }
    authApi.me()
      .then((nextUser) => {
        setUser(nextUser)
        localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        setUser(null)
      })
      .finally(() => setReady(true))
  }, [])

  const saveSession = (data) => {
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  const value = useMemo(() => ({
    user,
    ready,
    isAuthenticated: Boolean(user),
    async login(credentials) {
      return saveSession(await authApi.login(credentials))
    },
    async register(details) {
      return saveSession(await authApi.register(details))
    },
    logout() {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem(GUEST_CART_KEY)
      setUser(null)
    },
  }), [user, ready])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function CartProvider({ children }) {
  const { user } = useAuth()
  const [items, setItems] = useState(() => normalizeCartItems(readGuestCart()))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    if (!user) {
      setItems(normalizeCartItems(readGuestCart()))
      setLoading(false)
      return () => { cancelled = true }
    }
    setLoading(true)
    const load = async () => {
      try {
        const serverCart = await cartApi.get()
        const guestItems = normalizeCartItems(readGuestCart())
        const merged = guestItems.length ? await cartApi.merge(guestItems.map((item) => ({ productId: item.product.id, quantity: item.quantity }))) : serverCart
        if (!cancelled) setItems(normalizeCartItems(merged.items || []))
        if (guestItems.length) localStorage.removeItem(GUEST_CART_KEY)
      } catch (requestError) {
        if (!cancelled) {
          setError(errorMessage(requestError, "Your saved cart could not be loaded."))
          setItems(normalizeCartItems(readGuestCart()))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [user])

  const addToCart = async (product, quantity = 1) => {
    const safeQuantity = Math.max(1, Number(quantity) || 1)
    setError("")
    if (user) {
      try {
        const cart = await cartApi.add(product.id, safeQuantity)
        setItems(normalizeCartItems(cart.items || []))
        return
      } catch (requestError) {
        setError(errorMessage(requestError, "The item could not be synced to your account."))
      }
    }
    setItems((current) => {
      const existing = current.find((item) => item.product.id === product.id)
      const next = existing
        ? current.map((item) => item.product.id === product.id ? { ...item, quantity: Math.min(product.stock || 99, item.quantity + safeQuantity) } : item)
        : [...current, { id: `local-${product.id}`, product, quantity: Math.min(product.stock || 99, safeQuantity) }]
      writeGuestCart(next)
      return next
    })
  }

  const updateQuantity = async (itemId, quantity) => {
    const safeQuantity = Math.max(1, Number(quantity) || 1)
    setError("")
    if (user && !String(itemId).startsWith("local-")) {
      try {
        const cart = await cartApi.update(itemId, safeQuantity)
        setItems(normalizeCartItems(cart.items || []))
        return
      } catch (requestError) {
        setError(errorMessage(requestError, "The quantity could not be updated."))
      }
    }
    setItems((current) => {
      const next = current.map((item) => item.id === itemId ? { ...item, quantity: Math.min(item.product.stock || 99, safeQuantity) } : item)
      writeGuestCart(next)
      return next
    })
  }

  const removeItem = async (itemId) => {
    setError("")
    if (user && !String(itemId).startsWith("local-")) {
      try {
        const cart = await cartApi.remove(itemId)
        setItems(normalizeCartItems(cart.items || []))
        return
      } catch (requestError) {
        setError(errorMessage(requestError, "The item could not be removed."))
      }
    }
    setItems((current) => {
      const next = current.filter((item) => item.id !== itemId)
      writeGuestCart(next)
      return next
    })
  }

  const clearCart = () => {
    setItems([])
    writeGuestCart([])
  }

  const value = useMemo(() => ({
    items,
    loading,
    error,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: items.reduce((sum, item) => sum + Number(item.product.price || 0) * item.quantity, 0),
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
  }), [items, loading, error])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function StoreProvider({ children }) {
  return <AuthProvider><CartProvider>{children}</CartProvider></AuthProvider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth must be used inside StoreProvider")
  return context
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error("useCart must be used inside StoreProvider")
  return context
}
