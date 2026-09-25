import { useEffect, useState } from "react"
import { Check, ChevronRight, Heart, RotateCcw, ShieldCheck, ShoppingCart, Truck } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router-dom"
import QuantitySelector from "../components/QuantitySelector"
import Price from "../components/Price"
import RatingStars from "../components/RatingStars"
import ProductCarousel from "../components/ProductCarousel"
import { productApi, errorMessage } from "../services/api"
import demoProducts from "../data/demoProducts"
import { normalizeProduct } from "../utils/format"
import { useAuth, useCart } from "../context/StoreContext"

export default function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToCart } = useCart()
  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [imageFailed, setImageFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [added, setAdded] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    productApi.get(id)
      .then((data) => { if (active) setProduct(normalizeProduct(data)) })
      .catch((requestError) => {
        const local = demoProducts.find((item) => item.id === id || item.slug === id)
        if (!active) return
        if (local) setProduct(normalizeProduct(local))
        else setError(errorMessage(requestError, "Product not found"))
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  useEffect(() => {
    if (!product) return
    setSelectedImage(0)
    setImageFailed(false)
    const source = product.category === "Electronics" ? demoProducts.filter((item) => item.category === "Electronics") : demoProducts.filter((item) => item.category === product.category)
    setRelated(source.filter((item) => item.id !== product.id).slice(0, 8))
  }, [product])

  const handleAdd = async () => {
    await addToCart(product, quantity)
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1800)
  }
  const buyNow = async () => {
    await addToCart(product, quantity)
    navigate(user ? "/checkout" : "/login", { state: { from: "/checkout" } })
  }

  if (loading) return <div className="container detail-loading"><div className="skeleton skeleton--detail" /></div>
  if (error || !product) return <div className="container empty-state detail-not-found"><h1>Product not found</h1><p>{error || "This product is no longer available."}</p><Link className="primary-button" to="/search">Continue shopping</Link></div>

  const images = product.images?.length ? product.images : [product.image]
  return <div className="product-detail-page"><div className="container"><div className="breadcrumbs"><Link to="/">Home</Link><span>›</span><Link to={`/search?category=${encodeURIComponent(product.category)}`}>{product.category}</Link><span>›</span><strong>{product.title}</strong></div><div className="detail-layout"><section className="product-gallery"><div className="gallery-main">{images[selectedImage] && !imageFailed ? <img src={images[selectedImage]} alt={product.title} onError={() => setImageFailed(true)} /> : <div className="detail-image-fallback">{product.brand}<small>Image unavailable</small></div>}</div><div className="gallery-thumbs">{images.map((image, imageIndex) => <button className={selectedImage === imageIndex ? "active" : ""} type="button" key={`${image}-${imageIndex}`} onClick={() => setSelectedImage(imageIndex)} aria-label={`View image ${imageIndex + 1}`}><img src={image} alt="" /></button>)}</div></section><section className="detail-info"><div className="detail-brand">{product.brand} <span>Visit the {product.brand} Store</span></div><h1>{product.title}</h1><div className="detail-rating"><RatingStars rating={product.rating} /><a href="#reviews">{product.reviewCount?.toLocaleString()} ratings</a><span className="detail-separator">|</span><a href="#reviews">Amazon's Choice</a></div><div className="detail-price"><Price product={product} /></div><div className="detail-list"><p>{product.description}</p><ul>{(product.features || []).map((feature) => <li key={feature}><span>•</span>{feature}</li>)}</ul></div><div className="detail-stock"><strong>{product.stock > 0 ? "In Stock" : "Currently unavailable"}</strong>{product.stock > 0 && <span>Only {product.stock} left in stock</span>}</div></section><aside className="purchase-panel"><div className="purchase-panel__price"><Price product={product} /></div><div className="purchase-delivery"><Truck size={20} /><span><strong>FREE delivery</strong><small>{product.delivery?.replace("FREE delivery ", "") || "Sep 29"}</small></span></div><div className="purchase-stock"><span className="stock-dot" />{product.stock > 10 ? "In Stock" : `Only ${product.stock} left in stock`}</div><div className="purchase-field"><label>Quantity</label><QuantitySelector value={quantity} onChange={setQuantity} max={product.stock || 1} /></div><button className="primary-button purchase-button" type="button" disabled={product.stock < 1} onClick={handleAdd}>{added ? <><Check size={18} /> Added to cart</> : <><ShoppingCart size={18} /> Add to Cart</>}</button><button className="secondary-button buy-button" type="button" disabled={product.stock < 1} onClick={buyNow}>Buy Now</button><div className="purchase-assurances"><span><ShieldCheck size={15} /> Secure transaction</span><span><RotateCcw size={15} /> Free returns</span></div><div className="purchase-detail"><strong>Product information</strong><p>Brand: {product.brand}</p><p>Category: {product.category}</p><p>Model: {product.sku || "AMZ-CATALOG"}</p></div></aside></div><div className="detail-lower"><section className="feature-panel"><h2>About this item</h2><ul>{(product.features || []).map((feature) => <li key={feature}><Check size={16} />{feature}</li>)}</ul><p>{product.description} Designed to fit into your everyday routine with reliable materials and thoughtful details.</p></section><section className="review-panel" id="reviews"><h2>Customer reviews</h2><div className="review-summary"><strong>{product.rating}</strong><div><RatingStars rating={product.rating} /><span>Based on {product.reviewCount?.toLocaleString()} ratings</span></div></div><div className="review-bars">{[5, 4, 3, 2, 1].map((star) => <div key={star}><span>{star} star</span><i><b style={{ width: `${star === 5 ? 78 : star === 4 ? 15 : star === 3 ? 4 : 2}%` }} /></i><em>{star === 5 ? "78%" : star === 4 ? "15%" : star === 3 ? "4%" : "2%"}</em></div>)}</div></section></div>{related.length > 0 && <ProductCarousel title={`More in ${product.category}`} products={related} />}</div></div>
}
