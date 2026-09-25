import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { adminApi, errorMessage } from "../services/api"

const AdminAuthContext = createContext(null)
const TOKEN_KEY = "amazon_clone_admin_token"
const USER_KEY = "amazon_clone_admin_user"

const readUser = () => {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || "null") } catch { return null }
}

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(() => localStorage.getItem(TOKEN_KEY) ? readUser() : null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState("")

  const saveSession = (data) => {
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    setAdmin(data.user)
    setError("")
    return data.user
  }
  const refresh = async () => {
    const result = await adminApi.auth.me()
    const user = result.user || result.admin || result
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    setAdmin(user)
    return user
  }
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) { setAdmin(null); setReady(true); return undefined }
    refresh().catch((requestError) => {
      setAdmin(null)
      setError(errorMessage(requestError, "Your admin session has expired."))
    }).finally(() => setReady(true))
    return undefined
  }, [])
  useEffect(() => {
    const expired = () => { setAdmin(null); setReady(true) }
    window.addEventListener("amazon:admin-session-expired", expired)
    return () => window.removeEventListener("amazon:admin-session-expired", expired)
  }, [])
  const logout = async () => {
    try { await adminApi.auth.logout() } catch { /* local logout still succeeds if the session endpoint is unavailable */ }
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setAdmin(null)
    setError("")
  }
  const value = useMemo(() => ({
    admin,
    ready,
    error,
    isAuthenticated: Boolean(admin),
    isAdmin: admin?.role === "admin" && admin?.status !== "suspended",
    login: async (credentials) => { const session = await adminApi.auth.login(credentials); return saveSession({ token: session.token, user: session.user || session.admin }) },
    logout,
    refresh,
  }), [admin, ready, error])
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (!context) throw new Error("useAdminAuth must be used inside AdminAuthProvider")
  return context
}
