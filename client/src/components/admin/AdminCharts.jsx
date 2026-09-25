function pointsFor(data = [], width = 640, height = 220, padding = 28) {
  const values = data.map((item) => Number(item.value || item.revenue || item.count || 0))
  const max = Math.max(...values, 1)
  return data.map((item, index) => {
    const x = padding + (data.length <= 1 ? (width - padding * 2) / 2 : (index * (width - padding * 2)) / (data.length - 1))
    const y = height - padding - ((Number(item.value || item.revenue || item.count || 0) / max) * (height - padding * 2))
    return { ...item, x, y, value: Number(item.value || item.revenue || item.count || 0) }
  })
}

export function AdminLineChart({ data = [], label = "Value", formatValue = (value) => value }) {
  const width = 680
  const height = 240
  const points = pointsFor(data, width, height)
  const path = points.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ")
  return <div className="admin-chart"><div className="admin-chart__heading"><strong>{label}</strong><span>{data.length ? `${data.length} data points` : "No data"}</span></div>{data.length ? <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label} chart`}><line x1="28" x2={width - 28} y1={height - 28} y2={height - 28} className="admin-chart__axis" /><line x1="28" x2="28" y1="20" y2={height - 28} className="admin-chart__axis" />{points.length > 1 && <path d={path} className="admin-chart__line" />}{points.map((point) => <g key={point.label || point.x}><circle cx={point.x} cy={point.y} r="4" className="admin-chart__point"><title>{`${point.label || ""}: ${formatValue(point.value)}`}</title></circle><text x={point.x} y={height - 8} textAnchor="middle" className="admin-chart__label">{point.label || ""}</text></g>)}</svg> : <div className="admin-chart__empty">No chart data for this period.</div>}</div>
}

export function AdminBarChart({ data = [], label = "Breakdown", formatValue = (value) => value }) {
  const max = Math.max(...data.map((item) => Number(item.value || item.count || 0)), 1)
  return <div className="admin-chart admin-chart--bars"><div className="admin-chart__heading"><strong>{label}</strong><span>{data.length} results</span></div>{data.length ? <div className="admin-bar-list">{data.map((item) => <div className="admin-bar-row" key={item.label || item._id}><span title={item.label}>{item.label || "Unassigned"}</span><div><i style={{ width: `${Math.max(2, (Number(item.value || item.count || 0) / max) * 100)}%` }} /></div><b>{formatValue(item.value ?? item.count ?? 0)}</b></div>)}</div> : <div className="admin-chart__empty">No chart data for this period.</div>}</div>
}

export function AdminDonutChart({ data = [], label = "Distribution" }) {
  const total = data.reduce((sum, item) => sum + Number(item.value || item.count || 0), 0) || 1
  let offset = 0
  const colors = ["#ff9900", "#febd69", "#232f3e", "#131921", "#bbbfbf"]
  const segments = data.map((item, index) => { const value = Number(item.value || item.count || 0); const percent = (value / total) * 100; const segment = { ...item, percent, color: colors[index % colors.length], offset }; offset += percent; return segment })
  return <div className="admin-chart admin-chart--donut"><div className="admin-chart__heading"><strong>{label}</strong><span>{total} total</span></div>{data.length ? <div className="admin-donut-wrap"><div className="admin-donut" style={{ background: `conic-gradient(${segments.map((segment) => `${segment.color} ${segment.offset}% ${segment.offset + segment.percent}%`).join(",")})` }}><div><strong>{total}</strong><small>Total</small></div></div><div className="admin-legend">{segments.map((segment) => <div key={segment.label}><i style={{ background: segment.color }} /><span>{segment.label}</span><b>{segment.value}</b></div>)}</div></div> : <div className="admin-chart__empty">No distribution data.</div>}</div>
}
