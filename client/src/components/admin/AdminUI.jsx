import { useEffect, useId, useRef } from "react"
import { AlertCircle, Check, ChevronLeft, ChevronRight, LoaderCircle, X } from "lucide-react"

export function AdminLoading({ label = "Loading admin data…" }) {
  return <div className="admin-loading" role="status"><LoaderCircle className="spin" size={22} /><span>{label}</span></div>
}

export function AdminSkeleton({ rows = 5 }) {
  return <div className="admin-skeleton" aria-label="Loading" aria-busy="true">{Array.from({ length: rows }, (_, index) => <div className="admin-skeleton-row" key={index} />)}</div>
}

export function AdminEmpty({ title = "Nothing found", message = "Try changing your filters." }) {
  return <div className="admin-empty"><div className="admin-empty__mark">—</div><h2>{title}</h2><p>{message}</p></div>
}

export function AdminError({ message = "We couldn't load this data.", onRetry }) {
  return <div className="admin-error" role="alert"><AlertCircle size={22} /><div><strong>{message}</strong>{onRetry && <button type="button" onClick={onRetry}>Try again</button>}</div></div>
}

export function AdminPageHeader({ eyebrow, title, description, actions }) {
  return <div className="admin-page-header"><div><span className="admin-eyebrow">{eyebrow || "Amazon operations"}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="admin-page-actions">{actions}</div>}</div>
}

export function AdminStatCard({ label, value, detail, tone = "default", icon: Icon }) {
  return <article className={`admin-stat-card admin-stat-card--${tone}`}><div className="admin-stat-card__top"><span>{label}</span>{Icon && <Icon size={18} />}</div><strong>{value}</strong>{detail && <small>{detail}</small>}</article>
}

export function AdminStatusBadge({ value }) {
  const normalized = String(value || "unknown").toLowerCase().replaceAll(" ", "-")
  return <span className={`admin-status admin-status--${normalized}`}><i />{String(value || "Unknown")}</span>
}

export function AdminPagination({ page = 1, pages = 1, onPage }) {
  if (pages <= 1) return null
  const start = Math.max(1, Math.min(pages - 2, page - 1))
  const numbers = Array.from({ length: Math.min(3, pages) }, (_, index) => start + index)
  return <nav className="admin-pagination" aria-label="Admin pagination"><button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft size={15} /></button>{numbers.map((number) => <button type="button" className={number === page ? "is-active" : ""} aria-current={number === page ? "page" : undefined} onClick={() => onPage(number)} key={number}>{number}</button>)}<button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight size={15} /></button></nav>
}

export function AdminTable({ columns, rows, rowKey = "id", loading, error, onRetry, empty }) {
  if (loading) return <AdminSkeleton />
  if (error) return <AdminError message={error} onRetry={onRetry} />
  if (!rows?.length) return empty || <AdminEmpty />
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{columns.map((column) => <th key={column.key} scope="col" style={column.width ? { width: column.width } : undefined}>{column.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={row[rowKey] || row._id || index}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key] ?? "—"}</td>)}</tr>)}</tbody></table></div>
}

export function AdminModal({ open, title, description, onClose, children, footer, size = "default" }) {
  const closeRef = useRef(null)
  const dialogRef = useRef(null)
  const titleId = `admin-modal-title-${useId().replaceAll(":", "")}`
  useEffect(() => {
    if (!open) return undefined
    const previous = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    closeRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === "Escape") { onClose(); return }
      if (event.key !== "Tab") return
      const focusable = [...(dialogRef.current?.querySelectorAll("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])") || [])]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => { document.removeEventListener("keydown", onKeyDown); document.body.style.overflow = previousOverflow; previous?.focus?.() }
  }, [open, onClose])
  if (!open) return null
  return <div className="admin-modal-layer"><button type="button" className="admin-modal-backdrop" aria-label="Close dialog" onClick={onClose} /><section ref={dialogRef} className={`admin-modal admin-modal--${size}`} role="dialog" aria-modal="true" aria-labelledby={titleId}><header><div><h2 id={titleId}>{title}</h2>{description && <p>{description}</p>}</div><button ref={closeRef} type="button" className="admin-icon-button" onClick={onClose} aria-label="Close"><X size={19} /></button></header><div className="admin-modal__body">{children}</div>{footer && <footer>{footer}</footer>}</section></div>
}

export function AdminToast({ message, tone = "success", onClose }) {
  if (!message) return null
  return <div className={`admin-toast admin-toast--${tone}`} role="status"><Check size={16} /><span>{message}</span><button type="button" onClick={onClose} aria-label="Dismiss notification"><X size={14} /></button></div>
}

export function AdminDateRange({ value, onChange }) {
  return <label className="admin-date-range"><span>Period</span><select value={value} onChange={(event) => onChange(event.target.value)}><option value="today">Today</option><option value="yesterday">Yesterday</option><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="month">This month</option><option value="lastMonth">Last month</option><option value="year">This year</option><option value="custom">Custom range</option></select></label>
}
