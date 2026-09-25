import { useEffect, useMemo, useState } from "react"
import { Check, ChevronRight, Heart, RotateCcw, Scale, ShieldCheck, ShoppingCart, Truck, X } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router-dom"
import QuantitySelector from "../components/QuantitySelector"
import Price from "../components/Price"
import RatingStars from "../components/RatingStars"
import ProductCarousel from "../components/ProductCarousel"
import ProductCard from "../components/ProductCard"
import { productApi, errorMessage } from "../services/api"
import demoProducts from "../data/demoProducts"
import { normalizeProduct, formatDate } from "../utils/format"
import { useAuth, useCart, useShoppingMemory, useWishlist } from "../context/StoreContext"
import { usePageMeta } from "../utils/seo"

export default function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToCart } = useCart()
  const { contains, add, remove } = useWishlist()
  const { addRecent, compare, toggleCompare: toggleCompareProduct } = useShoppingMemory()
  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [reviews, setReviews] = useState({ reviews: [], summary: { average: 0, total: 0, distribution: {} } })
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [imageFailed, setImageFailed] = useState(false)
  const [zoom, setZoom] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [added, setAdded] = useState(false)
  const [reviewBusy, setReviewBusy] = useState(false)
  const [reviewMessage, setReviewMessage] = useState("")
  usePageMeta(product?.title || "Product details", product?.description || "Explore product details, reviews, and delivery options.")

  useEffect(() => {
    let active = true
    setLoading(true)
    setError("")
    productApi.get(id).then((data) => { if (active) setProduct(normalizeProduct(data)) }).catch((requestError) => {
      const local = demoProducts.find((item) => item.id === id || item.slug === id)
      if (!active) return
      if (local) setProduct(normalizeProduct(local))
      else setError(errorMessage(requestError, "Product not found"))
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])
  useEffect(() => {
    if (!product) return
    setSelectedImage(0); setImageFailed(false); setQuantity(1); addRecent(product)
    productApi.recommendations(product.id).then((items) => setRelated((items || []).map(normalizeProduct))).catch(() => {
      const source = [...demoProducts].sort((a, b) => (b.category === product.category) - (a.category === product.category) || (b.brand === product.brand) - (a.brand === product.brand) || b.rating - a.rating)
      setRelated(source.filter((item) => item.id !== product.id).slice(0, 8).map(normalizeProduct))
    })
    productApi.reviews(product.id, { sort: "recent" }).then((result) => setReviews(result.data || result)).catch(() => {})
  }, [product])
  const images = product?.images?.length ? product.images : product?.image ? [product.image] : []
  const isSaved = product ? contains(product) : false
  const isCompared = product ? compare.some((item) => String(item.id || item._id) === String(product.id)) : false
  const similar = useMemo(() => related.filter((item) => item.id !== product?.id), [related, product])
  const frequentlyBought = similar.slice(0, 3)
  const { addRecent: addRecentProduct } = useShoppingMemory()
  const handleAdd = async () => { if (await addToCart(product, quantity)) { setAdded(true); window.setTimeout(() => setAdded(false), 1800) } }
  const buyNow = async () => { if (await addToCart(product, quantity)) navigate(user ? "/checkout" : "/login", { state: { from: "/checkout" } }) }
  const toggleWishlist = async () => { if (isSaved) await remove(product); else await add(product) }
  const toggleCompare = () => toggleCompareProduct(product)
  const submitReview = async (event) => {
    event.preventDefault()
    if (!user) { navigate("/login", { state: { from: `/product/${id}` } }); return }
    const form = new FormData(event.currentTarget)
    setReviewBusy(true); setReviewMessage("")
    try {
      await productApi.createReview(product.id, { rating: Number(form.get("rating")), title: form.get("title"), comment: form.get("comment") })
      setReviewMessage("Thanks for sharing your review.")
      event.currentTarget.reset()
      const result = await productApi.reviews(product.id, { sort: "recent" })
      setReviews(result.data || result)
    } catch (requestError) { setReviewMessage(errorMessage(requestError, "We could not submit your review.")) } finally { setReviewBusy(false) }
  }
  const refreshReviews = async () => { const result = await productApi.reviews(product.id, { sort: "recent" }); setReviews(result.data || result) }
  if (loading) return <div className="container detail-loading"><div className="skeleton skeleton--detail" /></div>
  if (error || !product) return <div className="container empty-state detail-not-found"><h1>Product not found</h1><p>{error || "This product is no longer available."}</p><Link className="primary-button" to="/search">Continue shopping</Link></div>
  return <div className="product-detail-page"><div className="container">
    <div className="breadcrumbs"><Link to="/">Home</Link><span>›</span><Link to={`/search?category=${encodeURIComponent(product.category)}`}>{product.category}</Link><span>›</span><strong>{product.title}</strong></div>
    <div className="detail-layout">
      <section className="product-gallery"><div className={`gallery-main ${zoom ? "is-zoomed" : ""}`} onMouseEnter={() => setZoom(true)} onMouseLeave={() => setZoom(false)}><button type="button" className="gallery-main__image-button" onClick={() => setZoom((value) => !value)} aria-label={zoom ? "Zoom out product image" : "Zoom in product image"}>{images[selectedImage] && !imageFailed ? <img src={images[selectedImage]} alt={product.title} onError={() => setImageFailed(true)} /> : <div className="detail-image-fallback">{product.brand}<small>Image unavailable</small></div>}</button><span className="gallery-zoom-hint">Hover to zoom</span></div><div className="gallery-thumbs">{images.map((image, imageIndex) => <button className={selectedImage === imageIndex ? "active" : ""} type="button" key={`${image}-${imageIndex}`} onClick={() => { setSelectedImage(imageIndex); setImageFailed(false) }} aria-label={`View image ${imageIndex + 1}`}><img src={image} alt="" /></button>)}</div></section>
      <section className="detail-info"><div className="detail-brand">{product.brand} <span>Visit the {product.brand} Store</span></div><h1>{product.title}</h1><div className="detail-rating"><RatingStars rating={reviews.summary.average || product.rating} /><a href="#reviews">{(reviews.summary.total || product.reviewCount || 0).toLocaleString()} ratings</a><span className="detail-separator">|</span><a href="#reviews">Amazon's Choice</a></div><div className="detail-price"><Price product={product} /></div><div className="detail-list"><p>{product.description}</p><ul>{(product.features || []).map((feature) => <li key={feature}><span>•</span>{feature}</li>)}</ul></div><div className="detail-stock"><strong>{product.stock > 0 ? "In Stock" : "Currently unavailable"}</strong>{product.stock > 0 && <span>{product.stock < 10 ? `Only ${product.stock} left in stock` : "Ships from Amazon Clone"}</span>}</div></section>
      <aside className="purchase-panel"><div className="purchase-panel__price"><Price product={product} /></div><div className="purchase-delivery"><Truck size={20} /><span><strong>FREE delivery</strong><small>{product.delivery?.replace("FREE delivery ", "") || "Sep 29"}</small></span></div><div className="purchase-stock"><span className="stock-dot" />{product.stock > 0 ? "In Stock" : "Out of stock"}</div><div className="purchase-field"><label htmlFor="detail-quantity">Quantity:</label><QuantitySelector id="detail-quantity" value={quantity} max={product.stock || 1} onChange={setQuantity} /></div><button className="primary-button purchase-button" type="button" onClick={handleAdd} disabled={product.stock < 1}>{added ? <><Check size={17} /> Added to cart</> : <><ShoppingCart size={18} /> Add to Cart</>}</button><button className="buy-button primary-button" type="button" onClick={buyNow} disabled={product.stock < 1}>Buy Now</button><button className={`wishlist-detail-button ${isSaved ? "is-saved" : ""}`} type="button" onClick={toggleWishlist}><Heart size={17} fill={isSaved ? "currentColor" : "none"} /> {isSaved ? "Saved to wishlist" : "Add to Wishlist"}</button><button className={`compare-detail-button ${isCompared ? "is-active" : ""}`} type="button" onClick={toggleCompare}><Scale size={16} /> {isCompared ? "Remove from Compare" : "Add to Compare"}</button><div className="purchase-assurances"><span><ShieldCheck size={16} /> Secure transaction</span><span><RotateCcw size={16} /> 30-day returns</span></div><div className="purchase-detail"><strong>Product details</strong><p>Brand: {product.brand}</p><p>Category: {product.category}</p><p>Seller: Amazon Clone</p></div></aside>
    </div>
    <div className="detail-lower"><section className="feature-panel"><h2>Product details</h2><ul>{(product.features || []).map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul>{product.specifications && <table className="spec-table"><tbody>{Object.entries(product.specifications).map(([key, value]) => <tr key={key}><th>{key}</th><td>{String(value)}</td></tr>)}</tbody></table>}<p>{product.description}</p></section><section className="review-panel" id="reviews"><ReviewSection reviews={reviews} user={user} productId={product.id} onSubmit={submitReview} onChanged={refreshReviews} busy={reviewBusy} message={reviewMessage} /></section></div>
    {frequentlyBought.length > 0 && <section className="frequently-bought"><div className="section-heading"><div><span className="section-eyebrow">Complete your setup</span><h2>Frequently bought together</h2></div><button className="primary-button" type="button" onClick={async () => { for (const item of frequentlyBought) await addToCart(item, 1) }}>Add all to cart</button></div><div className="frequently-bought__grid">{frequentlyBought.map((item) => <ProductCard key={item.id} product={item} />)}</div></section>}
    {similar.length > 0 && <ProductCarousel title="Customers who viewed this item also viewed" products={similar} action={{ href: `/search?category=${encodeURIComponent(product.category)}`, label: "See more" }} />}
    {frequentlyBought.length > 0 && <ProductCarousel title="Similar items" products={similar.slice(0, 6)} action={{ href: "/search", label: "Explore more" }} />}
    <RecentViewed excludeId={product.id} onOpen={(item) => addRecentProduct(item)} />
  </div></div>
}

function ReviewSection({ reviews, user, productId, onSubmit, onChanged, busy, message }) {
  const [sort, setSort] = useState("recent")
  const [showForm, setShowForm] = useState(false)
  const [actionBusy, setActionBusy] = useState("")
  const ordered = useMemo(() => [...(reviews.reviews || [])].sort((a, b) => sort === "highest" ? b.rating - a.rating : sort === "lowest" ? a.rating - b.rating : sort === "helpful" ? b.helpfulCount - a.helpfulCount : new Date(b.createdAt) - new Date(a.createdAt)), [reviews, sort])
  const summary = reviews.summary || { average: 0, total: 0, distribution: {} }
  const editReview = async (review) => {
    const title = window.prompt("Edit review title", review.title)
    if (title == null) return
    const comment = window.prompt("Edit your review", review.comment)
    if (comment == null) return
    const ratingText = window.prompt("Rating (1–5)", String(review.rating))
    const rating = Number(ratingText)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return
    setActionBusy(review.id)
    try { await productApi.updateReview(productId, review.id, { title, comment, rating }); await onChanged() } finally { setActionBusy("") }
  }
  const deleteReview = async (review) => {
    if (!window.confirm("Delete this review?")) return
    setActionBusy(review.id)
    try { await productApi.deleteReview(productId, review.id); await onChanged() } finally { setActionBusy("") }
  }
  return <><div className="review-panel__heading"><div><h2>Customer reviews</h2><span>{summary.total || 0} verified ratings</span></div><label className="review-sort">Sort <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="recent">Most recent</option><option value="highest">Highest rating</option><option value="lowest">Lowest rating</option><option value="helpful">Most helpful</option></select></label></div><div className="review-summary"><strong>{summary.average || "—"}</strong><div><RatingStars rating={summary.average || 0} /><span>Based on {summary.total || 0} reviews</span></div><button className="secondary-button" type="button" onClick={() => setShowForm((value) => !value)}>{showForm ? "Close" : "Write a review"}</button></div><div className="review-bars">{[5, 4, 3, 2, 1].map((star) => <div key={star}><span>{star} star{star === 1 ? "" : "s"}</span><i><b style={{ width: `${summary.total ? ((summary.distribution?.[star] || 0) / summary.total) * 100 : 0}%` }} /></i><em>{summary.distribution?.[star] || 0}</em></div>)}</div>{showForm && <form className="review-form" onSubmit={onSubmit}><h3>{user ? "Share your experience" : "Sign in to write a review"}</h3>{!user && <p>Only signed-in customers who purchased this product can leave a review.</p>}<label>Rating<select name="rating" defaultValue="5"><option value="5">5 — Excellent</option><option value="4">4 — Good</option><option value="3">3 — Average</option><option value="2">2 — Poor</option><option value="1">1 — Bad</option></select></label><label>Title<input name="title" required maxLength={120} placeholder="Sum it up in a few words" /></label><label>Review<textarea name="comment" required maxLength={2000} rows={4} placeholder="What did you like or dislike?" /></label><button className="primary-button" type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit review"}</button>{message && <p className="form-alert">{message}</p>}</form>}<div className="review-list">{ordered.length === 0 ? <p className="review-empty">No written reviews yet. Be the first to share a verified experience.</p> : ordered.map((review) => <article className="review-item" key={review.id}><div className="review-item__top"><RatingStars rating={review.rating} /><span>{formatDate(review.createdAt)}</span></div><h3>{review.title}</h3><p>{review.comment}</p><span className="verified-review">{review.verifiedPurchase && <><Check size={13} /> Verified purchase</>}</span>{user && String(review.user?.id || "") === String(user._id || user.id) && <span className="review-owner-actions"><button type="button" className="delete-link" onClick={() => editReview(review)} disabled={actionBusy === review.id}>Edit</button><button type="button" className="delete-link" onClick={() => deleteReview(review)} disabled={actionBusy === review.id}>Delete</button></span>}<small>Review by {review.user?.name || "Amazon customer"}</small></article>)}</div></>
}

function RecentViewed({ excludeId }) {
  const { recent } = useShoppingMemory()
  const items = recent.filter((item) => String(item.id || item._id) !== String(excludeId)).slice(0, 8)
  if (!items.length) return null
  return <ProductCarousel title="Recently viewed" products={items} action={{ href: "/search", label: "Continue shopping" }} />
}
