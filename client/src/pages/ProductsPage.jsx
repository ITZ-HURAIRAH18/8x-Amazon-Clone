import { useEffect, useMemo, useState } from "react"
import { ChevronDown, Filter, SlidersHorizontal, X } from "lucide-react"
import { useParams, useSearchParams } from "react-router-dom"
import ProductCard from "../components/ProductCard"
import { productApi, errorMessage } from "../services/api"
import demoProducts from "../data/demoProducts"
import { normalizeProduct, money } from "../utils/format"

const categoryOptions = ["All", "Electronics", "Computers", "Phones", "Home", "Kitchen", "Fashion", "Beauty", "Books", "Toys", "Grocery", "Sports", "Cameras", "Gaming"]
const sortOptions = [["featured", "Featured"], ["newest", "Newest arrivals"], ["priceAsc", "Price: Low to High"], ["priceDesc", "Price: High to Low"], ["rating", "Avg. customer review"], ["reviews", "Most reviewed"]]

export default function ProductsPage() {
  const { category: routeCategory } = useParams()
  const [params, setParams] = useSearchParams()
  const search = params.get("q") || ""
  const category = routeCategory || params.get("category") || "All"
  const sort = params.get("sort") || "featured"
  const deals = params.get("deals") === "true"
  const featured = params.get("featured") === "true"
  const [filters, setFilters] = useState({ minPrice: "", maxPrice: "", rating: "", brand: "", availability: "" })
  const [products, setProducts] = useState([])
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [mobileFilters, setMobileFilters] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError("")
    const query = { search, category: category === "All" ? "" : category, sort, deal: deals ? "true" : "", featured: featured ? "true" : "", ...filters, page: params.get("page") || 1, limit: 24 }
    Object.keys(query).forEach((key) => { if (query[key] === "") delete query[key] })
    productApi.list(query)
      .then((result) => { if (active) { setProducts((result.data || []).map(normalizeProduct)); setMeta(result.meta || { page: 1, pages: 1, total: 0 }) } })
      .catch((requestError) => {
        if (!active) return
        setError(errorMessage(requestError))
        let fallback = [...demoProducts]
        if (search) fallback = fallback.filter((item) => `${item.title} ${item.category} ${item.brand}`.toLowerCase().includes(search.toLowerCase()))
        if (category !== "All") fallback = fallback.filter((item) => item.category.toLowerCase() === category.toLowerCase())
        if (filters.minPrice) fallback = fallback.filter((item) => item.price >= Number(filters.minPrice))
        if (filters.maxPrice) fallback = fallback.filter((item) => item.price <= Number(filters.maxPrice))
        if (filters.rating) fallback = fallback.filter((item) => item.rating >= Number(filters.rating))
        if (filters.availability === "in-stock") fallback = fallback.filter((item) => item.stock > 0)
        if (deals) fallback = fallback.filter((item) => item.deal)
        if (featured) fallback = fallback.filter((item) => item.featured)
        setProducts(fallback)
        setMeta({ page: 1, pages: 1, total: fallback.length })
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [search, category, sort, deals, featured, filters, params])

  const heading = useMemo(() => search ? `Results for "${search}"` : category === "All" ? "All products" : category, [search, category])
  const updateParam = (key, value) => { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); if (key !== "page") next.delete("page"); setParams(next) }
  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }))
  const clearFilters = () => setFilters({ minPrice: "", maxPrice: "", rating: "", brand: "", availability: "" })
  const activeFilterCount = Object.values(filters).filter(Boolean).length

  return <div className="products-page"><div className="container"><div className="breadcrumbs"><span>Home</span><span>›</span><strong>{category === "All" ? "All products" : category}</strong></div><div className="results-heading"><div><h1>{heading}</h1><span>{loading ? "Searching…" : `${meta.total || products.length} result${meta.total === 1 ? "" : "s"}`}</span></div><button className="mobile-filter-button" type="button" onClick={() => setMobileFilters(true)}><Filter size={17} /> Filters {activeFilterCount > 0 && <b>{activeFilterCount}</b>}</button></div><div className="results-layout"><aside className={`filter-sidebar ${mobileFilters ? "filter-sidebar--open" : ""}`}><div className="filter-sidebar__mobile-head"><strong>Filters</strong><button type="button" className="icon-button" onClick={() => setMobileFilters(false)} aria-label="Close filters"><X size={20} /></button></div><div className="filter-title"><SlidersHorizontal size={17} /><strong>Filters</strong>{activeFilterCount > 0 && <button type="button" onClick={clearFilters}>Clear all</button>}</div><FilterGroup title="Category"><label className="filter-radio"><input type="radio" name="category" checked={category === "All"} onChange={() => updateParam("category", "")} /> All</label>{categoryOptions.slice(1).map((option) => <label className="filter-radio" key={option}><input type="radio" name="category" checked={category === option} onChange={() => updateParam("category", option)} /> {option}</label>)}</FilterGroup><FilterGroup title="Price"><div className="price-inputs"><input aria-label="Minimum price" type="number" min="0" placeholder="$ Min" value={filters.minPrice} onChange={(event) => setFilter("minPrice", event.target.value)} /><span>to</span><input aria-label="Maximum price" type="number" min="0" placeholder="$ Max" value={filters.maxPrice} onChange={(event) => setFilter("maxPrice", event.target.value)} /></div></FilterGroup><FilterGroup title="Customer rating"><label className="filter-radio"><input type="radio" name="rating" checked={!filters.rating} onChange={() => setFilter("rating", "")} /> All ratings</label>{[4, 3].map((rating) => <label className="filter-radio" key={rating}><input type="radio" name="rating" checked={filters.rating === String(rating)} onChange={() => setFilter("rating", rating)} /> {rating} stars & up</label>)}</FilterGroup><FilterGroup title="Availability"><label className="filter-check"><input type="checkbox" checked={filters.availability === "in-stock"} onChange={(event) => setFilter("availability", event.target.checked ? "in-stock" : "")} /> In stock</label></FilterGroup><button className="apply-filters-button" type="button" onClick={() => setMobileFilters(false)}>Apply filters</button></aside>{mobileFilters && <button className="filter-overlay" type="button" aria-label="Close filters" onClick={() => setMobileFilters(false)} />}<section className="results-content"><div className="results-toolbar"><span>{products.length > 0 ? "Products" : ""}</span><label>Sort by <select value={sort} onChange={(event) => updateParam("sort", event.target.value)}>{sortOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><ChevronDown size={14} /></label></div>{error && <div className="inline-notice">Live catalog unavailable; showing local results. <button type="button" onClick={() => window.location.reload()}>Retry</button></div>}{loading ? <ProductGridSkeleton /> : products.length === 0 ? <EmptyResults onClear={clearFilters} /> : <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>}{meta.pages > 1 && <div className="pagination"><button type="button" disabled={meta.page <= 1} onClick={() => updateParam("page", Number(meta.page) - 1)}>Previous</button><span>Page {meta.page} of {meta.pages}</span><button type="button" disabled={meta.page >= meta.pages} onClick={() => updateParam("page", Number(meta.page) + 1)}>Next</button></div>}</section></div></div></div>
}

function FilterGroup({ title, children }) { return <section className="filter-group"><h2>{title}</h2>{children}</section> }
function ProductGridSkeleton() { return <div className="product-grid">{[1, 2, 3, 4, 5, 6, 7, 8].map((item) => <div className="product-skeleton" key={item}><div /><span /><span /><span /></div>)}</div> }
function EmptyResults({ onClear }) { return <div className="empty-state"><div className="empty-state__icon">⌕</div><h2>No results found</h2><p>Try changing your search terms or clearing some filters.</p><button type="button" onClick={onClear}>Clear filters</button></div> }
