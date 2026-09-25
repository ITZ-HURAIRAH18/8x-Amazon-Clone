import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, CheckCircle2, MapPin, Package, ShoppingCart, Truck } from "lucide-react"
import { orderApi, errorMessage } from "../services/api"
import { formatDate, money } from "../utils/format"
import { useCart } from "../context/StoreContext"
import { usePageMeta } from "../utils/seo"

const stages = ["Order placed", "Processing", "Shipped", "Out for delivery", "Delivered"]
const statusIndex = { Pending: 0, Processing: 1, Shipped: 2, "Out for delivery": 3, Delivered: 4, Cancelled: 0 }

export default function OrderDetailPage() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const { addToCart } = useCart()
  usePageMeta(order ? `Order ${order.orderNumber || order.id}` : "Order details", "Track your Amazon Clone order and review its items.")
  useEffect(() => { orderApi.get(id).then(setOrder).catch((requestError) => setError(errorMessage(requestError))) }, [id])
  const buyAgain = async () => { if (!order) return; setBusy(true); for (const item of order.items || []) await addToCart({ id: item.product, title: item.title, image: item.image, images: [item.image], price: item.unitPrice, stock: 99, category: "Previously purchased", brand: "Amazon Clone" }, item.quantity); setBusy(false) }
  if (error) return <div className="container empty-state"><h1>Order not found</h1><p>{error}</p><Link className="primary-button" to="/account/orders">Return to orders</Link></div>
  if (!order) return <div className="container route-loading">Loading order details…</div>
  const address = order.shippingAddress || {}
  const currentStage = statusIndex[order.status] ?? 0
  return <div className="order-detail-page"><div className="container"><Link className="back-link" to="/account/orders"><ArrowLeft size={17} /> Back to orders</Link><div className="order-detail-heading"><div><span className="section-eyebrow">Order {order.orderNumber || order.id}</span><h1>Thanks for your order.</h1><p>Placed on {formatDate(order.createdAt)}</p></div><span className={`status-pill status-pill--${(order.status || "Pending").toLowerCase().replaceAll(" ", "-")}`}>{order.status || "Pending"}</span></div><section className="order-progress" aria-label="Order tracking">{stages.map((stage, index) => <div className="order-progress__group" key={stage}><div className={`order-progress__step ${index <= currentStage ? "order-progress__step--active" : ""}`}>{index < currentStage ? <CheckCircle2 size={20} /> : index === currentStage ? <Package size={20} /> : <Truck size={20} />}<span>{stage}</span></div>{index < stages.length - 1 && <i className={index < currentStage ? "is-complete" : ""} />}</div>)}</section><div className="order-detail-grid"><section className="order-items-card"><div className="order-card-title-row"><h2>Items in this order</h2><button className="buy-again-button" type="button" onClick={buyAgain} disabled={busy}>{busy ? "Adding…" : <><ShoppingCart size={14} /> Buy again</>}</button></div>{(order.items || []).map((item) => <div className="order-line-item" key={`${item.product}-${item.title}`}><img src={item.image} alt={item.title} /><div><strong>{item.title}</strong><span>Quantity: {item.quantity}</span><span>{money(item.unitPrice)} each</span></div><b>{money(item.unitPrice * item.quantity)}</b></div>)}<div className="order-totals"><span>Subtotal <b>{money(order.subtotal)}</b></span>{order.discount > 0 && <span>Discount <b>−{money(order.discount)}</b></span>}<span>Shipping <b>{order.shipping ? money(order.shipping) : "FREE"}</b></span><span>Tax <b>{money(order.tax)}</b></span><strong>Total <b>{money(order.total)}</b></strong></div></section><aside className="order-address-card"><h2>Delivery address</h2><MapPin size={20} /><address>{address.fullName || address.name}<br />{address.street || address.line1}<br />{address.apartment || address.line2}{address.apartment || address.line2 ? <br /> : null}{address.city}, {address.state} {address.postalCode}<br />{address.country || "United States"}</address><h3>Estimated delivery</h3><p>{order.estimatedDelivery ? formatDate(order.estimatedDelivery) : "Calculated after purchase"}</p><h3>Payment</h3><p>{order.paymentMethod} · {order.paymentStatus || "Paid"}</p><h3>Tracking</h3><p>{order.trackingNumber || "Tracking number available after shipment"}</p><button className="secondary-button track-button" type="button" onClick={() => window.alert(`Tracking ${order.trackingNumber || "will be available soon"}. Your order is currently ${order.status.toLowerCase()}.`)}>Track package</button></aside></div></div></div>
}
