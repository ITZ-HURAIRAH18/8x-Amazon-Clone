import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Clock3, Tag, Zap } from "lucide-react"
import ProductCard from "../components/ProductCard"
import { productApi, errorMessage } from "../services/api"
import demoProducts from "../data/demoProducts"
import { normalizeProduct, money } from "../utils/format"
import { usePageMeta } from "../utils/seo"

export default function DealsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [now, setNow] = useState(Date.now())
  usePageMeta("Today's Deals", "Shop limited-time deals and lightning offers.")
  useEffect(() => { let active = true; productApi.list({ deal: "true", limit: 48, sort: "biggest-discount" }).then((result) => { if (active) setProducts((result.data || []).map(normalizeProduct)) }).catch((requestError) => { if (active) { setError(errorMessage(requestError)); setProducts(demoProducts.filter((item) => item.deal)) } }).finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [])
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer) }, [])
  const dealEnd = useMemo(() => products.reduce((latest, product) => Math.max(latest, new Date(product.dealEndsAt || Date.now() + 8 * 60 * 60 * 1000).getTime()), 0), [products])
  const remaining = Math.max(0, dealEnd - now)
  const hours = String(Math.floor(remaining / 3600000)).padStart(2, "0")
  const minutes = String(Math.floor((remaining % 3600000) / 60000)).padStart(2, "0")
  const seconds = String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0")
  return <div className="deals-page"><div className="container"><div className="breadcrumbs"><Link to="/">Home</Link><span>›</span><strong>Today's Deals</strong></div><section className="deals-hero"><div><span className="section-eyebrow"><Zap size={14} /> Limited time</span><h1>Today's Deals</h1><p>Save on hand-picked products across electronics, home, fashion, and more.</p><div className="deal-countdown" aria-label={`${hours} hours ${minutes} minutes ${seconds} seconds remaining`}><Clock3 size={18} /><strong>{hours}</strong><span>:</span><strong>{minutes}</strong><span>:</span><strong>{seconds}</strong><small>HRS : MIN : SEC</small></div></div><Tag className="deals-hero__icon" size={100} /></section>{error && <div className="demo-notice"><span>Live deal data is reconnecting; showing the local catalog.</span></div>}{loading ? <div className="product-grid">{[1, 2, 3, 4, 5, 6, 7, 8].map((item) => <div className="product-skeleton" key={item}><div /><span /><span /><span /></div>)}</div> : products.length === 0 ? <div className="empty-state"><h2>No active deals right now</h2><p>Check back soon for fresh savings.</p><Link className="primary-button" to="/search">Browse all products</Link></div> : <><div className="deal-summary"><strong>{products.length} deals available</strong><span>Prices and availability are subject to change.</span></div><div className="product-grid deals-grid">{products.map((product) => <div className="deal-card-wrap" key={product.id}><ProductCard product={product} /><div className="deal-progress"><span style={{ width: `${Math.min(95, Math.max(12, 100 - product.stock * 2))}%` }} /></div><small>{product.stock < 10 ? `Only ${product.stock} left at this price` : `${product.discount || 0}% off`}</small></div>)}</div></>}</div></div>
}
