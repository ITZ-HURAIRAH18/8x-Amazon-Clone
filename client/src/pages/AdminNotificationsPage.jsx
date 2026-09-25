import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Bell, CheckCheck, Trash2 } from "lucide-react"
import { adminApi, errorMessage } from "../services/api"
import { AdminEmpty, AdminError, AdminLoading, AdminModal, AdminPageHeader, AdminStatusBadge } from "../components/admin/AdminUI"

const payloadOf = (value) => value?.data?.data || value?.data || value || {}

export default function AdminNotificationsPage() {
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [confirmClear, setConfirmClear] = useState(false)

  const load = () => {
    setLoading(true)
    adminApi.notifications.list({ limit: 50 })
      .then((result) => {
        const value = payloadOf(result)
        setItems(Array.isArray(value) ? value : value.data || [])
        setUnread(result.meta?.unread ?? 0)
      })
      .catch((requestError) => setError(errorMessage(requestError, "Notifications could not be loaded.")))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const mark = async (id) => {
    try {
      await adminApi.notifications.markRead(id)
      setItems((current) => current.map((item) => item.id === id ? { ...item, read: true } : item))
      setUnread((value) => Math.max(0, value - 1))
    } catch (requestError) {
      setError(errorMessage(requestError, "Notification could not be updated."))
    }
  }
  const markAll = async () => {
    try {
      await adminApi.notifications.markAllRead()
      setItems((current) => current.map((item) => ({ ...item, read: true })))
      setUnread(0)
    } catch (requestError) {
      setError(errorMessage(requestError, "Notifications could not be updated."))
    }
  }
  const clear = async () => {
    try {
      await adminApi.notifications.clear()
      setItems([])
      setUnread(0)
      setConfirmClear(false)
    } catch (requestError) {
      setError(errorMessage(requestError, "Notifications could not be cleared."))
    }
  }

  if (loading) return <AdminLoading label="Loading notifications…" />

  return <div className="admin-page">
    <AdminPageHeader eyebrow="Operations center" title="Notifications" description="Low-stock, order, review, and promotion alerts for the admin team." actions={<><button className="admin-secondary-button" type="button" onClick={markAll} disabled={!unread}><CheckCheck size={15} /> Mark all read</button><button className="admin-danger-button" type="button" onClick={() => setConfirmClear(true)} disabled={!items.length}><Trash2 size={15} /> Clear all</button></>} />
    {error && <AdminError message={error} onRetry={load} />}
    {items.length === 0
      ? <AdminEmpty title="No admin notifications" message="Operational alerts will appear here." />
      : <div className="admin-notification-list">{items.map((item) => {
        const content = <><span className="admin-notification-row__icon"><Bell size={17} /></span><span><strong>{item.title}</strong><p>{item.message}</p><small>{item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}</small></span><AdminStatusBadge value={item.read ? "Read" : "Unread"} /></>
        return item.link && item.link.startsWith("/admin") && !item.read
          ? <Link className="admin-notification-row is-unread" key={item.id} to={item.link} onClick={() => mark(item.id)}>{content}</Link>
          : <button type="button" className={`admin-notification-row ${item.read ? "" : "is-unread"}`} key={item.id} onClick={() => mark(item.id)}>{content}</button>
      })}</div>}
    <AdminModal open={confirmClear} title="Clear notifications" description="This cannot be undone." onClose={() => setConfirmClear(false)} footer={<><button className="admin-secondary-button" type="button" onClick={() => setConfirmClear(false)}>Cancel</button><button className="admin-danger-button" type="button" onClick={clear}>Clear {items.length} notification(s)</button></>}>
      <p>Delete all {items.length} admin notification(s)? New alerts will still be generated afterwards.</p>
    </AdminModal>
  </div>
}
