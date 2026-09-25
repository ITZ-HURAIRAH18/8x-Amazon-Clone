import { Link } from "react-router-dom"
import { ChevronDown, Menu } from "lucide-react"

const links = [
  ["Today's Deals", "/deals"],
  ["Customer Service", "/account"],
  ["Registry", "/search?category=Home"],
  ["Gift Cards", "/search?category=Books"],
  ["Sell", "/search?featured=true"],
]

export default function SecondaryNav() {
  return (
    <nav className="secondary-nav" aria-label="Secondary navigation">
      <div className="container secondary-nav__inner">
        <button className="all-menu-button" type="button" onClick={() => window.dispatchEvent(new CustomEvent("amazon:open-drawer"))}>
          <Menu size={19} /><span>All</span><ChevronDown size={13} />
        </button>
        {links.map(([label, href]) => <Link key={label} to={href}>{label}</Link>)}
        <Link to="/search?category=Electronics" className="secondary-nav__deal">Shop the latest</Link>
        <span className="secondary-nav__spacer" />
        <Link to="/account" className="secondary-nav__small">Your Account</Link>
      </div>
    </nav>
  )
}
