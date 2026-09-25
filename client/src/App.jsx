import { Navigate, Route, Routes, useLocation } from "react-router-dom"
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

export default function App() {
  return <Routes>
    <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
    <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
    <Route element={<AmazonShell />}>
      <Route index element={<HomePage />} />
      <Route path="search" element={<ProductsPage />} />
      <Route path="category/:category" element={<ProductsPage />} />
      <Route path="product/:id" element={<ProductDetailPage />} />
      <Route path="cart" element={<CartPage />} />
      <Route path="account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
      <Route path="account/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
      <Route path="account/orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
      <Route path="checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
      <Route path="checkout/confirmation/:orderId" element={<ProtectedRoute><OrderConfirmationPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
}
