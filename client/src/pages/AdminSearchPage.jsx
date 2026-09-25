import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { FolderTree, Package, Percent, Search, ShoppingCart, Tags, Users } from "lucide-react"
import { adminApi, errorMessage } from "../services/api"
import { AdminEmpty, AdminError, AdminLoading, AdminPageHeader } from "../components/admin/AdminUI"

const payloadOf = (value) => value?.data?.data || value?.data || value || {}
const groups = [{ key: "products", label: "Products", icon: Package, path: "/admin/products" }, { key: "orders", label: "Orders", icon: ShoppingCart, path: "/admin/orders" }, { key: "users", label: "Customers", icon: Users, path: "/admin/users" }, { key: "coupons", label: "Coupons", icon: Percent, path: "/admin/coupons" }, { key: "categories", label: "Categories", icon: FolderTree, path: "/admin/categories" }, { key: "brands", label: "Brands", icon: Tags, path: "/admin/brands" }]

export default function AdminSearchPage() {
  const [params, setParams] = useSearchParams()
  const [term, setTerm] = useState(params.get("q") || "")
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const search = (query) => { const next = new URLSearchParams(params); if (query) next.set("q", query); else next.delete("q"); setParams(next) }
  useEffect(() => { const query = params.get("q"); if (!query) { setResult(null); return } setLoading(true); adminApi.search(query).then((response) => setResult(payloadOf(response))).catch((requestError) => setError(errorMessage(requestError, "Admin search failed."))).finally(() => setLoading(false)) }, [params])
  return <div className="admin-page"><AdminPageHeader eyebrow="Admin search" title="Search operations" description="Find products, orders, customers, promotions, and taxonomy records from one place." /><form className="admin-global-search-form" onSubmit={(event) => { event.preventDefault(); search(term.trim()) }}><Search size={19} /><input value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Search products, orders, customers…" autoFocus /><button className="admin-primary-button" type="submit">Search</button></form>{error && <AdminError message={error} />}{loading ? <AdminLoading label="Searching admin data…" /> : !params.get("q") ? <AdminEmpty title="Search the operations database" message="Enter a product name, order number, customer email, or coupon code." /> : !result || groups.every((group) => !(result[group.key]?.length)) ? <AdminEmpty title={`No results for “${params.get("q")}”`} message="Try a shorter or more general search." /> : <div className="admin-search-results">{groups.map(({ key, label, icon: Icon, path }) => { const rows = result[key] || []; if (!rows.length) return null; return <section className="admin-panel" key={key}><div className="admin-panel__heading"><div><Icon size={19} /><h2>{label} <small>({rows.length})</small></h2></div><Link to={path}>Manage <span>→</span></Link></div><div className="admin-search-result-list">{rows.map((row) => <Link to={path} key={row.id || row._id || row.code}><strong>{row.title || row.name || row.orderNumber || row.email || row.code}</strong><span>{row.sku || row.status || row._id || ""}</span></Link>)}</div></section> })}</div>}</div>
}
