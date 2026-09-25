import { Link } from "react-router-dom"
import { usePageMeta } from "../utils/seo"

export default function NotFoundPage() {
  usePageMeta("Page Not Found", "The page you requested could not be found.")
  return <div className="container not-found-page"><span className="section-eyebrow">404</span><h1>Page not found</h1><p>We couldn't find the page you were looking for.</p><div className="confirmation-actions"><Link className="primary-button" to="/">Return to homepage</Link><Link className="secondary-button" to="/search">Continue shopping</Link></div></div>
}
