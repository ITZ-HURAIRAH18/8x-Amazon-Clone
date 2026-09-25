import { lazy, Suspense } from "react"
import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import { useAdminAuth } from "./context/AdminAuthContext"

const AdminLayout = lazy(() => import("./components/admin/AdminLayout"))
const AdminLoginPage = lazy(() => import("./pages/AdminLoginPage"))
const AdminForbiddenPage = lazy(() => import("./pages/AdminForbiddenPage"))
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"))
const AdminProductsPage = lazy(() => import("./pages/AdminProductsPage"))
const AdminProductFormPage = lazy(() => import("./pages/AdminProductFormPage"))
const AdminCatalogPage = lazy(() => import("./pages/AdminCatalogPage"))
const AdminOrdersPage = lazy(() => import("./pages/AdminOrdersPage"))
const AdminOrderDetailPage = lazy(() => import("./pages/AdminOrderDetailPage"))
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"))
const AdminUserDetailPage = lazy(() => import("./pages/AdminUserDetailPage"))
const AdminReviewsPage = lazy(() => import("./pages/AdminReviewsPage"))
const AdminCouponsPage = lazy(() => import("./pages/AdminCouponsPage"))
const AdminDealsPage = lazy(() => import("./pages/AdminDealsPage"))
const AdminInventoryPage = lazy(() => import("./pages/AdminInventoryPage"))
const AdminAnalyticsPage = lazy(() => import("./pages/AdminAnalyticsPage"))
const AdminNotificationsPage = lazy(() => import("./pages/AdminNotificationsPage"))
const AdminSettingsPage = lazy(() => import("./pages/AdminSettingsPage"))
const AdminSearchPage = lazy(() => import("./pages/AdminSearchPage"))
const AdminNotFoundPage = lazy(() => import("./pages/AdminNotFoundPage"))
import AmazonShell from "./components/AmazonShell"
import { useAuth } from "./context/StoreContext"
import HomePage from "./pages/HomePage"
import ProductsPage from "./pages/ProductsPage"
import ProductDetailPage from "./pages/ProductDetailPage"
import CartPage from "./pages/CartPage"
import LoginPage from "./pages/LoginPage"
import RegisterPage from "./pages/RegisterPage"
import AccountPage from "./pages/AccountPage"
import OrdersPage from "./pages/OrdersPage"
import OrderDetailPage from "./pages/OrderDetailPage"
import CheckoutPage from "./pages/CheckoutPage"
import OrderConfirmationPage from "./pages/OrderConfirmationPage"
import NotFoundPage from "./pages/NotFoundPage"
import WishlistPage from "./pages/WishlistPage"
import ComparePage from "./pages/ComparePage"
import DealsPage from "./pages/DealsPage"
import NotificationsPage from "./pages/NotificationsPage"

function ProtectedRoute({ children }) {
  const { user, ready } = useAuth()
  const location = useLocation()
  if (!ready) return <div className="route-loading">Loading your account…</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

function GuestRoute({ children }) {
  const { user, ready } = useAuth()
  if (!ready) return <div className="route-loading">Loading…</div>
  return user ? <Navigate to="/account" replace /> : children
}

function AdminProtectedRoute({ children }) {
  const { admin, ready } = useAdminAuth()
  const { user, ready: customerReady } = useAuth()
  const location = useLocation()
  if (!ready || !customerReady) return <div className="route-loading">Loading admin workspace…</div>
  if (admin?.role === "admin" && admin.status !== "suspended") return children
  if (user) return <AdminForbiddenPage />
  return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
}

export default function App() {
  return <Suspense fallback={<div className="route-loading">Loading admin workspace…</div>}><Routes>
    <Route path="/admin/login" element={<AdminLoginPage />} />
    <Route path="/admin" element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<AdminDashboardPage />} />
      <Route path="products" element={<AdminProductsPage />} />
      <Route path="products/new" element={<AdminProductFormPage />} />
      <Route path="products/:id/edit" element={<AdminProductFormPage />} />
      <Route path="categories" element={<AdminCatalogPage kind="category" />} />
      <Route path="brands" element={<AdminCatalogPage kind="brand" />} />
      <Route path="orders" element={<AdminOrdersPage />} />
      <Route path="orders/:id" element={<AdminOrderDetailPage />} />
      <Route path="users" element={<AdminUsersPage />} />
      <Route path="users/:id" element={<AdminUserDetailPage />} />
      <Route path="reviews" element={<AdminReviewsPage />} />
      <Route path="coupons" element={<AdminCouponsPage />} />
      <Route path="deals" element={<AdminDealsPage />} />
      <Route path="inventory" element={<AdminInventoryPage />} />
      <Route path="analytics" element={<AdminAnalyticsPage />} />
      <Route path="notifications" element={<AdminNotificationsPage />} />
      <Route path="settings" element={<AdminSettingsPage />} />
      <Route path="search" element={<AdminSearchPage />} />
      <Route path="*" element={<AdminNotFoundPage />} />
    </Route>
    <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
    <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
    <Route element={<AmazonShell />}>
      <Route index element={<HomePage />} />
      <Route path="search" element={<ProductsPage />} />
      <Route path="category/:category" element={<ProductsPage />} />
      <Route path="product/:id" element={<ProductDetailPage />} />
      <Route path="deals" element={<DealsPage />} />
      <Route path="wishlist" element={<WishlistPage />} />
      <Route path="account/wishlist" element={<ProtectedRoute><WishlistPage /></ProtectedRoute>} />
      <Route path="account/addresses" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
      <Route path="account/reviews" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
      <Route path="account/coupons" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
      <Route path="compare" element={<ComparePage />} />
      <Route path="cart" element={<CartPage />} />
      <Route path="account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
      <Route path="account/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
      <Route path="account/orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
      <Route path="account/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
      <Route path="checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
      <Route path="checkout/confirmation/:orderId" element={<ProtectedRoute><OrderConfirmationPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes></Suspense>
}
