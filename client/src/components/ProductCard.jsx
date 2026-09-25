import { useState } from "react"
import { Link } from "react-router-dom"
import { Check, Heart, Scale, ShoppingCart } from "lucide-react"
import RatingStars from "./RatingStars"
import Price from "./Price"
import { useCart, useShoppingMemory, useWishlist } from "../context/StoreContext"

const productId = (product) => String(product?.id || product?._id || product?.slug || "")

export default function ProductCard({ product }) {
  const { addToCart } = useCart()
  const { contains, add, remove } = useWishlist()
  const { compare, toggleCompare: toggleCompareProduct } = useShoppingMemory()
  const [added, setAdded] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const image = product.images?.[0]
  const saved = contains(product)
  const compared = compare.some((item) => productId(item) === productId(product))
  const addCart = async (event) => {
    event.preventDefault()
    const success = await addToCart(product, 1)
    if (success) {
      setAdded(true)
      window.setTimeout(() => setAdded(false), 1600)
    }
  }
  const toggleWishlist = async (event) => {
    event.preventDefault()
    if (saved) await remove(product)
    else await add(product)
  }
  const toggleCompare = (event) => {
    event.preventDefault()
    toggleCompareProduct(product)
  }
  const badge = product.badge || (product.bestseller ? "Best Seller" : product.deal ? "Limited Time Deal" : product.discount >= 20 ? `${product.discount}% off` : "")
  return <article className="product-card">
    <div className="product-card__image-wrap">
      <Link to={`/product/${product.id}`} aria-label={product.title}>
        {badge && <span className={`product-badge ${product.bestseller ? "product-badge--bestseller" : product.deal ? "product-badge--deal" : ""}`}>{badge}</span>}
        {image && !imageFailed ? <img src={image} alt={product.title} loading="lazy" onError={() => setImageFailed(true)} /> : <div className="image-fallback">{product.brand || "Product image"}</div>}
      </Link>
      <button className={`wishlist-button ${saved ? "is-saved" : ""}`} type="button" aria-label={`${saved ? "Remove" : "Save"} ${product.title}`} aria-pressed={saved} onClick={toggleWishlist}><Heart size={17} fill={saved ? "currentColor" : "none"} /></button>
    </div>
    <div className="product-card__body">
      {product.prime && <span className="prime-line">prime</span>}
      <Link to={`/product/${product.id}`} className="product-card__title-link"><h3>{product.title}</h3></Link>
      <RatingStars rating={product.rating} count={product.reviewCount} compact />
      <Price product={product} compact />
      <span className="delivery-line">{product.delivery || "FREE delivery"}</span>
      <div className="product-card__actions">
        <button className="card-add-button" type="button" onClick={addCart} disabled={product.stock < 1}>{added ? <><Check size={15} /> Added</> : <><ShoppingCart size={16} /> Add to cart</>}</button>
        <button className={`card-compare-button ${compared ? "is-active" : ""}`} type="button" onClick={toggleCompare} aria-pressed={compared} aria-label={`${compared ? "Remove" : "Add"} ${product.title} ${compared ? "from" : "to"} comparison`}><Scale size={15} /> {compared ? "Added" : "Compare"}</button>
      </div>
    </div>
  </article>
}
