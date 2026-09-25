import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Eye, RefreshCw, Search } from "lucide-react"
import { adminApi, errorMessage } from "../services/api"
import { AdminEmpty, AdminError, AdminPageHeader, AdminPagination, AdminStatusBadge, AdminTable } from "../components/admin/AdminUI"

const payloadOf = (result) => result?.data?.data || result?.data || result || {}
const money = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0))

export default function AdminUsersPage() {
  const [params] = useSearchParams()
  const [query, setQuery] = useState({ search: params.get("search") || "", status: "all", role: "all", sort: "newest", page: 1, limit: 20 })
  const [result, setResult] = useState({ rows: [], meta: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const load = () => { setLoading(true); adminApi.users.list(query).then((response) => { const value = payloadOf(response); setResult({ rows: Array.isArray(value) ? value : value.data || [], meta: response.meta || response.data?.meta || {} }) }).catch((requestError) => setError(errorMessage(requestError, "We couldn't load customers."))).finally(() => setLoading(false)) }
  useEffect(load, [query.search, query.status, query.role, query.sort, query.page])
  const sortMap = { name: { asc: "name", desc: "nameDesc" }, orders: { asc: "orders", desc: "ordersDesc" }, totalSpent: { asc: "spent", desc: "spentDesc" } }
  const activeSort = Object.entries(sortMap).find(([, directions]) => Object.values(directions).includes(query.sort)) || []
  const handleSort = (key) => {
    const directions = sortMap[key]
    if (!directions) return
    setQuery({ ...query, sort: query.sort === directions.asc ? directions.desc : directions.asc, page: 1 })
  }
  const columns = [{ key: "name", label: "Name", sortable: true, render: (row) => <div className="admin-product-name"><strong>{row.name}</strong><small>{row.email}</small></div> }, { key: "role", label: "Role", render: (row) => <AdminStatusBadge value={row.role || "customer"} /> }, { key: "orders", label: "Orders", sortable: true, render: (row) => row.orderCount ?? row.orders?.length ?? 0 }, { key: "totalSpent", label: "Total spent", sortable: true, render: (row) => <strong>{money(row.totalSpent)}</strong> }, { key: "joined", label: "Joined", render: (row) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "—" }, { key: "status", label: "Status", render: (row) => <AdminStatusBadge value={row.status || "active"} /> }, { key: "actions", label: "Actions", render: (row) => <Link className="admin-icon-button" to={`/admin/users/${row.id}`} aria-label={`View ${row.name}`}><Eye size={16} /></Link> }]
  return <div className="admin-page"><AdminPageHeader eyebrow="Customer management" title="Customers" description="Understand customer activity without exposing authentication secrets." actions={<button className="admin-secondary-button" type="button" onClick={load}><RefreshCw size={15} /> Refresh</button>} />{error && <AdminError message={error} onRetry={load} />}<div className="admin-toolbar"><div className="admin-search-field"><Search size={16} /><input value={query.search} onChange={(event) => setQuery({ ...query, search: event.target.value, page: 1 })} placeholder="Search name or email…" aria-label="Search customers" /></div><select value={query.role} onChange={(event) => setQuery({ ...query, role: event.target.value, page: 1 })} aria-label="Filter customer role"><option value="all">All roles</option><option value="customer">Customers</option><option value="admin">Admins</option></select><select value={query.status} onChange={(event) => setQuery({ ...query, status: event.target.value, page: 1 })} aria-label="Filter customer status"><option value="all">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option></select></div><AdminTable columns={columns} rows={result.rows} loading={loading} sortKey={activeSort[0]} sortDirection={activeSort[1] === Object.values(sortMap[activeSort[0]] || {})[1] ? "desc" : "asc"} onSort={handleSort} empty={<AdminEmpty title="No customers found" message="Try a different search or status filter." />} /><div className="admin-table-footer"><span>{result.meta.total || 0} customers</span><AdminPagination page={result.meta.page || query.page} pages={result.meta.pages || 1} onPage={(page) => setQuery({ ...query, page })} /></div></div>
}
