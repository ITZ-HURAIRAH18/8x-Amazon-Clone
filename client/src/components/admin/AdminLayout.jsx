import { useEffect, useRef, useState } from "react"
import { NavLink, Outlet, Link, useLocation, useNavigate } from "react-router-dom"
import { BarChart3, Bell, ChevronDown, ChevronLeft, ChevronRight, ClipboardList, FolderTree, Home, LayoutDashboard, Menu, Package, Percent, Search, Settings, ShoppingCart, Star, Tags, Truck, Users, X } from "lucide-react"
import { adminApi } from "../../services/api"
import { useAdminAuth } from "../../context/AdminAuthContext"

const links = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/categories", label: "Categories", icon: FolderTree },
  { to: "/admin/brands", label: "Brands", icon: Tags },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart, badge: "pendingOrders" },
  { to: "/admin/users", label: "Customers", icon: Users },
  { to: "/admin/reviews", label: "Reviews", icon: Star, badge: "pendingReviews" },
  { to: "/admin/coupons", label: "Coupons", icon: Percent },
  { to: "/admin/deals", label: "Deals", icon: BarChart3 },
  { to: "/admin/inventory", label: "Inventory", icon: Truck },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
  { to: "/admin/settings", label: "Settings", icon: Settings },
]

export default function AdminLayout() {
  const { admin, logout } = useAdminAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [counts, setCounts] = useState({ pendingOrders: 0, pendingReviews: 0, unreadNotifications: 0 })
  const sidebarRef = useRef(null)
  const menuButtonRef = useRef(null)
  useEffect(() => { adminApi.dashboard({ range: "30d" }).then((result) => { const value = result?.data?.data || result?.data || result || {}; const orderCounts = value.orders || value.metrics?.orders || {}; const reviewCounts = value.reviews || value.metrics?.reviews || {}; setCounts({ pendingOrders: orderCounts.Pending || 0, pendingReviews: reviewCounts.Pending || 0, unreadNotifications: result?.meta?.unreadNotifications || value.notifications?.unread || 0 }) }).catch(() => {}) }, [location.pathname])
  useEffect(() => { const label = links.find((link) => location.pathname.startsWith(link.to))?.label || "Admin"; document.title = `${label} | Amazon Admin`; return () => { document.title = "Amazon.com" } }, [location.pathname])
  useEffect(() => { setMobileOpen(false); setProfileOpen(false) }, [location.pathname])
  useEffect(() => {
    if (!mobileOpen) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    sidebarRef.current?.querySelector("a, button")?.focus()
    const close = (event) => {
      if (event.key === "Escape") { setMobileOpen(false); menuButtonRef.current?.focus(); return }
      if (event.key !== "Tab") return
      const focusable = [...(sidebarRef.current?.querySelectorAll("a[href], button:not([disabled])") || [])]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener("keydown", close)
    return () => { document.removeEventListener("keydown", close); document.body.style.overflow = previousOverflow }
  }, [mobileOpen])
  useEffect(() => { const close = (event) => { if (!event.target.closest(".admin-profile-wrap")) setProfileOpen(false) }; document.addEventListener("click", close); return () => document.removeEventListener("click", close) }, [])
  const submitSearch = (event) => { event.preventDefault(); if (search.trim()) navigate(`/admin/search?q=${encodeURIComponent(search.trim())}`) }
  return <div className={`admin-app ${collapsed ? "admin-app--collapsed" : ""}`}>
    <header className="admin-header"><div className="admin-header__left"><button ref={menuButtonRef} className="admin-mobile-menu" type="button" onClick={() => setMobileOpen(true)} aria-label="Open admin navigation"><Menu size={21} /></button><Link to="/admin/dashboard" className="admin-brand"><span className="admin-brand__mark">amazon</span><strong>ADMIN</strong></Link><span className="admin-header__divider" /><span className="admin-header__context">Operations center</span></div><form className="admin-search" onSubmit={submitSearch}><Search size={17} /><input aria-label="Search admin data" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products, orders, customers…" /></form><div className="admin-header__actions"><Link className="admin-header-icon" to="/admin/notifications" aria-label={`Admin notifications, ${counts.unreadNotifications} unread`}><Bell size={19} />{counts.unreadNotifications > 0 && <b>{counts.unreadNotifications > 9 ? "9+" : counts.unreadNotifications}</b>}</Link><div className="admin-profile-wrap"><button className="admin-profile" type="button" onClick={() => setProfileOpen((value) => !value)} aria-expanded={profileOpen}><span className="admin-avatar">{admin?.name?.slice(0, 1).toUpperCase() || "A"}</span><span><strong>{admin?.name || "Administrator"}</strong><small>Administrator</small></span><ChevronDown size={14} /></button>{profileOpen && <div className="admin-profile-menu"><strong>{admin?.email}</strong><Link to="/admin/settings" onClick={() => setProfileOpen(false)}>Account settings</Link><button type="button" onClick={() => { logout(); navigate("/admin/login") }}>Sign out</button></div>}</div></div></header>
    <div className="admin-body"><aside ref={sidebarRef} className={`admin-sidebar ${mobileOpen ? "admin-sidebar--open" : ""}`}><div className="admin-sidebar__mobile-head"><strong>Admin navigation</strong><button type="button" className="admin-icon-button" onClick={() => setMobileOpen(false)} aria-label="Close admin navigation"><X size={19} /></button></div><nav aria-label="Admin navigation">{links.map(({ to, label, icon: Icon, badge }) => <NavLink key={to} to={to} className={({ isActive }) => isActive ? "is-active" : ""} onClick={() => setMobileOpen(false)}><Icon size={18} /><span>{label}</span>{badge && counts[badge] > 0 && <b>{counts[badge]}</b>}</NavLink>)}</nav><div className="admin-sidebar__footer"><Link to="/" target="_blank"><Home size={16} /> View storefront</Link><button type="button" onClick={() => setCollapsed((value) => !value)}>{collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />} {collapsed ? "Expand" : "Collapse"}</button></div></aside>{mobileOpen && <button className="admin-sidebar-overlay" type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}<main className="admin-main"><Outlet /></main></div>
  </div>
}
