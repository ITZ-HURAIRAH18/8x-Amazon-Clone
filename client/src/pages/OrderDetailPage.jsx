import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, CheckCircle2, MapPin, Package, Truck } from "lucide-react"
import { orderApi, errorMessage } from "../services/api"
import { formatDate, money } from "../utils/format"

export default function OrderDetailPage() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState("")
  useEffect(() => { orderApi.get(id).then(setOrder).catch((requestError) => setError(errorMessage(requestError))) }, [id])
  if (error) return <div className="container empty-state"><h1>Order not found</h1><p>{error}</p><Link to="/account/orders">Return to orders</Link></div>
  if (!order) return <div className="container route-loading">Loading order details…</div>
  return <div className="order-detail-page"><div className="container"><Link className="back-link" to="/account/orders"><ArrowLeft size={17} /> Back to orders</Link><div className="order-detail-heading"><div><span className="section-eyebrow">Order {order.id}</span><h1>Thanks for your order.</h1><p>Placed on {formatDate(order.createdAt)}</p></div><span className={`status-pill status-pill--${(order.status || "Pending").toLowerCase()}`}>{order.status || "Pending"}</span></div><div className="order-progress"><div className="order-progress__step order-progress__step--active"><CheckCircle2 size={20} /><span>Order confirmed</span></div><div className="order-progress__line" /><div className="order-progress__step"><Package size={20} /><span>Preparing</span></div><div className="order-progress__line" /><div className="order-progress__step"><Truck size={20} /><span>On the way</span></div></div><div className="order-detail-grid"><section className="order-items-card"><h2>Items in this order</h2>{(order.items || []).map((item) => <div className="order-line-item" key={item.title}><img src={item.image} alt={item.title} /><div><strong>{item.title}</strong><span>Quantity: {item.quantity}</span><span>{money(item.unitPrice)} each</span></div><b>{money(item.unitPrice * item.quantity)}</b></div>)}<div className="order-totals"><span>Subtotal <b>{money(order.subtotal)}</b></span><span>Shipping <b>{order.shipping ? money(order.shipping) : "FREE"}</b></span><span>Tax <b>{money(order.tax)}</b></span><strong>Total <b>{money(order.total)}</b></strong></div></section><aside className="order-address-card"><h2>Delivery address</h2><MapPin size={20} /><address>{order.shippingAddress?.name}<br />{order.shippingAddress?.line1}<br />{order.shippingAddress?.line2 && <>{order.shippingAddress.line2}<br /></>}{order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.postalCode}<br />{order.shippingAddress?.country || "United States"}</address><h3>Payment</h3><p>{order.paymentMethod || "Card"}</p></aside></div></div></div>
}
