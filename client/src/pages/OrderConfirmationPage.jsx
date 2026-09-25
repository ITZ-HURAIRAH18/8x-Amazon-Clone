import { useEffect, useState } from "react"
import { Link, useLocation, useParams } from "react-router-dom"
import { CheckCircle2, Package, Truck } from "lucide-react"
import { orderApi, errorMessage } from "../services/api"
import { formatDate, money } from "../utils/format"
import { usePageMeta } from "../utils/seo"

export default function OrderConfirmationPage() {
  const { orderId } = useParams()
  const location = useLocation()
  const [order, setOrder] = useState(location.state?.order || null)
  const [error, setError] = useState("")
  usePageMeta("Order Confirmation", "Your Amazon Clone order has been placed.")
  const load = () => { setError(""); orderApi.get(orderId).then(setOrder).catch((requestError) => setError(errorMessage(requestError, "Order confirmation is unavailable."))) }
  useEffect(() => { if (!order) load() }, [orderId])
  if (error) return <div className="container empty-state"><h1>Confirmation unavailable</h1><p>{error}</p><div className="confirmation-actions"><button className="primary-button" type="button" onClick={load}>Retry</button><Link className="secondary-button" to="/account/orders">View your orders</Link></div></div>
  if (!order) return <div className="container route-loading">Loading your confirmation…</div>
  return <div className="confirmation-page"><div className="container"><div className="confirmation-card"><div className="confirmation-icon"><CheckCircle2 size={42} /></div><span className="section-eyebrow">Order confirmed</span><h1>Thank you for your order.</h1><p>We’ve sent a confirmation to your email. Your order is being prepared.</p><div className="confirmation-number">Order number <strong>{order.orderNumber || order.id}</strong></div><div className="confirmation-status"><div><Package size={21} /><span><strong>Order placed</strong><small>{formatDate(order.createdAt)}</small></span></div><i /><div><Truck size={21} /><span><strong>Preparing for delivery</strong><small>{order.estimatedDelivery ? `Estimated ${formatDate(order.estimatedDelivery)}` : "We’ll update you soon"}</small></span></div></div><div className="confirmation-total"><span>Order total</span><strong>{money(order.total)}</strong></div><div className="confirmation-actions"><Link className="primary-button" to="/account/orders">View your orders</Link><Link className="secondary-button" to="/">Continue shopping</Link></div></div></div></div>
}
