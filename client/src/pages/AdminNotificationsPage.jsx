import { useEffect, useState } from "react"
import { Bell, CheckCheck, Trash2 } from "lucide-react"
import { adminApi, errorMessage } from "../services/api"
import { AdminEmpty, AdminError, AdminLoading, AdminPageHeader, AdminStatusBadge } from "../components/admin/AdminUI"

const payloadOf = (value) => value?.data?.data || value?.data || value || {}

export default function AdminNotificationsPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const load = () => { setLoading(true); adminApi.notifications.list({ limit: 50 }).then((result) => { const value = payloadOf(result); setItems(Array.isArray(value) ? value : value.data || []) }).catch((requestError) => setError(errorMessage(requestError, "Notifications could not be loaded."))).finally(() => setLoading(false)) }
  useEffect(load, [])
  const mark = async (id) => { await adminApi.notifications.markRead(id); setItems((current) => current.map((item) => item.id === id ? { ...item, read: true } : item)) }
  const markAll = async () => { await adminApi.notifications.markAllRead(); setItems((current) => current.map((item) => ({ ...item, read: true }))) }
  const clear = async () => { await adminApi.notifications.clear(); setItems([]) }
  if (loading) return <AdminLoading label="Loading notifications…" />
  return <div className="admin-page"><AdminPageHeader eyebrow="Operations center" title="Notifications" description="Low-stock, order, review, and promotion alerts for the admin team." actions={<><button className="admin-secondary-button" type="button" onClick={markAll}><CheckCheck size={15} /> Mark all read</button><button className="admin-danger-button" type="button" onClick={clear}><Trash2 size={15} /> Clear all</button></>} />{error && <AdminError message={error} onRetry={load} />}{items.length === 0 ? <AdminEmpty title="No admin notifications" message="Operational alerts will appear here." /> : <div className="admin-notification-list">{items.map((item) => <button type="button" className={`admin-notification-row ${item.read ? "" : "is-unread"}`} key={item.id} onClick={() => mark(item.id)}><span className="admin-notification-row__icon"><Bell size={17} /></span><span><strong>{item.title}</strong><p>{item.message}</p><small>{item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}</small></span><AdminStatusBadge value={item.read ? "Read" : "Unread"} /></button>)}</div>}</div>
}
