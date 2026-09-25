import { useState } from "react"
import { Link } from "react-router-dom"
import { Heart, ShoppingCart } from "lucide-react"
import RatingStars from "./RatingStars"
import Price from "./Price"
import { useCart } from "../context/StoreContext"

export default function ProductCard({ product }) {
  const { addToCart } = useCart()
  const [added, setAdded] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const image = product.images?.[0]
  const add = async (event) => {
    event.preventDefault()
    await addToCart(product, 1)
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1600)
  }
  return <article className="product-card"><div className="product-card__image-wrap"><Link to={`/product/${product.id}`} aria-label={product.title}>{product.badge && <span className="product-badge">{product.badge}</span>}{image && !imageFailed ? <img src={image} alt={product.title} loading="lazy" onError={() => setImageFailed(true)} /> : <div className="image-fallback">{product.brand || "Product image"}</div>}</Link><button className="wishlist-button" type="button" aria-label={`Save ${product.title}`} onClick={() => {}}><Heart size={17} /></button></div><div className="product-card__body">{product.prime && <span className="prime-line">prime</span>}<Link to={`/product/${product.id}`} className="product-card__title-link"><h3>{product.title}</h3></Link><RatingStars rating={product.rating} count={product.reviewCount} compact /><Price product={product} compact /><span className="delivery-line">{product.delivery || "FREE delivery"}</span><button className="card-add-button" type="button" onClick={add} disabled={product.stock < 1}>{added ? "Added to cart" : <><ShoppingCart size={16} /> Add to cart</>}</button></div></article>
}
