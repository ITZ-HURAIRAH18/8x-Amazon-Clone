import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

const colors = ["#ff9900", "#febd69", "#232f3e", "#131921", "#bbbfbf"]

function ChartFrame({ title, count, children, empty }) {
  return <div className="admin-chart"><div className="admin-chart__heading"><strong>{title}</strong><span>{count ? `${count} data points` : "No data"}</span></div>{count ? <div className="admin-recharts-wrap">{children}</div> : <div className="admin-chart__empty">No chart data for this period.</div>}</div>
}

export function AdminLineChart({ data = [], label = "Value", formatValue = (value) => value }) {
  const normalized = data.map((item) => ({ ...item, value: Number(item.value ?? item.revenue ?? item.count ?? 0), label: item.label || item._id || item.date || "" }))
  return <ChartFrame title={label} count={normalized.length}><ResponsiveContainer width="100%" height={235}><LineChart data={normalized} margin={{ top: 10, right: 12, left: 0, bottom: 5 }}><CartesianGrid stroke="#e5e5e5" vertical={false} /><XAxis dataKey="label" tick={{ fontSize: 10, fill: "#565959" }} tickLine={false} axisLine={false} /><YAxis tick={{ fontSize: 10, fill: "#565959" }} tickLine={false} axisLine={false} width={48} tickFormatter={(value) => formatValue(value)} /><Tooltip formatter={(value) => formatValue(value)} labelStyle={{ color: "#0f1111" }} /><Line type="monotone" dataKey="value" stroke="#ff9900" strokeWidth={3} dot={{ r: 3, fill: "#ffffff", stroke: "#ff9900", strokeWidth: 2 }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer></ChartFrame>
}

export function AdminBarChart({ data = [], label = "Breakdown", formatValue = (value) => value }) {
  const normalized = data.map((item) => ({ ...item, label: item.label || item._id || item.name || "Unassigned", value: Number(item.value ?? item.count ?? 0) }))
  return <ChartFrame title={label} count={normalized.length}><ResponsiveContainer width="100%" height={235}><BarChart data={normalized} layout="vertical" margin={{ top: 5, right: 15, left: 8, bottom: 5 }}><CartesianGrid stroke="#e5e5e5" horizontal={false} /><XAxis type="number" tick={{ fontSize: 10, fill: "#565959" }} tickLine={false} axisLine={false} tickFormatter={(value) => formatValue(value)} /><YAxis type="category" dataKey="label" width={105} tick={{ fontSize: 10, fill: "#565959" }} tickLine={false} axisLine={false} /><Tooltip formatter={(value) => formatValue(value)} /><Bar dataKey="value" fill="#ff9900" radius={[2, 2, 2, 2]} /></BarChart></ResponsiveContainer></ChartFrame>
}

export function AdminDonutChart({ data = [], label = "Distribution" }) {
  const normalized = data.map((item) => ({ ...item, name: item.label || item._id || item.name || "Unassigned", value: Number(item.value ?? item.count ?? 0) }))
  return <ChartFrame title={label} count={normalized.length}><div className="admin-recharts-wrap admin-recharts-wrap--donut"><ResponsiveContainer width="100%" height={235}><PieChart><Pie data={normalized} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>{normalized.map((item, index) => <Cell key={item.name} fill={colors[index % colors.length]} />)}</Pie><Tooltip /><Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer></div></ChartFrame>
}
