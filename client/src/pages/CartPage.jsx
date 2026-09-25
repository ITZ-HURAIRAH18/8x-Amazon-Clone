import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowRight, LockKeyhole, ShoppingCart, Trash2 } from "lucide-react"
import QuantitySelector from "../components/QuantitySelector"
import { money } from "../utils/format"
import { useAuth, useCart } from "../context/StoreContext"
import demoProducts from "../data/demoProducts"
import ProductCarousel from "../components/ProductCarousel"

export default function CartPage() {
  const { items, count, subtotal, updateQuantity, removeItem, loading } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [removing, setRemoving] = useState("")
  const shipping = subtotal >= 35 || subtotal === 0 ? 0 : 5.99
  const tax = subtotal * 0.08
  const total = subtotal + shipping + tax
  const goCheckout = () => navigate(user ? "/checkout" : "/login", { state: { from: "/checkout" } })
  const remove = async (id) => { setRemoving(id); await removeItem(id); setRemoving("") }

  return <div className="cart-page"><div className="container"><div className="breadcrumbs"><Link to="/">Home</Link><span>›</span><strong>Shopping Cart</strong></div><div className="cart-heading"><h1>Shopping Cart</h1>{items.length > 0 && <span>{count} item{count === 1 ? "" : "s"}</span>}</div>{loading ? <div className="cart-loading">Syncing your cart…</div> : items.length === 0 ? <EmptyCart /> : <div className="cart-layout"><section className="cart-items"><div className="cart-delivery"><strong>Delivery date</strong><span>{count > 0 ? "Choose your delivery option at checkout" : ""}</span></div>{items.map((item) => <article className="cart-item" key={item.id}><Link to={`/product/${item.product.id}`} className="cart-item__image"><img src={item.product.images?.[0]} alt={item.product.title} /></Link><div className="cart-item__details"><Link to={`/product/${item.product.id}`} className="cart-item__title">{item.product.title}</Link><span className="cart-item__seller">Sold by Amazon Clone</span><strong className="cart-item__price">{money(item.product.price)}</strong><div className="cart-item__actions"><QuantitySelector value={item.quantity} max={item.product.stock || 99} onChange={(value) => updateQuantity(item.id, value)} /><button type="button" className="delete-link" disabled={removing === item.id} onClick={() => remove(item.id)}><Trash2 size={15} />{removing === item.id ? "Removing…" : "Delete"}</button></div><span className="cart-item__stock">{item.product.stock > 0 ? "In Stock" : "Out of stock"}</span></div><strong className="cart-item__total">{money(item.product.price * item.quantity)}</strong></article>)}<div className="cart-subtotal-row"><span>Subtotal ({count} item{count === 1 ? "" : "s"}):</span><strong>{money(subtotal)}</strong></div></section><aside className="cart-summary"><h2>Order Summary</h2><div className="summary-row"><span>Items ({count}):</span><strong>{money(subtotal)}</strong></div><div className="summary-row"><span>Shipping & handling:</span><strong>{shipping === 0 ? "FREE" : money(shipping)}</strong></div><div className="summary-row"><span>Estimated tax:</span><strong>{money(tax)}</strong></div><div className="summary-total"><span>Order total:</span><strong>{money(total)}</strong></div><button className="primary-button checkout-button" type="button" onClick={goCheckout}>Proceed to checkout <ArrowRight size={18} /></button><p className="secure-note"><LockKeyhole size={14} /> Secure checkout</p></aside></div>}{items.length > 0 && <ProductCarousel title="Customers also bought" products={demoProducts.filter((product) => !items.some((item) => item.product.id === product.id)).slice(0, 8)} />}</div></div>
}

function EmptyCart() { return <div className="empty-cart"><div className="empty-cart__icon"><ShoppingCart size={42} /></div><h2>Your Amazon Cart is empty</h2><p>Shop our most popular products and add something you love.</p><Link className="primary-button empty-cart__button" to="/search">Continue shopping</Link></div> }
