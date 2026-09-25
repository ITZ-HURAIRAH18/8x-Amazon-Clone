import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, Boxes, ClipboardList, DollarSign, Package, Percent, Plus, ShoppingCart, Star, Users } from "lucide-react"
import { adminApi, errorMessage } from "../services/api"
import { AdminBarChart, AdminDonutChart, AdminLineChart } from "../components/admin/AdminCharts"
import { AdminDateRange, AdminError, AdminLoading, AdminPageHeader, AdminStatCard, AdminStatusBadge } from "../components/admin/AdminUI"

const unwrapAdmin = (result) => result?.data?.data || result?.data || result || {}

export default function AdminDashboardPage() {
  const [range, setRange] = useState("30d")
  const [custom, setCustom] = useState({ from: "", to: "" })
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const load = () => { setLoading(true); setError(""); const params = range === "custom" ? { range, from: custom.from, to: custom.to } : { range }; adminApi.dashboard(params).then((result) => setData(unwrapAdmin(result))).catch((requestError) => setError(errorMessage(requestError, "We couldn't load the dashboard."))).finally(() => setLoading(false)) }
  useEffect(load, [range, custom.from, custom.to])
  const metrics = data?.metrics || {}
  const orders = data?.orders || metrics.orders || {}
  const customers = data?.customers || metrics.customers || {}
  const products = data?.products || metrics.products || {}
  const reviews = data?.reviews || metrics.reviews || {}
  const revenue = data?.revenue || metrics.revenue || {}
  const charts = data?.charts || data
  const recentOrders = data?.recentOrders || metrics.recentOrders || []
  const lowStock = data?.lowStock || metrics.lowStock || []
  const rangeLabel = useMemo(() => range === "custom" ? "Custom range" : range, [range])
  if (loading && !data) return <AdminLoading label="Loading business overview…" />
  if (error && !data) return <AdminError message={error} onRetry={load} />
  return <div className="admin-page"><AdminPageHeader eyebrow="Amazon operations" title="Business dashboard" description={`A live view of your store for ${rangeLabel.toLowerCase()}.`} actions={<><AdminDateRange value={range} onChange={setRange} /><Link className="admin-primary-button" to="/admin/products/new"><Plus size={16} /> Add product</Link></>} />{range === "custom" && <div className="admin-custom-range"><label>From<input type="date" value={custom.from} onChange={(event) => setCustom({ ...custom, from: event.target.value })} /></label><label>To<input type="date" value={custom.to} onChange={(event) => setCustom({ ...custom, to: event.target.value })} /></label><button className="admin-secondary-button" type="button" onClick={load}>Apply range</button></div>}<div className="admin-stat-grid"><AdminStatCard label="Total revenue" value={money(revenue.total)} detail={`Today ${money(revenue.today)} · Week ${money(revenue.week)} · Month ${money(revenue.month)}`} icon={DollarSign} tone="orange" /><AdminStatCard label="Orders" value={number(orders.total)} detail={`${number(orders.Pending)} pending`} icon={ShoppingCart} /><AdminStatCard label="Customers" value={number(customers.total)} detail={`${number(customers.new)} new · ${number(customers.active)} active`} icon={Users} /><AdminStatCard label="Products" value={number(products.total)} detail={`${number(products.active)} active · ${number(products.lowStock)} low stock · ${number(products.outOfStock)} out`} icon={Package} /><AdminStatCard label="Reviews" value={number(reviews.total)} detail={`${number(reviews.Pending)} awaiting moderation`} icon={Star} /><AdminStatCard label="Active products" value={number(products.active)} detail={`${number(products.outOfStock)} out of stock`} icon={Boxes} /></div><div className="admin-quick-actions"><div><span className="admin-eyebrow">Quick actions</span><h2>Keep the store moving</h2></div><div className="admin-quick-actions__links"><Link to="/admin/products/new"><Plus size={16} /> Add product</Link><Link to="/admin/orders"><ClipboardList size={16} /> View orders</Link><Link to="/admin/inventory"><Boxes size={16} /> Manage inventory</Link><Link to="/admin/coupons"><Percent size={16} /> Create coupon</Link><Link to="/admin/deals"><Star size={16} /> Create deal</Link><Link to="/admin/reviews"><Star size={16} /> Moderate reviews</Link></div></div><div className="admin-status-strip">{["Pending", "Processing", "Shipped", "Delivered", "Cancelled"].map((status) => <div key={status}><span>{status}</span><strong>{number(orders[status])}</strong></div>)}</div><div className="admin-dashboard-grid"><AdminLineChart data={charts.revenueOverTime || []} label="Revenue over time" formatValue={money} /><AdminLineChart data={charts.ordersOverTime || []} label="Orders over time" formatValue={number} /><AdminBarChart data={charts.salesByCategory || []} label="Sales by category" formatValue={money} /><AdminBarChart data={charts.salesByBrand || []} label="Sales by brand" formatValue={money} /><AdminDonutChart data={charts.statusDistribution || []} label="Order status distribution" /></div><div className="admin-dashboard-grid admin-dashboard-grid--tables"><section className="admin-panel"><div className="admin-panel__heading"><div><span className="admin-eyebrow">Needs attention</span><h2>Low-stock products</h2></div><Link to="/admin/inventory">View inventory <ArrowRight size={15} /></Link></div>{lowStock.length === 0 ? <p className="admin-muted">No low-stock products in the selected period.</p> : <div className="admin-mini-list">{lowStock.slice(0, 6).map((product) => <div key={product.id || product._id}><img src={product.image || product.images?.[0]} alt="" /><span><strong>{product.title}</strong><small>{product.sku || "SKU unavailable"}</small></span><b>{product.stock} left</b></div>)}</div>}</section><section className="admin-panel"><div className="admin-panel__heading"><div><span className="admin-eyebrow">Latest activity</span><h2>Recent orders</h2></div><Link to="/admin/orders">View all <ArrowRight size={15} /></Link></div>{recentOrders.length === 0 ? <p className="admin-muted">No orders in the selected period.</p> : <div className="admin-mini-list">{recentOrders.slice(0, 6).map((order) => <div key={order.id || order._id}><span><strong>{order.orderNumber || order.id}</strong><small>{order.customer?.name || order.customer?.email || "Customer"}</small></span><b>{money(order.total)}</b><AdminStatusBadge value={order.status} /></div>)}</div>}</section></div></div>
}

function money(value) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0)) }
function number(value) { return new Intl.NumberFormat("en-US").format(Number(value || 0)) }
