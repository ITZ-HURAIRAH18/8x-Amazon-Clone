import { useEffect, useState } from "react"
import { Link, useLocation, useParams } from "react-router-dom"
import { CheckCircle2, Package, Truck } from "lucide-react"
import { orderApi, errorMessage } from "../services/api"
import { formatDate, money } from "../utils/format"

export default function OrderConfirmationPage() {
  const { orderId } = useParams()
  const location = useLocation()
  const [order, setOrder] = useState(location.state?.order || null)
  const [error, setError] = useState("")
  useEffect(() => { if (order) return; orderApi.get(orderId).then(setOrder).catch((requestError) => { try { setOrder(JSON.parse(localStorage.getItem("amazon_clone_last_order") || "null")) } catch { setError(errorMessage(requestError, "Order confirmation is unavailable.")) } }) }, [order, orderId])
  if (error) return <div className="container empty-state"><h1>Confirmation unavailable</h1><p>{error}</p><Link to="/account/orders">View your orders</Link></div>
  if (!order) return <div className="container route-loading">Loading your confirmation…</div>
  return <div className="confirmation-page"><div className="container"><div className="confirmation-card"><div className="confirmation-icon"><CheckCircle2 size={42} /></div><span className="section-eyebrow">Order confirmed</span><h1>Thank you for your order.</h1><p>We’ve sent a confirmation to your email. Your order is being prepared.</p><div className="confirmation-number">Order number <strong>{order.id}</strong></div><div className="confirmation-status"><div><Package size={21} /><span><strong>Order confirmed</strong><small>{formatDate(order.createdAt)}</small></span></div><i /><div><Truck size={21} /><span><strong>Preparing for delivery</strong><small>We’ll update you soon</small></span></div></div><div className="confirmation-total"><span>Order total</span><strong>{money(order.total)}</strong></div><div className="confirmation-actions"><Link className="primary-button" to="/account/orders">View your orders</Link><Link className="secondary-button" to="/">Continue shopping</Link></div></div></div></div>
}
