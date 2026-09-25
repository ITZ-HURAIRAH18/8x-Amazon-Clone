import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, Check, MapPin, Package, Save } from "lucide-react"
import { adminApi, errorMessage } from "../services/api"
import { AdminError, AdminLoading, AdminPageHeader, AdminStatusBadge } from "../components/admin/AdminUI"

const payloadOf = (value) => value?.data?.data || value?.data || value || {}
const money = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0))
const stages = ["Pending", "Processing", "Shipped", "Out for delivery", "Delivered"]

export default function AdminOrderDetailPage() {
  const { id } = useParams()
  const [order, setOrder] = useState(null)
  const [status, setStatus] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const load = () => { setLoading(true); adminApi.orders.get(id).then((result) => { const value = payloadOf(result); setOrder(value); setStatus(value.status || "Pending") }).catch((requestError) => setError(errorMessage(requestError, "Order could not be loaded."))).finally(() => setLoading(false)) }
  useEffect(load, [id])
  const save = async (event) => { event.preventDefault(); setSaving(true); setError(""); setNotice(""); try { const result = await adminApi.orders.status(id, status); setOrder(payloadOf(result)); setNotice("Order status updated.") } catch (requestError) { setError(errorMessage(requestError, "Order status could not be updated.")) } finally { setSaving(false) } }
  if (loading) return <AdminLoading label="Loading order…" />
  if (error && !order) return <AdminError message={error} onRetry={load} />
  if (!order) return <AdminError message="Order not found." />
  const address = order.shippingAddress || {}
  return <div className="admin-page"><AdminPageHeader eyebrow="Order operations" title={order.orderNumber || order.id} description={`Created ${order.createdAt ? new Date(order.createdAt).toLocaleString() : "—"}`} actions={<Link className="admin-secondary-button" to="/admin/orders"><ArrowLeft size={15} /> Back to orders</Link>} />{error && <AdminError message={error} />}{notice && <div className="admin-success-alert"><Check size={16} />{notice}</div>}<div className="admin-order-detail-grid"><div><section className="admin-panel"><div className="admin-panel__heading"><div><span className="admin-eyebrow">Fulfillment timeline</span><h2>Order status</h2></div><AdminStatusBadge value={order.status} /></div><div className="admin-timeline">{stages.map((stage, index) => <div className={`admin-timeline__step ${stages.indexOf(order.status) >= index ? "is-complete" : ""}`} key={stage}><span>{stages.indexOf(order.status) > index ? <Check size={14} /> : index + 1}</span><strong>{stage}</strong></div>)}</div><form className="admin-status-form" onSubmit={save}><label className="admin-field">Update status<select value={status} onChange={(event) => setStatus(event.target.value)}>{stages.map((stage) => <option key={stage}>{stage}</option>)}<option value="Cancelled">Cancelled</option></select></label><button className="admin-primary-button" type="submit" disabled={saving}><Save size={15} />{saving ? "Saving…" : "Save status"}</button></form></section><section className="admin-panel"><div className="admin-panel__heading"><div><span className="admin-eyebrow">Items</span><h2>Products in this order</h2></div></div><div className="admin-order-items">{(order.items || []).map((item) => <div className="admin-order-item" key={`${item.product}-item.title`}><img src={item.image} alt="" /><div><strong>{item.title}</strong><small>{item.quantity} × {money(item.unitPrice)}</small></div><b>{money(item.quantity * item.unitPrice)}</b></div>)}</div><div className="admin-totals"><span>Subtotal <b>{money(order.subtotal)}</b></span>{order.discount > 0 && <span>Discount <b>−{money(order.discount)}</b></span>}<span>Shipping <b>{order.shipping ? money(order.shipping) : "FREE"}</b></span><span>Tax <b>{money(order.tax)}</b></span><strong>Grand total <b>{money(order.total)}</b></strong></div></section></div><aside><section className="admin-panel"><div className="admin-panel__heading"><div><span className="admin-eyebrow">Customer</span><h2>Account</h2></div></div><p><strong>{order.customer?.name || "Customer"}</strong><br />{order.customer?.email || order.user?.email || "Email unavailable"}</p></section><section className="admin-panel"><div className="admin-panel__heading"><div><span className="admin-eyebrow">Delivery</span><h2>Shipping address</h2></div><MapPin size={19} /></div><address>{address.fullName || address.name}<br />{address.street || address.line1}<br />{address.apartment || address.line2}{address.apartment || address.line2 ? <br /> : null}{address.city}, {address.state} {address.postalCode}<br />{address.country || "United States"}</address></section><section className="admin-panel"><div className="admin-panel__heading"><div><span className="admin-eyebrow">Payment</span><h2>Transaction</h2></div><Package size={19} /></div><p>{order.paymentMethod}<br />Status: {order.paymentStatus || "Paid"}<br />Tracking: {order.trackingNumber || "Not assigned"}</p></section></aside></div></div>
}
