import { Link } from "react-router-dom"
import { ArrowUp, ChevronDown, Globe } from "lucide-react"

const columns = [
  { title: "Get to Know Us", links: ["About Amazon", "Careers", "Press Releases", "Amazon Science", "Amazon Sustainability"] },
  { title: "Make Money with Us", links: ["Sell products on Amazon", "Sell on Amazon Business", "Sell apps on Amazon", "Advertise with Amazon", "Amazon Associates"] },
  { title: "Amazon Payment Products", links: ["Amazon Business Card", "Amazon Pay", "Amazon Gift Cards", "Amazon Reload"] },
  { title: "Let Us Help You", links: ["Your Account", "Shipping Rates", "Returns", "Order Status", "Help Center"] },
]

export default function Footer() {
  return (
    <footer className="site-footer">
      <button className="back-to-top" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><ArrowUp size={17} />Back to top</button>
      <div className="footer-columns container">
        {columns.map((column) => <section className="footer-column" key={column.title}><h3>{column.title}</h3>{column.links.map((link) => <Link key={link} to="/search">{link}</Link>)}</section>)}
      </div>
      <div className="footer-services container"><Link to="/">Amazon Music</Link><Link to="/">Amazon Prime</Link><Link to="/">Amazon Web Services</Link><Link to="/">Amazon Ads</Link><Link to="/">Amazon Kids</Link><Link to="/">Amazon Books</Link></div>
      <div className="footer-bottom container"><span>© 2026 Amazon Clone. For demonstration purposes.</span><div className="footer-selects"><button type="button"><Globe size={14} /> English <ChevronDown size={12} /></button><button type="button">United States <ChevronDown size={12} /></button></div><div className="footer-legal"><Link to="/">Conditions of Use</Link><Link to="/">Privacy Notice</Link><Link to="/">Interest-Based Ads</Link></div></div>
    </footer>
  )
}
