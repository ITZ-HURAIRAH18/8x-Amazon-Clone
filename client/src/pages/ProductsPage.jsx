import { useEffect, useMemo, useState } from "react"
import { ChevronDown, ChevronLeft, ChevronRight, Filter, SlidersHorizontal, X } from "lucide-react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import ProductCard from "../components/ProductCard"
import { productApi, errorMessage } from "../services/api"
import demoProducts from "../data/demoProducts"
import { normalizeProduct } from "../utils/format"

const defaultCategories = ["All", "Electronics", "Computers", "Phones", "Home", "Kitchen", "Fashion", "Beauty", "Books", "Toys", "Grocery", "Sports", "Cameras", "Gaming"]
const sortOptions = [["featured", "Featured"], ["newest", "Newest arrivals"], ["priceAsc", "Price: Low to High"], ["priceDesc", "Price: High to Low"], ["rating", "Avg. customer review"], ["best-sellers", "Best Sellers"], ["biggest-discount", "Biggest Discount"]]

export default function ProductsPage() {
  const { category: routeCategory } = useParams()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const search = params.get("q") || params.get("search") || ""
  const category = routeCategory || params.get("category") || "All"
  const sort = params.get("sort") || "featured"
  const page = Math.max(1, Number(params.get("page")) || 1)
  const deals = params.get("deals") === "true" || params.get("deal") === "true"
  const featured = params.get("featured") === "true"
  const [products, setProducts] = useState([])
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 })
  const [facets, setFacets] = useState({ categories: defaultCategories.slice(1), brands: [], minPrice: 0, maxPrice: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [mobileFilters, setMobileFilters] = useState(false)

  const filterValues = useMemo(() => ({
    minPrice: params.get("minPrice") || "",
    maxPrice: params.get("maxPrice") || "",
    rating: params.get("rating") || "",
    brand: params.get("brand") || "",
    availability: params.get("availability") || "",
    minDiscount: params.get("minDiscount") || "",
    prime: params.get("prime") === "true",
  }), [params])
  const activeFilterCount = Object.values(filterValues).filter(Boolean).length + (deals ? 1 : 0) + (featured ? 1 : 0)

  useEffect(() => {
    let active = true
    productApi.facets().then((result) => { if (active && result) setFacets((current) => ({ ...current, ...result })) }).catch(() => {})
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError("")
    const query = { search, category: category === "All" ? "" : category, sort, deal: deals ? "true" : "", featured: featured ? "true" : "", ...filterValues, page, limit: 24 }
    Object.keys(query).forEach((key) => { if (query[key] === "" || query[key] === false) delete query[key] })
    productApi.list(query)
      .then((result) => { if (active) { setProducts((result.data || []).map(normalizeProduct)); setMeta(result.meta || { page: 1, pages: 1, total: 0 }) } })
      .catch((requestError) => {
        if (!active) return
        setError(errorMessage(requestError, "We could not load these products."))
        let fallback = [...demoProducts]
        const term = search.toLowerCase()
        if (term) fallback = fallback.filter((item) => `${item.title} ${item.description} ${item.category} ${item.brand}`.toLowerCase().includes(term))
        if (category !== "All") fallback = fallback.filter((item) => item.category.toLowerCase() === category.toLowerCase())
        if (filterValues.brand) fallback = fallback.filter((item) => item.brand === filterValues.brand)
        if (filterValues.minPrice) fallback = fallback.filter((item) => item.price >= Number(filterValues.minPrice))
        if (filterValues.maxPrice) fallback = fallback.filter((item) => item.price <= Number(filterValues.maxPrice))
        if (filterValues.rating) fallback = fallback.filter((item) => item.rating >= Number(filterValues.rating))
        if (filterValues.availability === "in-stock") fallback = fallback.filter((item) => item.stock > 0)
        if (filterValues.minDiscount) fallback = fallback.filter((item) => item.discount >= Number(filterValues.minDiscount))
        if (deals) fallback = fallback.filter((item) => item.deal)
        if (featured) fallback = fallback.filter((item) => item.featured)
        fallback.sort((a, b) => sort === "priceAsc" ? a.price - b.price : sort === "priceDesc" ? b.price - a.price : sort === "rating" ? b.rating - a.rating : Number(b.bestseller) - Number(a.bestseller))
        setProducts(fallback)
        setMeta({ page: 1, pages: 1, total: fallback.length })
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [search, category, sort, deals, featured, filterValues, page])

  const heading = search ? `Results for "${search}"` : category === "All" ? "All products" : category
  const updateParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value === "" || value === false || value == null) next.delete(key)
    else next.set(key, String(value))
    if (key !== "page") next.delete("page")
    setParams(next)
  }
  const setCategory = (value) => {
    const next = new URLSearchParams(params)
    if (value === "All") next.delete("category")
    else next.set("category", value)
    next.delete("page")
    if (routeCategory) navigate(`/search?${next.toString()}`)
    else setParams(next)
  }
  const clearFilters = () => {
    const next = new URLSearchParams()
    if (search) next.set("q", search)
    setParams(next)
  }
  const removeFilter = (key) => updateParam(key, "")
  const activeChips = [
    ...(filterValues.brand ? [{ key: "brand", label: `Brand: ${filterValues.brand}` }] : []),
    ...(filterValues.rating ? [{ key: "rating", label: `${filterValues.rating}+ stars` }] : []),
    ...(filterValues.minPrice || filterValues.maxPrice ? [{ key: "price", label: `$${filterValues.minPrice || "0"}–$${filterValues.maxPrice || facets.maxPrice || "Any"}` }] : []),
    ...(filterValues.availability ? [{ key: "availability", label: filterValues.availability === "in-stock" ? "In stock" : "Out of stock" }] : []),
    ...(filterValues.minDiscount ? [{ key: "minDiscount", label: `${filterValues.minDiscount}% off or more` }] : []),
    ...(deals ? [{ key: "deals", label: "Deals" }] : []),
    ...(featured ? [{ key: "featured", label: "Featured" }] : []),
  ]
  const pageCount = Math.max(1, Number(meta.pages) || 1)
  const goPage = (nextPage) => updateParam("page", Math.min(pageCount, Math.max(1, nextPage)))

  return <div className="products-page"><div className="container">
    <div className="breadcrumbs"><span>Home</span><span>›</span><strong>{category === "All" ? "All products" : category}</strong></div>
    <div className="results-heading"><div><h1>{heading}</h1><span>{loading ? "Searching…" : `${meta.total || products.length} result${meta.total === 1 ? "" : "s"}`}</span></div><button className="mobile-filter-button" type="button" onClick={() => setMobileFilters(true)}><Filter size={17} /> Filters {activeFilterCount > 0 && <b>{activeFilterCount}</b>}</button></div>
    {activeChips.length > 0 && <div className="active-filter-chips" aria-label="Active filters">{activeChips.map((chip) => <button type="button" className="filter-chip" key={chip.key} onClick={() => chip.key === "price" ? (removeFilter("minPrice"), removeFilter("maxPrice")) : removeFilter(chip.key)}>{chip.label}<X size={13} /></button>)}<button type="button" className="clear-filter-link" onClick={clearFilters}>Clear all</button></div>}
    <div className="results-layout">
      {mobileFilters && <button type="button" className="filter-overlay" aria-label="Close filters" onClick={() => setMobileFilters(false)} />}
      <aside className={`filter-sidebar ${mobileFilters ? "filter-sidebar--open" : ""}`} aria-label="Product filters">
        <div className="filter-sidebar__mobile-head"><strong>Filters</strong><button type="button" className="icon-button" onClick={() => setMobileFilters(false)} aria-label="Close filters"><X size={20} /></button></div>
        <div className="filter-title"><SlidersHorizontal size={17} /><strong>Filters</strong>{activeFilterCount > 0 && <button type="button" onClick={clearFilters}>Clear all</button>}</div>
        <FilterGroup title="Category"><label className="filter-radio"><input type="radio" name="category" checked={category === "All"} onChange={() => setCategory("All")} /> All</label>{[...new Set([...defaultCategories.slice(1), ...facets.categories])].map((option) => <label className="filter-radio" key={option}><input type="radio" name="category" checked={category === option} onChange={() => setCategory(option)} /> {option}</label>)}</FilterGroup>
        <FilterGroup title="Brand"><select className="filter-select" aria-label="Filter by brand" value={filterValues.brand} onChange={(event) => updateParam("brand", event.target.value)}><option value="">All brands</option>{facets.brands.map((brand) => <option value={brand} key={brand}>{brand}</option>)}</select></FilterGroup>
        <FilterGroup title="Price"><div className="price-inputs"><input aria-label="Minimum price" type="number" min="0" placeholder="$ Min" value={filterValues.minPrice} onChange={(event) => updateParam("minPrice", event.target.value)} /><span>to</span><input aria-label="Maximum price" type="number" min="0" placeholder="$ Max" value={filterValues.maxPrice} onChange={(event) => updateParam("maxPrice", event.target.value)} /></div></FilterGroup>
        <FilterGroup title="Customer rating">{[4, 3, 2].map((value) => <label className="filter-radio" key={value}><input type="radio" name="rating" checked={filterValues.rating === String(value)} onChange={() => updateParam("rating", value)} /> {value} stars & up</label>)}</FilterGroup>
        <FilterGroup title="Availability"><label className="filter-check"><input type="radio" name="availability" checked={!filterValues.availability} onChange={() => updateParam("availability", "")} /> All</label><label className="filter-check"><input type="radio" name="availability" checked={filterValues.availability === "in-stock"} onChange={() => updateParam("availability", "in-stock")} /> In stock</label><label className="filter-check"><input type="radio" name="availability" checked={filterValues.availability === "out-of-stock"} onChange={() => updateParam("availability", "out-of-stock")} /> Out of stock</label></FilterGroup>
        <FilterGroup title="Discount"><label className="filter-radio"><input type="radio" name="discount" checked={!filterValues.minDiscount} onChange={() => updateParam("minDiscount", "")} /> Any discount</label>{[10, 20, 30].map((value) => <label className="filter-radio" key={value}><input type="radio" name="discount" checked={filterValues.minDiscount === String(value)} onChange={() => updateParam("minDiscount", value)} /> {value}% off or more</label>)}</FilterGroup>
        <FilterGroup title="Delivery"><label className="filter-check"><input type="checkbox" checked={filterValues.prime} onChange={(event) => updateParam("prime", event.target.checked)} /> Prime-style delivery</label><label className="filter-check"><input type="checkbox" checked={deals} onChange={(event) => updateParam("deals", event.target.checked)} /> Today's Deals</label></FilterGroup>
        <button className="apply-filters-button" type="button" onClick={() => setMobileFilters(false)}>Apply filters</button>
      </aside>
      <section className="results-main">
        <div className="results-toolbar"><span>{meta.total ? `${(page - 1) * 24 + 1}–${Math.min(page * 24, meta.total)} of ${meta.total} results` : "No results"}</span><label>Sort by <select value={sort} onChange={(event) => updateParam("sort", event.target.value)} aria-label="Sort products">{sortOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><ChevronDown size={14} /></label></div>
        {loading ? <ProductGridSkeleton /> : error && products.length === 0 ? <div className="empty-state"><div className="empty-state__icon">!</div><h2>Unable to load products</h2><p>{error}</p><button className="primary-button" type="button" onClick={() => window.location.reload()}>Retry</button></div> : products.length === 0 ? <EmptyResults onClear={clearFilters} /> : <><div className="product-grid">{products.map((product) => <ProductCard product={product} key={product.id} />)}</div><Pagination page={page} pages={pageCount} onChange={goPage} /></>}
      </section>
    </div>
  </div></div>
}

function FilterGroup({ title, children }) { return <section className="filter-group"><h2>{title}</h2>{children}</section> }
function ProductGridSkeleton() { return <div className="product-grid">{[1, 2, 3, 4, 5, 6, 7, 8].map((item) => <div className="product-skeleton" key={item}><div /><span /><span /><span /></div>)}</div> }
function EmptyResults({ onClear }) { return <div className="empty-state"><div className="empty-state__icon">⌕</div><h2>No results found</h2><p>Try changing your search terms or clearing some filters.</p><button className="primary-button" type="button" onClick={onClear}>Clear filters</button></div> }
function Pagination({ page, pages, onChange }) { if (pages <= 1) return null; const numbers = Array.from({ length: Math.min(5, pages) }, (_, index) => Math.max(1, Math.min(pages - 4, page - 2)) + index); return <nav className="pagination" aria-label="Product pages"><button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1}><ChevronLeft size={16} /> Previous</button>{numbers.map((number) => <button type="button" className={number === page ? "active" : ""} aria-current={number === page ? "page" : undefined} onClick={() => onChange(number)} key={number}>{number}</button>)}<button type="button" onClick={() => onChange(page + 1)} disabled={page >= pages}>Next <ChevronRight size={16} /></button></nav> }
