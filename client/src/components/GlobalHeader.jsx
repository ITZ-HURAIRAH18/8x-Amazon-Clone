import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom"
import { ChevronDown, Globe, MapPin, Search, ShoppingCart } from "lucide-react"
import AmazonLogo from "./AmazonLogo"
import { useAuth, useCart } from "../context/StoreContext"

const categories = ["All", "Electronics", "Computers", "Phones", "Home", "Kitchen", "Fashion", "Beauty", "Books", "Toys", "Grocery", "Sports"]

export default function GlobalHeader() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const { user } = useAuth()
  const { count } = useCart()
  const [term, setTerm] = useState(params.get("q") || "")
  const [category, setCategory] = useState(params.get("category") || "All")

  useEffect(() => {
    setTerm(location.pathname === "/search" ? params.get("q") || "" : "")
    setCategory(location.pathname === "/search" ? params.get("category") || "All" : "All")
  }, [location.pathname, params])

  const submitSearch = (event) => {
    event.preventDefault()
    const query = new URLSearchParams()
    if (term.trim()) query.set("q", term.trim())
    if (category !== "All") query.set("category", category)
    navigate(`/search?${query.toString()}`)
  }

  return (
    <header className="global-header">
      <div className="header-main container">
        <button className="mobile-menu-button icon-button" type="button" aria-label="Open navigation" onClick={() => window.dispatchEvent(new CustomEvent("amazon:open-drawer"))}>
          <span className="hamburger-lines" aria-hidden="true"><i /><i /><i /></span>
        </button>
        <AmazonLogo />
        <button className="delivery-location" type="button" aria-label="Choose delivery location">
          <MapPin size={17} strokeWidth={2.2} />
          <span><small>Deliver to</small><strong>New York 10001</strong></span>
        </button>
        <form className="search-form" role="search" onSubmit={submitSearch}>
          <label className="sr-only" htmlFor="category-select">Search category</label>
          <select id="category-select" value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Search category">
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
          <label className="sr-only" htmlFor="site-search">Search Amazon</label>
          <input id="site-search" value={term} onChange={(event) => setTerm(event.target.value)} placeholder="Search Amazon" autoComplete="off" />
          <button className="search-submit" type="submit" aria-label="Submit search"><Search size={22} /></button>
        </form>
        <button className="language-button" type="button" aria-label="Choose language"><Globe size={19} /><span>EN</span><ChevronDown size={13} /></button>
        <Link className="header-account" to={user ? "/account" : "/login"}>
          <span><small>Hello, {user?.name?.split(" ")[0] || "sign in"}</small><strong>{user ? "Account & Lists" : "Sign in"}</strong></span>
          <ChevronDown size={13} />
        </Link>
        <Link className="header-orders" to={user ? "/account/orders" : "/login"}><span><small>Returns</small><strong>& Orders</strong></span></Link>
        <Link className="header-cart" to="/cart" aria-label={`Shopping cart, ${count} items`}>
          <span className="cart-icon-wrap"><ShoppingCart size={27} /><b>{count}</b></span>
          <span className="cart-label">Cart</span>
        </Link>
      </div>
    </header>
  )
}
