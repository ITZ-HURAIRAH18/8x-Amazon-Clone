import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Heart, ShoppingCart, Trash2 } from "lucide-react"
import ProductCard from "../components/ProductCard"
import { useWishlist } from "../context/StoreContext"
import { money } from "../utils/format"
import { usePageMeta } from "../utils/seo"

export default function WishlistPage() {
  const { items, count, loading, error, clear, moveToCart, remove } = useWishlist()
  const navigate = useNavigate()
  const [busy, setBusy] = useState("")
  usePageMeta("Your Wishlist", "Keep track of products you want to buy later.")
  const move = async (product) => { setBusy(product.id); await moveToCart(product); setBusy("") }
  const removeAll = async () => { if (window.confirm("Remove all items from your wishlist?")) await clear() }
  return <div className="wishlist-page"><div className="container"><div className="breadcrumbs"><Link to="/">Home</Link><span>›</span><strong>Your Wishlist</strong></div><div className="page-title-row"><div><h1>Your Wishlist</h1><p>{count ? `${count} item${count === 1 ? "" : "s"} saved for later` : "Save products you want to revisit."}</p></div>{items.length > 0 && <div className="wishlist-heading-actions"><button className="secondary-button" type="button" onClick={removeAll}><Trash2 size={16} /> Clear all</button><button className="primary-button" type="button" onClick={() => navigate("/cart")}><ShoppingCart size={16} /> View cart</button></div>}</div>{error && <div className="form-alert" role="alert">{error}</div>}{loading ? <WishlistSkeleton /> : items.length === 0 ? <div className="empty-state wishlist-empty"><Heart size={44} /><h2>Your wishlist is waiting for something great</h2><p>Tap the heart on any product to save it here.</p><Link className="primary-button" to="/search">Start shopping</Link></div> : <><div className="wishlist-layout"><section className="wishlist-grid">{items.map(({ product }) => <div className="wishlist-item" key={product.id}><ProductCard product={product} /><div className="wishlist-item__actions"><button className="wishlist-move-button" type="button" onClick={() => move(product)} disabled={busy === product.id || product.stock < 1}>{busy === product.id ? <><span className="wishlist-move-button__spinner" aria-hidden="true" /> Moving to cart…</> : <><ShoppingCart size={16} /> Move to cart</>}</button><button className="delete-link" type="button" onClick={() => remove(product)}><Trash2 size={14} /> Remove</button></div></div>)}</section><aside className="wishlist-summary"><h2>Wishlist summary</h2><p>Items you saved for later</p><strong>{count} item{count === 1 ? "" : "s"}</strong><span>Total value {money(items.reduce((sum, item) => sum + item.product.price, 0))}</span><button className="primary-button" type="button" onClick={() => navigate("/cart")}>Go to cart</button></aside></div></>}</div></div>
}

function WishlistSkeleton() { return <div className="product-grid">{[1, 2, 3, 4].map((item) => <div className="product-skeleton" key={item}><div /><span /><span /><span /></div>)}</div> }
