import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, Clock3, Gift, ShieldCheck, Truck } from "lucide-react"
import HeroCarousel from "../components/HeroCarousel"
import CategoryCard from "../components/CategoryCard"
import ProductCarousel from "../components/ProductCarousel"
import ProductCard from "../components/ProductCard"
import { productApi, errorMessage } from "../services/api"
import demoProducts from "../data/demoProducts"
import { normalizeProduct } from "../utils/format"
import { useShoppingMemory } from "../context/StoreContext"
import { usePageMeta } from "../utils/seo"

const homepageCategories = ["Electronics", "Computers", "Phones", "Home", "Kitchen", "Fashion", "Beauty", "Books", "Toys", "Grocery", "Sports", "Gaming", "Cameras"]

export default function HomePage() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState(homepageCategories)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const { recent } = useShoppingMemory()
  usePageMeta("Amazon Clone — Shop Electronics, Home, Fashion and More", "Shop electronics, computers, home, kitchen, fashion, beauty, books, and more with fast delivery.")
  useEffect(() => {
    let active = true
    // The catalog is larger than a single page, so the homepage pulls the first
    // four pages in parallel to fill every category tile and carousel.
    Promise.all([1, 2, 3, 4].map((page) => productApi.list({ limit: 60, page, sort: "featured" })))
      .then((pages) => {
        if (!active) return
        const merged = pages.flatMap((result) => result.data || []).map(normalizeProduct)
        const unique = [...new Map(merged.map((product) => [product.id, product])).values()]
        setProducts(unique)
        const present = [...new Set(unique.map((product) => product.category).filter(Boolean))]
        setCategories(homepageCategories.filter((name) => present.includes(name)).length >= 4 ? homepageCategories.filter((name) => present.includes(name)) : present.slice(0, 6))
      })
      .catch((requestError) => { if (active) { setProducts(demoProducts); setError(errorMessage(requestError)) } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  const groups = useMemo(() => {
    const recentCategories = new Set(recent.map((item) => item.category).filter(Boolean))
    const recentBrands = new Set(recent.map((item) => item.brand).filter(Boolean))
    const personalized = products.filter((product) => (recentCategories.has(product.category) || recentBrands.has(product.brand)) && !recent.some((item) => item.id === product.id))
    return {
      featured: products.filter((product) => product.featured).slice(0, 10),
      deals: products.filter((product) => product.deal).sort((a, b) => b.discount - a.discount).slice(0, 10),
      bestsellers: products.filter((product) => product.bestseller).slice(0, 10),
      recommended: [...new Map([...personalized, ...products.filter((product) => !product.deal && product.featured)].map((product) => [product.id, product])).values()].slice(0, 10),
    }
  }, [products, recent])
  const recentProducts = recent.filter((item) => products.some((product) => String(product.id) === String(item.id))).slice(0, 8)
  return <div className="home-page"><div className="container home-container">{error && <div className="demo-notice"><span>Showing the local catalog while the API reconnects.</span><Link to="/search">Browse all <ArrowRight size={14} /></Link></div>}<HeroCarousel /><div className="service-strip"><div><Truck size={20} /><span><strong>Fast, free delivery</strong><small>On millions of items</small></span></div><div><ShieldCheck size={20} /><span><strong>Secure payments</strong><small>Protected checkout</small></span></div><div><Clock3 size={20} /><span><strong>Easy returns</strong><small>30-day returns</small></span></div><div><Gift size={20} /><span><strong>Gift options</strong><small>For every occasion</small></span></div></div>{loading ? <HomeSkeleton /> : <><section className="category-grid">{categories.map((category) => <CategoryCard key={category} category={category} products={products.filter((product) => product.category === category).slice(0, 4)} />)}</section><ProductCarousel title="Today's Deals" products={groups.deals} action={{ href: "/deals", label: "See all deals" }} /><ProductCarousel title="Best Sellers" products={groups.bestsellers} action={{ href: "/search?sort=best-sellers", label: "Shop best sellers" }} /><ProductCarousel title="Featured products" products={groups.featured} action={{ href: "/search?featured=true", label: "Explore featured" }} /><ProductCarousel title="Electronics" products={products.filter((product) => product.category === "Electronics").slice(0, 10)} action={{ href: "/search?category=Electronics", label: "Shop Electronics" }} /><ProductCarousel title="Computers" products={products.filter((product) => product.category === "Computers").slice(0, 10)} action={{ href: "/search?category=Computers", label: "Shop Computers" }} /><section className="home-split"><div className="home-split__copy"><span className="section-eyebrow">Amazon Prime</span><h2>Free delivery on millions of items</h2><p>Get the speed and convenience you need, with free delivery on eligible items and easy returns.</p><Link to="/register">Join Prime <ArrowRight size={17} /></Link></div><div className="home-split__image" /></section><ProductCarousel title="Home & Kitchen" products={products.filter((product) => ["Home", "Kitchen"].includes(product.category)).slice(0, 10)} action={{ href: "/search?category=Home", label: "Shop Home & Kitchen" }} /><ProductCarousel title="Fashion" products={products.filter((product) => product.category === "Fashion").slice(0, 10)} action={{ href: "/search?category=Fashion", label: "Shop Fashion" }} /><ProductCarousel title="Beauty" products={products.filter((product) => product.category === "Beauty").slice(0, 10)} action={{ href: "/search?category=Beauty", label: "Shop Beauty" }} /><ProductCarousel title="Books" products={products.filter((product) => product.category === "Books").slice(0, 10)} action={{ href: "/search?category=Books", label: "Shop Books" }} /><ProductCarousel title="Recommended for you" products={groups.recommended} action={{ href: "/search", label: "Explore more" }} />{recentProducts.length > 0 && <ProductCarousel title="Recently viewed" products={recentProducts} action={{ href: "/search", label: "Continue shopping" }} />}<section className="home-deal-banner"><div><span className="section-eyebrow">Limited time</span><h2>Save on the things you use every day</h2><p>Discover practical prices across home, kitchen, tech, and more.</p><Link to="/deals">Shop deals <ArrowRight size={17} /></Link></div><div className="home-deal-banner__products">{groups.deals.slice(0, 3).map((product) => <Link key={product.id} to={`/product/${product.id}`}><img src={product.images?.[0]} alt={product.title} /><span>{product.title}</span></Link>)}</div></section></>}</div></div>
}

function HomeSkeleton() { return <div className="home-skeleton" aria-label="Loading products"><div className="skeleton skeleton--hero" /><div className="skeleton-grid">{[1, 2, 3, 4].map((item) => <div className="skeleton skeleton--card" key={item} />)}</div></div> }
