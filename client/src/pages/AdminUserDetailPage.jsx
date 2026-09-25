import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, Ban, CheckCircle, Heart, Mail, Star } from "lucide-react"
import { adminApi, errorMessage } from "../services/api"
import { AdminError, AdminLoading, AdminPageHeader, AdminStatusBadge } from "../components/admin/AdminUI"

const payloadOf = (value) => value?.data?.data || value?.data || value || {}
const money = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0))

export default function AdminUserDetailPage() {
  const { id } = useParams()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const load = () => { setLoading(true); adminApi.users.get(id).then((result) => setUser(payloadOf(result))).catch((requestError) => setError(errorMessage(requestError, "Customer could not be loaded."))).finally(() => setLoading(false)) }
  useEffect(load, [id])
  const toggle = async () => { try { const result = await adminApi.users.status(id, user.status === "suspended" ? "active" : "suspended"); setUser({ ...user, ...payloadOf(result), status: user.status === "suspended" ? "active" : "suspended" }); setNotice("Customer status updated.") } catch (requestError) { setError(errorMessage(requestError, "Customer status could not be updated.")) } }
  if (loading) return <AdminLoading label="Loading customer…" />
  if (error && !user) return <AdminError message={error} onRetry={load} />
  if (!user) return <AdminError message="Customer not found." />
  return <div className="admin-page"><AdminPageHeader eyebrow="Customer management" title={user.name} description={user.email} actions={<><Link className="admin-secondary-button" to="/admin/users"><ArrowLeft size={15} /> Back to customers</Link><button className={user.status === "suspended" ? "admin-primary-button" : "admin-danger-button"} type="button" onClick={toggle}>{user.status === "suspended" ? <><CheckCircle size={15} /> Reactivate</> : <><Ban size={15} /> Suspend</>}</button></>} />{error && <AdminError message={error} />}{notice && <div className="admin-success-alert"><CheckCircle size={16} />{notice}</div>}<div className="admin-user-detail-grid"><section className="admin-panel"><div className="admin-panel__heading"><div><span className="admin-eyebrow">Profile</span><h2>Account details</h2></div><AdminStatusBadge value={user.status || "active"} /></div><div className="admin-detail-list"><div><Mail size={16} /><span>Email</span><strong>{user.email}</strong></div><div><Star size={16} /><span>Role</span><strong>{user.role || "customer"}</strong></div><div><span>Joined</span><strong>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</strong></div><div><span>Orders</span><strong>{user.orderCount ?? user.orders?.length ?? 0}</strong></div><div><span>Total spent</span><strong>{money(user.totalSpent)}</strong></div><div><span>Saved addresses</span><strong>{user.addresses?.length || 0}</strong></div></div></section><section className="admin-panel"><div className="admin-panel__heading"><div><span className="admin-eyebrow">Recent orders</span><h2>Order history</h2></div><Link to={`/admin/orders?search=${encodeURIComponent(user.email)}`}>View all</Link></div>{(user.orders || []).length === 0 ? <p className="admin-muted">No orders yet.</p> : <div className="admin-mini-list">{user.orders.slice(0, 6).map((order) => <div key={order.id}><span><strong>{order.orderNumber || order.id}</strong><small>{new Date(order.createdAt).toLocaleDateString()}</small></span><b>{money(order.total)}</b></div>)}</div>}</section><section className="admin-panel"><div className="admin-panel__heading"><div><span className="admin-eyebrow">Saved preferences</span><h2>Wishlist summary</h2></div><HeartIcon /></div>{user.wishlist?.length || user.wishlistCount ? <p>{user.wishlist?.length || user.wishlistCount} products saved for later.</p> : <p className="admin-muted">No wishlist items.</p>}</section><section className="admin-panel"><div className="admin-panel__heading"><div><span className="admin-eyebrow">Reviews</span><h2>Written reviews</h2></div><Star size={19} /></div>{(user.reviews || []).length === 0 ? <p className="admin-muted">No reviews written.</p> : <div className="admin-mini-list">{user.reviews.slice(0, 5).map((review) => <div key={review.id}><span><strong>{review.title}</strong><small>{review.rating} stars</small></span></div>)}</div>}</section></div></div>
}

function HeartIcon() { return <Heart size={19} /> }
