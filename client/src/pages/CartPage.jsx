import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowRight, Heart, LockKeyhole, RotateCcw, ShoppingCart, Tag, Trash2 } from "lucide-react"
import QuantitySelector from "../components/QuantitySelector"
import ProductCarousel from "../components/ProductCarousel"
import { couponApi, errorMessage } from "../services/api"
import { money } from "../utils/format"
import { useAuth, useCart, useWishlist } from "../context/StoreContext"
import { usePageMeta } from "../utils/seo"

export default function CartPage() {
  const { items, savedItems, count, subtotal, loading, error, updateQuantity, removeItem, saveForLater, moveSavedToCart, removeSaved, unavailableItems } = useCart()
  const { user } = useAuth()
  const { add } = useWishlist()
  const navigate = useNavigate()
  const [busy, setBusy] = useState("")
  const [couponCode, setCouponCode] = useState("")
  const [coupon, setCoupon] = useState(null)
  const [couponError, setCouponError] = useState("")
  const [couponBusy, setCouponBusy] = useState(false)
  usePageMeta("Shopping Cart", "Review the items in your Amazon Clone shopping cart.")
  const discount = coupon ? Number(coupon.discount || 0) : 0
  const shippingBase = subtotal >= 35 || subtotal === 0 ? 0 : 5.99
  const shipping = coupon?.shippingCoupon ? 0 : shippingBase
  const taxableSubtotal = Math.max(0, subtotal - (coupon?.shippingCoupon ? 0 : discount))
  const tax = taxableSubtotal * 0.08
  const total = taxableSubtotal + shipping + tax
  const savings = discount + (coupon?.shippingCoupon ? shippingBase : 0)
  const recommendations = useMemo(() => items.length ? items.map((item) => item.product).filter((product) => product.category === items[0].product.category && product.id !== items[0].product.id).slice(0, 6) : [], [items])
  const goCheckout = () => navigate(user ? "/checkout" : "/login", { state: { from: "/checkout" } })
  const applyCoupon = async (event) => {
    event.preventDefault(); setCouponError(""); setCouponBusy(true)
    const code = couponCode.trim().toUpperCase()
    if (!code) { setCouponBusy(false); return }
    try {
      if (user) {
        const result = await couponApi.validate(code, subtotal)
        setCoupon({ code, discount: code === "FREESHIP" ? 0 : result.discount, shippingCoupon: code === "FREESHIP", shipping: result.shipping })
      } else if (code === "SAVE10" && subtotal >= 25) setCoupon({ code, discount: Math.min(50, subtotal * 0.1), shippingCoupon: false })
      else if (code === "WELCOME5" && subtotal >= 20) setCoupon({ code, discount: 5, shippingCoupon: false })
      else if (code === "FREESHIP") setCoupon({ code, discount: 0, shippingCoupon: true })
      else throw new Error("This coupon is not valid for this order")
    } catch (requestError) { setCouponError(errorMessage(requestError, "This coupon could not be applied.")); setCoupon(null) } finally { setCouponBusy(false) }
  }
  const moveToWishlist = async (item) => { if (await add(item.product)) await removeItem(item.id) }
  return <div className="cart-page"><div className="container"><div className="breadcrumbs"><Link to="/">Home</Link><span>›</span><strong>Shopping Cart</strong></div><div className="cart-heading"><h1>Shopping Cart</h1>{items.length > 0 && <span>{count} item{count === 1 ? "" : "s"}</span>}</div>{error && <div className="form-alert" role="alert">{error}</div>}{unavailableItems.length > 0 && <div className="inline-notice" role="alert">Some saved items are no longer available. Remove unavailable products to continue to checkout.</div>}{loading ? <CartSkeleton /> : items.length === 0 && savedItems.length === 0 ? <EmptyCart /> : <div className="cart-layout"><section className="cart-items"><div className="cart-delivery"><strong>Delivery date</strong><span>{count > 0 ? "Choose your delivery option at checkout" : "Your saved items will appear here"}</span></div>{items.map((item) => <article className="cart-item" key={item.id}><Link to={`/product/${item.product.id}`} className="cart-item__image"><img src={item.product.images?.[0]} alt={item.product.title} /></Link><div className="cart-item__details"><Link to={`/product/${item.product.id}`} className="cart-item__title">{item.product.title}</Link><span className="cart-item__seller">Sold by Amazon Clone</span><strong className="cart-item__price">{money(item.product.price)}</strong><div className="cart-item__actions"><QuantitySelector value={item.quantity} max={item.product.stock || 99} onChange={(value) => updateQuantity(item.id, value)} /><button type="button" className="delete-link" disabled={busy === item.id} onClick={async () => { setBusy(item.id); await removeItem(item.id); setBusy("") }}><Trash2 size={15} /> Delete</button><button type="button" className="delete-link" onClick={() => saveForLater(item.id)}><RotateCcw size={15} /> Save for later</button><button type="button" className="delete-link" onClick={() => moveToWishlist(item)}><Heart size={15} /> Move to wishlist</button></div><span className={`cart-item__stock ${item.product.stock < 1 ? "is-unavailable" : ""}`}>{item.product.stock > 0 ? item.product.stock < 10 ? `Only ${item.product.stock} left in stock` : "In Stock" : "Out of stock"}</span></div><strong className="cart-item__total">{money(item.product.price * item.quantity)}</strong></article>)}<div className="cart-subtotal-row"><span>Subtotal ({count} item{count === 1 ? "" : "s"}):</span><strong>{money(subtotal)}</strong></div></section><aside className="cart-summary"><h2>Order Summary</h2><div className="summary-row"><span>Items ({count}):</span><strong>{money(subtotal)}</strong></div>{discount > 0 && <div className="summary-row summary-row--discount"><span>Coupon discount</span><strong>−{money(discount)}</strong></div>}<div className="summary-row"><span>Shipping & handling:</span><strong>{shipping ? money(shipping) : "FREE"}</strong></div><div className="summary-row"><span>Estimated tax:</span><strong>{money(tax)}</strong></div><div className="summary-total"><span>Order total:</span><strong>{money(total)}</strong></div>{savings > 0 && <div className="cart-savings">You save {money(savings)} on this order</div>}<button className="primary-button checkout-button" type="button" onClick={goCheckout} disabled={items.length === 0}>Proceed to checkout</button><div className="secure-note"><LockKeyhole size={14} /> Secure checkout</div><form className="coupon-form" onSubmit={applyCoupon}><label htmlFor="cart-coupon"><Tag size={15} /> Add a coupon</label><div><input id="cart-coupon" value={couponCode} onChange={(event) => setCouponCode(event.target.value)} placeholder="Enter code" /><button type="submit" className="secondary-button" disabled={couponBusy}>{couponBusy ? "Checking…" : "Apply"}</button></div>{coupon && <div className="coupon-applied"><span>{coupon.code} applied</span><button type="button" onClick={() => { setCoupon(null); setCouponCode("") }}>Remove</button></div>}{couponError && <small className="form-error">{couponError}</small>}</form></aside></div>}{savedItems.length > 0 && <section className="saved-for-later"><div className="section-heading"><h2>Saved for later</h2><span>{savedItems.length} item{savedItems.length === 1 ? "" : "s"}</span></div><div className="saved-item-list">{savedItems.map((item) => <div className="saved-item" key={item.id}><img src={item.product.images?.[0]} alt={item.product.title} /><div><Link to={`/product/${item.product.id}`}>{item.product.title}</Link><strong>{money(item.product.price)}</strong><span>{item.product.stock > 0 ? "In stock" : "Currently unavailable"}</span></div><button className="primary-button" type="button" onClick={() => moveSavedToCart(item.id)} disabled={item.product.stock < 1}>Move to cart</button><button className="icon-button" type="button" onClick={() => removeSaved(item.id)} aria-label={`Remove ${item.product.title} from saved items`}><Trash2 size={16} /></button></div>)}</div></section>}{recommendations.length > 0 && <ProductCarousel title="Frequently bought together" products={recommendations} />}</div></div>
}

function EmptyCart() { return <div className="empty-cart"><div className="empty-cart__icon"><ShoppingCart size={42} /></div><h2>Your Amazon Cart is empty</h2><p>Shop our most popular products and add something you love.</p><Link className="primary-button empty-cart__button" to="/search">Continue shopping <ArrowRight size={16} /></Link></div> }
function CartSkeleton() { return <div className="cart-skeleton-layout"><div className="cart-skeleton-items">{[1, 2, 3].map((item) => <div className="cart-skeleton-item" key={item}><div /><span /><span /><span /></div>)}</div><div className="cart-skeleton-summary" /></div> }
