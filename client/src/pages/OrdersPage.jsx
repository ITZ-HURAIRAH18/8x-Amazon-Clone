import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ChevronRight, Package, RefreshCw, ShoppingCart } from "lucide-react"
import { orderApi, errorMessage } from "../services/api"
import { formatDate, money } from "../utils/format"
import { useCart } from "../context/StoreContext"
import { usePageMeta } from "../utils/seo"

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const { addToCart } = useCart()
  const [busy, setBusy] = useState("")
  usePageMeta("Your Orders", "Track recent Amazon Clone purchases and buy again.")
  const load = () => { setLoading(true); setError(""); orderApi.list().then(setOrders).catch((requestError) => setError(errorMessage(requestError))).finally(() => setLoading(false)) }
  useEffect(load, [])
  const buyAgain = async (order) => { setBusy(order.id); for (const item of order.items || []) await addToCart({ id: item.product, title: item.title, image: item.image, images: [item.image], price: item.unitPrice, stock: 99, category: "Previously purchased", brand: "Amazon Clone" }, item.quantity); setBusy("") }
  return <div className="orders-page"><div className="container"><div className="breadcrumbs"><Link to="/account">Your Account</Link><span>›</span><strong>Your Orders</strong></div><div className="page-title-row"><div><h1>Your Orders</h1><p>Track recent purchases and view order details.</p></div><button className="icon-text-button" type="button" onClick={load}><RefreshCw size={16} /> Refresh</button></div>{error && <div className="form-alert" role="alert">{error}</div>}{loading ? <OrdersSkeleton /> : orders.length === 0 ? <div className="empty-state"><Package size={40} /><h2>You haven't placed an order yet</h2><p>When you place an order, it will appear here.</p><Link className="primary-button" to="/search">Start shopping</Link></div> : <div className="orders-list">{orders.map((order) => <OrderRow key={order.id} order={order} onBuyAgain={buyAgain} busy={busy === order.id} />)}</div>}</div></div>
}

function OrderRow({ order, onBuyAgain, busy }) { const address = order.shippingAddress || {}; return <article className="order-card"><div className="order-card__top"><div><span>ORDER PLACED</span><strong>{formatDate(order.createdAt)}</strong></div><div><span>TOTAL</span><strong>{money(order.total)}</strong></div><div><span>SHIP TO</span><strong>{address.fullName || address.name || "Your address"}</strong></div><Link to={`/account/orders/${order.id}`} aria-label={`View order ${order.id}`}>View order details <ChevronRight size={16} /></Link></div><div className="order-card__body"><div className="order-card__items">{(order.items || []).slice(0, 3).map((item) => <img key={`${item.product}-item.title}`} src={item.image} alt={item.title} />)}</div><div className="order-card__status"><span className={`status-pill status-pill--${(order.status || "Pending").toLowerCase().replaceAll(" ", "-")}`}>{order.status || "Pending"}</span><strong>{order.items?.[0]?.title}</strong><span>{order.items?.length || 0} item{order.items?.length === 1 ? "" : "s"}</span><button className="buy-again-button" type="button" onClick={() => onBuyAgain(order)} disabled={busy}>{busy ? "Adding…" : <><ShoppingCart size={14} /> Buy again</>}</button></div></div></article> }
function OrdersSkeleton() { return <div className="orders-list">{[1, 2].map((item) => <div className="order-card orders-skeleton" key={item}><div /><div /></div>)}</div> }
