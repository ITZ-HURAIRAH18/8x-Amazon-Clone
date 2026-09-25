import { useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import { adminApi, errorMessage } from "../services/api"
import { AdminBarChart, AdminDonutChart, AdminLineChart } from "../components/admin/AdminCharts"
import { AdminDateRange, AdminError, AdminLoading, AdminPageHeader } from "../components/admin/AdminUI"

const payloadOf = (value) => value?.data?.data || value?.data || value || {}
const money = (value) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0))
const number = (value) => new Intl.NumberFormat("en-US").format(Number(value || 0))

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState("30d")
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const load = () => { setLoading(true); adminApi.analytics({ range }).then((result) => setData(payloadOf(result))).catch((requestError) => setError(errorMessage(requestError, "Analytics could not be loaded."))).finally(() => setLoading(false)) }
  useEffect(load, [range])
  if (loading && !data) return <AdminLoading label="Running analytics…" />
  if (error && !data) return <AdminError message={error} onRetry={load} />
  return <div className="admin-page"><AdminPageHeader eyebrow="Business intelligence" title="Analytics" description="Real MongoDB aggregations for revenue, orders, products, and customers." actions={<><AdminDateRange value={range} onChange={setRange} /><button className="admin-secondary-button" type="button" onClick={load}><RefreshCw size={15} /> Refresh</button></>} />{error && <AdminError message={error} onRetry={load} />}<div className="admin-analytics-summary"><div><span>Revenue</span><strong>{money(data?.revenue?.total)}</strong></div><div><span>Orders</span><strong>{number(data?.orders?.total)}</strong></div><div><span>Units sold</span><strong>{number(data?.unitsSold)}</strong></div><div><span>Average order</span><strong>{money(data?.averageOrderValue)}</strong></div></div><div className="admin-dashboard-grid"><AdminLineChart data={data?.revenueOverTime || []} label="Revenue over time" formatValue={money} /><AdminLineChart data={data?.ordersOverTime || []} label="Orders over time" formatValue={number} /><AdminBarChart data={data?.topProducts || []} label="Top products" formatValue={money} /><AdminBarChart data={data?.salesByCategory || []} label="Sales by category" formatValue={money} /><AdminDonutChart data={data?.statusDistribution || []} label="Order status" /></div><section className="admin-panel"><div className="admin-panel__heading"><div><span className="admin-eyebrow">Customer growth</span><h2>New customers over time</h2></div></div><AdminLineChart data={data?.customersOverTime || []} label="New customers" formatValue={number} /></section><p className="admin-method-note">Revenue includes valid non-cancelled orders with a paid or pending payment state. Refunded and failed orders are excluded.</p></div>
}
