import { useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { ChevronRight, X } from "lucide-react"
import { useAuth } from "../context/StoreContext"

const drawerGroups = [
  { title: "Shop by Department", links: [["Electronics", "/search?category=Electronics"], ["Computers", "/search?category=Computers"], ["Home & Kitchen", "/search?category=Kitchen"], ["Fashion", "/search?category=Fashion"]] },
  { title: "Programs & Features", links: [["Today's Deals", "/deals"], ["Best Sellers", "/search?sort=best-sellers"], ["New Releases", "/search?sort=newest"], ["Compare Products", "/compare"]] },
  { title: "Help & Settings", links: [["Customer Service", "/account"], ["Your Orders", "/account/orders"], ["Your Account", "/account"], ["Your Wishlist", "/wishlist"]] },
]

export default function SideDrawer({ open, onClose }) {
  const closeRef = useRef(null)
  const drawerRef = useRef(null)
  const { user } = useAuth()

  useEffect(() => {
    if (!open) return undefined
    closeRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose()
        return
      }
      if (event.key !== "Tab") return
      const focusable = [...(drawerRef.current?.querySelectorAll("a[href], button:not([disabled])") || [])]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    document.body.classList.add("drawer-open")
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.classList.remove("drawer-open")
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="drawer-layer" role="presentation">
      <button className="drawer-overlay" type="button" aria-label="Close navigation" onClick={onClose} />
      <aside ref={drawerRef} className="side-drawer" role="dialog" aria-modal="true" aria-label="All categories">
        <div className="side-drawer__header"><strong>{user ? `Hello, ${user.name.split(" ")[0]}` : "Hello, sign in"}</strong><button ref={closeRef} className="icon-button" type="button" onClick={onClose} aria-label="Close navigation"><X size={22} /></button></div>
        {user ? <Link className="drawer-account-link" to="/account" onClick={onClose}>Your Account <ChevronRight size={16} /></Link> : <Link className="drawer-signin" to="/login" onClick={onClose}>Sign in securely</Link>}
        <div className="drawer-divider" />
        {drawerGroups.map((group) => <section className="drawer-group" key={group.title}><h3>{group.title}</h3>{group.links.map(([label, href]) => <Link key={label} to={href} onClick={onClose}>{label}</Link>)}</section>)}
        <section className="drawer-group drawer-group--muted"><h3>Discover more</h3><Link to="/search?category=Grocery" onClick={onClose}>Grocery</Link><Link to="/search?category=Books" onClick={onClose}>Books</Link></section>
      </aside>
    </div>
  )
}
