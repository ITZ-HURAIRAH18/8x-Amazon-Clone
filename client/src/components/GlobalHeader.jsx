import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { Bell, ChevronDown, Globe, Heart, MapPin, Search, ShoppingCart, UserRound, X } from "lucide-react"
import AmazonLogo from "./AmazonLogo"
import { productApi } from "../services/api"
import { useAuth, useCart, useNotifications, useWishlist } from "../context/StoreContext"

const RECENT_KEY = "amazon_clone_recent_searches"

export default function GlobalHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const { user, logout } = useAuth()
  const { count, subtotal } = useCart()
  const { count: wishlistCount } = useWishlist()
  const { items: notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const [term, setTerm] = useState(params.get("q") || "")
  const [category, setCategory] = useState(params.get("category") || "All")
  const [locationOpen, setLocationOpen] = useState(false)
  const [languageOpen, setLanguageOpen] = useState(false)
  const [language, setLanguage] = useState("EN")
  const [accountOpen, setAccountOpen] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [recentSearches, setRecentSearches] = useState(() => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]") } catch { return [] } })
  const [postalCode, setPostalCode] = useState(() => localStorage.getItem("amazon_clone_postal_code") || "10001")
  // The category list comes from the catalog so a new seeded category appears
  // in the header filter without a code change.
  const [categories, setCategories] = useState(["All"])
  const searchRef = useRef(null)

  useEffect(() => {
    productApi.facets().then((result) => {
      const names = (result?.categories || []).filter(Boolean)
      if (names.length) setCategories(["All", ...names])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    setTerm(location.pathname === "/search" ? params.get("q") || params.get("search") || "" : "")
    setCategory(location.pathname === "/search" ? params.get("category") || "All" : "All")
  }, [location.pathname, params])
  useEffect(() => {
    const query = term.trim()
    if (query.length < 2) { setSuggestions([]); return undefined }
    const timer = window.setTimeout(() => {
      productApi.list({ search: query, limit: 6, sort: "featured" }).then((result) => setSuggestions((result.data || []).slice(0, 6))).catch(() => setSuggestions([]))
    }, 180)
    return () => window.clearTimeout(timer)
  }, [term])
  useEffect(() => {
    const close = (event) => { if (event.key === "Escape") { setLocationOpen(false); setLanguageOpen(false); setAccountOpen(false); setNotificationOpen(false); setSearchOpen(false) } }
    const outside = (event) => { if (!event.target.closest(".header-popover-wrap") && !event.target.closest(".search-input-wrap")) { setAccountOpen(false); setNotificationOpen(false); setSearchOpen(false) } }
    document.addEventListener("keydown", close)
    document.addEventListener("click", outside)
    return () => { document.removeEventListener("keydown", close); document.removeEventListener("click", outside) }
  }, [])
  const accountName = user?.name?.split(" ")[0] || "sign in"
  const displaySuggestions = useMemo(() => term.trim().length >= 2 ? suggestions : recentSearches.slice(0, 5).map((value) => ({ recent: value })), [suggestions, recentSearches, term])
  const submitSearch = (event, value = term) => {
    event?.preventDefault()
    const query = new URLSearchParams()
    const clean = value.trim()
    if (clean) query.set("q", clean)
    if (category !== "All") query.set("category", category)
    if (clean) {
      const next = [clean, ...recentSearches.filter((entry) => entry.toLowerCase() !== clean.toLowerCase())].slice(0, 8)
      setRecentSearches(next)
      localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    }
    setSearchOpen(false)
    // With no search term the catalog route is the correct destination, otherwise
    // the results route carries the search term and the chosen category.
    const target = clean || category !== "All" ? `/search?${query.toString()}` : "/products"
    navigate(target)
  }
  const chooseSuggestion = (value) => { setTerm(value); submitSearch(null, value) }
  const applyLocation = () => { localStorage.setItem("amazon_clone_postal_code", postalCode); setLocationOpen(false) }
  const toggleNotification = () => { setNotificationOpen((value) => !value); setAccountOpen(false) }
  return <header className="global-header">
    <div className="header-main container">
      <button className="mobile-menu-button icon-button" type="button" aria-label="Open navigation" onClick={() => window.dispatchEvent(new CustomEvent("amazon:open-drawer"))}><span className="hamburger-lines" aria-hidden="true"><i /><i /><i /></span></button>
      <AmazonLogo />
      <button className="delivery-location" type="button" aria-label="Choose delivery location" aria-expanded={locationOpen} onClick={() => setLocationOpen((value) => !value)}><MapPin size={17} strokeWidth={2.2} /><span><small>Deliver to</small><strong>New York {postalCode}</strong></span></button>
      <form className="search-form" role="search" onSubmit={submitSearch}>
        <label className="sr-only" htmlFor="category-select">Search category</label><select id="category-select" value={category} onChange={(event) => { setCategory(event.target.value); submitSearch(event, term) }} aria-label="Search category">{categories.map((item) => <option key={item}>{item}</option>)}</select>
        <label className="sr-only" htmlFor="site-search">Search Amazon</label><div className="search-input-wrap"><input ref={searchRef} id="site-search" value={term} onFocus={() => setSearchOpen(true)} onChange={(event) => { setTerm(event.target.value); setSearchOpen(true) }} placeholder="Search Amazon" autoComplete="off" />{term && <button type="button" className="search-clear" aria-label="Clear search" onClick={() => { setTerm(""); searchRef.current?.focus() }}><X size={15} /></button>}{searchOpen && displaySuggestions.length > 0 && <div className="search-suggestions" role="listbox">{displaySuggestions.map((item, index) => { const value = item.recent || item.title; return <button type="button" role="option" key={`${value}-${index}`} onMouseDown={(event) => event.preventDefault()} onClick={() => chooseSuggestion(value)}><Search size={15} /><span>{value}</span>{item.recent && <small>Recent</small>}</button> })}<button type="button" className="search-suggestion-all" onClick={() => submitSearch(null)}>See all results <ChevronDown size={14} /></button></div>}</div>
        <button className="search-submit" type="submit" aria-label="Submit search"><Search size={22} /></button>
      </form>
      <button className="language-button" type="button" aria-label="Choose language" aria-expanded={languageOpen} onClick={() => setLanguageOpen((value) => !value)}><Globe size={19} /><span>{language}</span><ChevronDown size={13} /></button>
      <div className="header-popover-wrap"><button className="header-account" type="button" aria-expanded={accountOpen} onClick={() => { setAccountOpen((value) => !value); setNotificationOpen(false) }}><span><small>Hello, {accountName}</small><strong>{user ? "Account & Lists" : "Sign in"}</strong></span><ChevronDown size={13} /></button>{accountOpen && <div className="account-popover">{user ? <><strong>Hello, {user.name}</strong><Link to="/account" onClick={() => setAccountOpen(false)}><UserRound size={16} /> Your account</Link><Link to="/account/orders" onClick={() => setAccountOpen(false)}>Your orders</Link><Link to="/wishlist" onClick={() => setAccountOpen(false)}><Heart size={16} /> Your wishlist <small>{wishlistCount}</small></Link><button type="button" onClick={() => { logout(); setAccountOpen(false); navigate("/") }}>Sign out</button></> : <><strong>Sign in for the best experience</strong><Link className="primary-button" to="/login" onClick={() => setAccountOpen(false)}>Sign in</Link><Link to="/register" onClick={() => setAccountOpen(false)}>Create an account</Link></>}</div>}</div>
      <Link className="header-orders" to={user ? "/account/orders" : "/login"}><span><small>Returns</small><strong>& Orders</strong></span></Link>
      <Link className="header-wishlist" to="/wishlist" aria-label={`Wishlist, ${wishlistCount} items`}><Heart size={21} fill={wishlistCount ? "currentColor" : "none"} /><span>{wishlistCount > 99 ? "99+" : wishlistCount}</span></Link>
      <div className="header-popover-wrap"><button className="header-notifications" type="button" aria-label={`Notifications, ${unreadCount} unread`} aria-expanded={notificationOpen} onClick={toggleNotification}><Bell size={21} />{unreadCount > 0 && <b>{unreadCount > 9 ? "9+" : unreadCount}</b>}</button>{notificationOpen && <div className="notification-popover"><div className="notification-popover__heading"><strong>Notifications</strong>{unreadCount > 0 && <button type="button" onClick={markAllRead}>Mark all read</button>}</div>{notifications.length === 0 ? <p>You're all caught up.</p> : notifications.slice(0, 6).map((item) => <Link key={item.id} to={item.link || "/account"} className={`notification-item ${item.read ? "" : "is-unread"}`} onClick={() => { markRead(item.id); setNotificationOpen(false) }}><strong>{item.title}</strong><span>{item.message}</span></Link>)}</div>}</div>
      <Link className="header-cart" to="/cart" aria-label={`Shopping cart, ${count} items`}><span className="cart-icon-wrap"><ShoppingCart size={27} /><b>{count}</b></span><span className="cart-label">Cart</span><small className="cart-subtotal">${subtotal.toFixed(2)}</small></Link>
    </div>
    {locationOpen && <div className="location-popover"><div className="location-popover__heading"><div><strong>Deliver to</strong><span>Choose a destination for delivery dates</span></div><button type="button" className="icon-button" onClick={() => setLocationOpen(false)} aria-label="Close location dialog">×</button></div><label>Postal code<input value={postalCode} onChange={(event) => setPostalCode(event.target.value)} inputMode="numeric" /></label><button className="primary-button" type="button" onClick={applyLocation}>Apply</button></div>}
    {languageOpen && <div className="language-popover"><strong>Language</strong>{[["EN", "English"], ["ES", "Español"], ["DE", "Deutsch"], ["FR", "Français"]].map(([code, label]) => <button type="button" key={code} onClick={() => { setLanguage(code); document.documentElement.lang = code.toLowerCase(); setLanguageOpen(false) }}>{label}</button>)}</div>}
  </header>
}
