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
    event.stopPropagation()
    await addToCart(product, 1)
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1600)
  }
  return <article className="product-card"><Link to={`/product/${product.id}`} className="product-card__link"><div className="product-card__image-wrap">{product.badge && <span className="product-badge">{product.badge}</span>}<button className="wishlist-button" type="button" aria-label={`Save ${product.title}`} onClick={(event) => event.preventDefault()}><Heart size={17} /></button>{image && !imageFailed ? <img src={image} alt={product.title} loading="lazy" onError={() => setImageFailed(true)} /> : <div className="image-fallback">{product.brand || "Product image"}</div>}</div><div className="product-card__body">{product.prime && <span className="prime-line">prime</span>}<h3>{product.title}</h3><RatingStars rating={product.rating} count={product.reviewCount} compact /><Price product={product} compact /><span className="delivery-line">{product.delivery || "FREE delivery"}</span><button className="card-add-button" type="button" onClick={add} disabled={product.stock < 1}>{added ? "Added to cart" : <><ShoppingCart size={16} /> Add to cart</>}</button></div></Link></article>
}
