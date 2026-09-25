import { useEffect } from "react"
import { Link } from "react-router-dom"
import { Bell, CheckCheck } from "lucide-react"
import { useNotifications } from "../context/StoreContext"
import { formatDate } from "../utils/format"
import { usePageMeta } from "../utils/seo"

export default function NotificationsPage() {
  const { items, loading, unreadCount, markRead, markAllRead, load } = useNotifications()
  usePageMeta("Notifications", "Review updates about your Amazon Clone orders and saved products.")
  useEffect(() => { void load() }, [load])
  return <div className="notifications-page"><div className="container"><div className="breadcrumbs"><Link to="/account">Your Account</Link><span>›</span><strong>Notifications</strong></div><div className="page-title-row"><div><h1>Notifications</h1><p>{unreadCount ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}` : "You are all caught up."}</p></div>{unreadCount > 0 && <button className="secondary-button" type="button" onClick={markAllRead}><CheckCheck size={16} /> Mark all read</button>}</div>{loading ? <div className="route-loading">Loading notifications…</div> : items.length === 0 ? <div className="empty-state"><Bell size={43} /><h2>No notifications yet</h2><p>Order updates and saved-product news will appear here.</p><Link className="primary-button" to="/search">Continue shopping</Link></div> : <div className="notifications-list">{items.map((item) => <Link to={item.link || "/account"} className={`notification-page-row ${item.read ? "" : "is-unread"}`} key={item.id} onClick={() => markRead(item.id)}><span className="notification-page-row__icon"><Bell size={18} /></span><span><strong>{item.title}</strong><p>{item.message}</p><small>{formatDate(item.createdAt)}</small></span>{!item.read && <i />}</Link>)}</div>}</div></div>
}
