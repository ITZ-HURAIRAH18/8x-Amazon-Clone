import { Link } from "react-router-dom"

export default function NotFoundPage() {
  return <div className="container not-found-page"><span className="section-eyebrow">404</span><h1>Page not found</h1><p>We couldn't find the page you were looking for.</p><Link className="primary-button" to="/">Return to homepage</Link></div>
}
