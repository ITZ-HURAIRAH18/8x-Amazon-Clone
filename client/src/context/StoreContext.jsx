import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { addressApi, authApi, cartApi, errorMessage, notificationApi, wishlistApi } from "../services/api"

const AuthContext = createContext(null)
const CartContext = createContext(null)
const WishlistContext = createContext(null)
const ShoppingMemoryContext = createContext(null)
const NotificationContext = createContext(null)
const TOKEN_KEY = "amazon_clone_token"
const USER_KEY = "amazon_clone_user"
const GUEST_CART_KEY = "amazon_clone_guest_cart_v1"
const GUEST_WISHLIST_KEY = "amazon_clone_guest_wishlist_v1"
const RECENT_KEY = "amazon_clone_recent_v1"
const COMPARE_KEY = "amazon_clone_compare_v1"

const readStorage = (key, fallback) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null")
    return value ?? fallback
  } catch {
    return fallback
  }
}
const writeStorage = (key, value) => localStorage.setItem(key, JSON.stringify(value))
const readGuestCart = () => {
  const value = readStorage(GUEST_CART_KEY, { items: [], savedItems: [] })
  if (Array.isArray(value)) return { items: value, savedItems: [] }
  return { items: Array.isArray(value.items) ? value.items : [], savedItems: Array.isArray(value.savedItems) ? value.savedItems : [] }
}
const readGuestWishlist = () => {
  const value = readStorage(GUEST_WISHLIST_KEY, [])
  return Array.isArray(value) ? value : []
}
const normalizeItems = (items = []) => items.map((item) => ({ id: item.id || item._id || `local-${item.product?.id || Date.now()}`, quantity: Number(item.quantity) || 1, product: item.product })).filter((item) => item.product)
const normalizeWishlist = (items = []) => items.map((item) => ({ id: item.id || item.product?.id || item.productId, product: item.product })).filter((item) => item.product)
const productKey = (product) => String(product?.id || product?._id || product?.slug || "")

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readStorage(USER_KEY, null))
  const [ready, setReady] = useState(false)
  const refresh = async () => {
    const nextUser = await authApi.me()
    setUser(nextUser)
    writeStorage(USER_KEY, nextUser)
    return nextUser
  }
  useEffect(() => {
    const expired = () => { setUser(null); setReady(true) }
    window.addEventListener("amazon:session-expired", expired)
    return () => window.removeEventListener("amazon:session-expired", expired)
  }, [])
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setReady(true)
      return undefined
    }
    refresh().catch(() => {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      setUser(null)
    }).finally(() => setReady(true))
    return undefined
  }, [])
  const saveSession = (data) => {
    localStorage.setItem(TOKEN_KEY, data.token)
    writeStorage(USER_KEY, data.user)
    setUser(data.user)
    return data.user
  }
  const value = useMemo(() => ({
    user,
    ready,
    isAuthenticated: Boolean(user),
    refresh,
    async login(credentials) { return saveSession(await authApi.login(credentials)) },
    async register(details) { return saveSession(await authApi.register(details)) },
    logout() {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      setUser(null)
    },
  }), [user, ready])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function CartProvider({ children }) {
  const { user } = useAuth()
  const initial = readGuestCart()
  const [items, setItems] = useState(() => normalizeItems(initial.items))
  const [savedItems, setSavedItems] = useState(() => normalizeItems(initial.savedItems))
  const [unavailableItems, setUnavailableItems] = useState([])
  const [loading, setLoading] = useState(Boolean(user))
  const [error, setError] = useState("")
  const persistGuest = (nextItems, nextSaved = savedItems) => writeStorage(GUEST_CART_KEY, { items: nextItems, savedItems: nextSaved })
  const applyCart = (cart) => {
    const nextItems = normalizeItems(cart?.items || [])
    const nextSaved = normalizeItems(cart?.savedItems || [])
    setItems(nextItems)
    setSavedItems(nextSaved)
    setUnavailableItems(cart?.unavailableItems || [])
  }
  useEffect(() => {
    let cancelled = false
    if (!user) {
      const guest = readGuestCart()
      setItems(normalizeItems(guest.items))
      setSavedItems(normalizeItems(guest.savedItems))
      setUnavailableItems([])
      setLoading(false)
      return () => { cancelled = true }
    }
    setLoading(true)
    const load = async () => {
      try {
        let serverCart = await cartApi.get()
        const guest = readGuestCart()
        if (guest.items.length) serverCart = await cartApi.merge(guest.items.map((item) => ({ productId: item.product.id, quantity: item.quantity })))
        if (guest.savedItems.length) {
          for (const item of guest.savedItems) {
            const merged = await cartApi.add(item.product.id, item.quantity)
            const active = merged.items?.find((entry) => String(entry.product?.id) === String(item.product.id))
            if (active) await cartApi.saveForLater(active.id)
          }
          serverCart = await cartApi.get()
        }
        if (!cancelled) applyCart(serverCart)
        if (guest.items.length || guest.savedItems.length) localStorage.removeItem(GUEST_CART_KEY)
      } catch (requestError) {
        if (!cancelled) setError(errorMessage(requestError, "Your saved cart could not be loaded."))
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
        applyCart(await cartApi.add(product.id, safeQuantity))
        return true
      } catch (requestError) {
        setError(errorMessage(requestError, "The item could not be synced to your account."))
        return false
      }
    }
    setItems((current) => {
      const existing = current.find((item) => productKey(item.product) === productKey(product))
      const next = existing
        ? current.map((item) => productKey(item.product) === productKey(product) ? { ...item, quantity: Math.min(product.stock || 99, item.quantity + safeQuantity) } : item)
        : [...current, { id: `local-${product.id}`, product, quantity: Math.min(product.stock || 99, safeQuantity) }]
      persistGuest(next, savedItems)
      return next
    })
    return true
  }
  const updateQuantity = async (itemId, quantity) => {
    const safeQuantity = Math.max(1, Number(quantity) || 1)
    setError("")
    if (user && !String(itemId).startsWith("local-")) {
      try { applyCart(await cartApi.update(itemId, safeQuantity)); return true } catch (requestError) { setError(errorMessage(requestError, "The quantity could not be updated.")); return false }
    }
    setItems((current) => {
      const next = current.map((item) => item.id === itemId ? { ...item, quantity: Math.min(item.product.stock || 99, safeQuantity) } : item)
      persistGuest(next, savedItems)
      return next
    })
    return true
  }
  const removeItem = async (itemId) => {
    setError("")
    if (user && !String(itemId).startsWith("local-")) {
      try { applyCart(await cartApi.remove(itemId)); return true } catch (requestError) { setError(errorMessage(requestError, "The item could not be removed.")); return false }
    }
    setItems((current) => { const next = current.filter((item) => item.id !== itemId); persistGuest(next, savedItems); return next })
    return true
  }
  const saveForLater = async (itemId) => {
    if (user && !String(itemId).startsWith("local-")) {
      try { applyCart(await cartApi.saveForLater(itemId)); return true } catch (requestError) { setError(errorMessage(requestError, "The item could not be saved.")); return false }
    }
    const item = items.find((entry) => entry.id === itemId)
    if (!item) return false
    const nextItems = items.filter((entry) => entry.id !== itemId)
    const nextSaved = [...savedItems.filter((entry) => productKey(entry.product) !== productKey(item.product)), { ...item, id: `local-saved-${item.product.id}` }]
    setItems(nextItems); setSavedItems(nextSaved); persistGuest(nextItems, nextSaved)
    return true
  }
  const moveSavedToCart = async (itemId) => {
    if (user && !String(itemId).startsWith("local-")) {
      try { applyCart(await cartApi.moveSavedToCart(itemId)); return true } catch (requestError) { setError(errorMessage(requestError, "The saved item could not be moved.")); return false }
    }
    const item = savedItems.find((entry) => entry.id === itemId)
    if (!item) return false
    const nextSaved = savedItems.filter((entry) => entry.id !== itemId)
    const existing = items.find((entry) => productKey(entry.product) === productKey(item.product))
    const nextItems = existing ? items.map((entry) => productKey(entry.product) === productKey(item.product) ? { ...entry, quantity: entry.quantity + item.quantity } : entry) : [...items, { ...item, id: `local-${item.product.id}` }]
    setItems(nextItems); setSavedItems(nextSaved); persistGuest(nextItems, nextSaved)
    return true
  }
  const removeSaved = async (itemId) => {
    if (user && !String(itemId).startsWith("local-")) {
      try { applyCart(await cartApi.removeSaved(itemId)); return true } catch (requestError) { setError(errorMessage(requestError, "The saved item could not be removed.")); return false }
    }
    const nextSaved = savedItems.filter((item) => item.id !== itemId)
    setSavedItems(nextSaved); persistGuest(items, nextSaved)
    return true
  }
  const clearCart = async () => {
    if (user) {
      try { applyCart(await cartApi.clear()); return } catch (requestError) { setError(errorMessage(requestError, "The cart could not be cleared.")) }
    }
    setItems([]); setSavedItems([]); setUnavailableItems([]); persistGuest([], [])
  }
  const value = useMemo(() => ({ items, savedItems, unavailableItems, loading, error, count: items.reduce((sum, item) => sum + item.quantity, 0), savedCount: savedItems.reduce((sum, item) => sum + item.quantity, 0), subtotal: items.reduce((sum, item) => sum + Number(item.product.price || 0) * item.quantity, 0), savedSubtotal: savedItems.reduce((sum, item) => sum + Number(item.product.price || 0) * item.quantity, 0), addToCart, updateQuantity, removeItem, saveForLater, moveSavedToCart, removeSaved, clearCart }), [items, savedItems, unavailableItems, loading, error])
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function WishlistProvider({ children }) {
  const { user } = useAuth()
  const { addToCart } = useCart()
  const [items, setItems] = useState(() => normalizeWishlist(readGuestWishlist()))
  const [loading, setLoading] = useState(Boolean(user))
  const [error, setError] = useState("")
  const apply = (next) => setItems(normalizeWishlist(next))
  useEffect(() => {
    let cancelled = false
    if (!user) { apply(readGuestWishlist()); setLoading(false); return () => { cancelled = true } }
    setLoading(true)
    const load = async () => {
      try {
        let serverItems = await wishlistApi.get()
        const guest = readGuestWishlist()
        for (const entry of guest) {
          if (!serverItems.some((item) => productKey(item.product) === productKey(entry.product))) serverItems = await wishlistApi.add(entry.product.id)
        }
        if (!cancelled) apply(serverItems)
        if (guest.length) localStorage.removeItem(GUEST_WISHLIST_KEY)
      } catch (requestError) { if (!cancelled) setError(errorMessage(requestError, "Your wishlist could not be loaded.")) } finally { if (!cancelled) setLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [user])
  const add = async (product) => {
    setError("")
    if (user) {
      try { apply(await wishlistApi.add(product.id)); return true } catch (requestError) { setError(errorMessage(requestError, "The item could not be saved.")); return false }
    }
    setItems((current) => { const next = current.some((item) => productKey(item.product) === productKey(product)) ? current : [...current, { id: product.id, product }]; writeStorage(GUEST_WISHLIST_KEY, next); return next })
    return true
  }
  const remove = async (product) => {
    if (user) { try { apply(await wishlistApi.remove(product.id)); return true } catch (requestError) { setError(errorMessage(requestError, "The item could not be removed.")); return false } }
    setItems((current) => { const next = current.filter((item) => productKey(item.product) !== productKey(product)); writeStorage(GUEST_WISHLIST_KEY, next); return next })
    return true
  }
  const clear = async () => { if (user) { try { apply(await wishlistApi.clear()) } catch (requestError) { setError(errorMessage(requestError, "The wishlist could not be cleared.")); return false } } else { setItems([]); writeStorage(GUEST_WISHLIST_KEY, []) }; return true }
  const moveToCart = async (product) => { const added = await addToCart(product, 1); if (added) await remove(product); return added }
  const value = useMemo(() => ({ items, count: items.length, loading, error, contains: (product) => items.some((item) => productKey(item.product) === productKey(product)), add, remove, clear, moveToCart }), [items, loading, error])
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function ShoppingMemoryProvider({ children }) {
  const { user } = useAuth()
  const storageSuffix = user?._id || user?.id || "guest"
  const [recent, setRecent] = useState(() => readStorage(`${RECENT_KEY}_${storageSuffix}`, []))
  const [compare, setCompare] = useState(() => readStorage(`${COMPARE_KEY}_${storageSuffix}`, []))
  useEffect(() => { setRecent(readStorage(`${RECENT_KEY}_${storageSuffix}`, [])); setCompare(readStorage(`${COMPARE_KEY}_${storageSuffix}`, [])) }, [storageSuffix])
  const addRecent = useCallback((product) => setRecent((current) => { const next = [product, ...current.filter((item) => productKey(item) !== productKey(product))].slice(0, 20); writeStorage(`${RECENT_KEY}_${storageSuffix}`, next); return next }), [storageSuffix])
  const toggleCompare = useCallback((product) => {
    let accepted = true
    setCompare((current) => {
      const exists = current.some((item) => productKey(item) === productKey(product))
      if (!exists && current.length >= 4) { accepted = false; return current }
      const next = exists ? current.filter((item) => productKey(item) !== productKey(product)) : [...current, product]
      writeStorage(`${COMPARE_KEY}_${storageSuffix}`, next)
      return next
    })
    return accepted
  }, [storageSuffix])
  const clearCompare = useCallback(() => { setCompare([]); writeStorage(`${COMPARE_KEY}_${storageSuffix}`, []) }, [storageSuffix])
  const value = useMemo(() => ({ recent, compare, addRecent, toggleCompare, clearCompare }), [recent, compare])
  return <ShoppingMemoryContext.Provider value={value}>{children}</ShoppingMemoryContext.Provider>
}

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const load = async () => {
    if (!user) { setItems([]); return }
    setLoading(true)
    try { const result = await notificationApi.list(); setItems(result.data || []) } catch { setItems([]) } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [user])
  const markRead = async (id) => { setItems((current) => current.map((item) => item.id === id ? { ...item, read: true } : item)); try { await notificationApi.markRead(id) } catch { void load() } }
  const markAllRead = async () => { setItems((current) => current.map((item) => ({ ...item, read: true }))); try { await notificationApi.markAllRead() } catch { void load() } }
  const value = useMemo(() => ({ items, loading, unreadCount: items.filter((item) => !item.read).length, load, markRead, markAllRead }), [items, loading])
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function StoreProvider({ children }) {
  return <AuthProvider><CartProvider><WishlistProvider><ShoppingMemoryProvider><NotificationProvider>{children}</NotificationProvider></ShoppingMemoryProvider></WishlistProvider></CartProvider></AuthProvider>
}

export function useAuth() { const context = useContext(AuthContext); if (!context) throw new Error("useAuth must be used inside StoreProvider"); return context }
export function useCart() { const context = useContext(CartContext); if (!context) throw new Error("useCart must be used inside StoreProvider"); return context }
export function useWishlist() { const context = useContext(WishlistContext); if (!context) throw new Error("useWishlist must be used inside StoreProvider"); return context }
export function useShoppingMemory() { const context = useContext(ShoppingMemoryContext); if (!context) throw new Error("useShoppingMemory must be used inside StoreProvider"); return context }
export function useNotifications() { const context = useContext(NotificationContext); if (!context) throw new Error("useNotifications must be used inside StoreProvider"); return context }
