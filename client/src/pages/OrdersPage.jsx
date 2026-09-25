import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronRight, Package, RefreshCw } from "lucide-react"
import { orderApi, errorMessage } from "../services/api"
import { formatDate, money } from "../utils/format"

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const load = () => { setLoading(true); orderApi.list().then(setOrders).catch((requestError) => setError(errorMessage(requestError))).finally(() => setLoading(false)) }
  useEffect(load, [])
  return <div className="orders-page"><div className="container"><div className="breadcrumbs"><Link to="/account">Your Account</Link><span>›</span><strong>Your Orders</strong></div><div className="page-title-row"><div><h1>Your Orders</h1><p>Track recent purchases and view order details.</p></div><button className="icon-text-button" type="button" onClick={load}><RefreshCw size={16} /> Refresh</button></div>{error && <div className="form-alert">{error}</div>}{loading ? <div className="orders-loading">Loading your orders…</div> : orders.length === 0 ? <div className="empty-state"><Package size={40} /><h2>You haven't placed an order yet</h2><p>When you place an order, it will appear here.</p><Link className="primary-button" to="/search">Start shopping</Link></div> : <div className="orders-list">{orders.map((order) => <OrderRow key={order.id} order={order} />)}</div>}</div></div>
}

function OrderRow({ order }) { return <article className="order-card"><div className="order-card__top"><div><span>ORDER PLACED</span><strong>{formatDate(order.createdAt)}</strong></div><div><span>TOTAL</span><strong>{money(order.total)}</strong></div><div><span>SHIP TO</span><strong>{order.shippingAddress?.name || "Your address"}</strong></div><Link to={`/account/orders/${order.id}`} aria-label={`View order ${order.id}`}>View order details <ChevronRight size={16} /></Link></div><div className="order-card__body"><div className="order-card__items">{(order.items || []).slice(0, 3).map((item) => <img key={item.title} src={item.image} alt={item.title} />)}</div><div className="order-card__status"><span className={`status-pill status-pill--${(order.status || "Pending").toLowerCase()}`}>{order.status || "Pending"}</span><strong>{order.items?.[0]?.title}</strong><span>{order.items?.length || 0} item{order.items?.length === 1 ? "" : "s"}</span></div></div></article> }
