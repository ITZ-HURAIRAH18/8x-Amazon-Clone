import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Check, ChevronRight, CreditCard, LockKeyhole, MapPin, Truck } from "lucide-react"
import { orderApi, errorMessage } from "../services/api"
import { money } from "../utils/format"
import { useAuth, useCart } from "../context/StoreContext"

const initialAddress = { name: "", line1: "", line2: "", city: "", state: "", postalCode: "", country: "United States", phone: "" }

export default function CheckoutPage() {
  const { user } = useAuth()
  const { items, count, subtotal, clearCart } = useCart()
  const navigate = useNavigate()
  const [address, setAddress] = useState({ ...initialAddress, name: user?.name || "" })
  const [payment, setPayment] = useState("Card")
  const [step, setStep] = useState(1)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const shipping = subtotal >= 35 ? 0 : 5.99
  const tax = subtotal * 0.08
  const total = subtotal + shipping + tax
  const updateAddress = (key, value) => setAddress((current) => ({ ...current, [key]: value }))
  const continueAddress = (event) => { event.preventDefault(); if (!address.name || !address.line1 || !address.city || !address.state || !address.postalCode) { setError("Complete the required delivery address fields."); return } setError(""); setStep(2) }
  const placeOrder = async (event) => {
    event.preventDefault(); setBusy(true); setError("")
    try {
      let order
      try { order = await orderApi.create({ shippingAddress: address, paymentMethod: payment, clientRequestId: `${user?._id || user?.id || "guest"}-${Date.now()}` }) } catch (requestError) {
        const status = requestError?.response?.status
        if (status && status < 500) throw requestError
        order = { id: `local-${Date.now()}`, items: items.map((item) => ({ title: item.product.title, image: item.product.images?.[0], unitPrice: item.product.price, quantity: item.quantity })), shippingAddress: address, paymentMethod: payment, subtotal, shipping, tax, total, status: "Pending", createdAt: new Date().toISOString() }
        localStorage.setItem("amazon_clone_last_order", JSON.stringify(order))
      }
      clearCart(); navigate(`/checkout/confirmation/${order.id}`, { replace: true, state: { order } })
    } catch (requestError) { setError(errorMessage(requestError, "We could not place your order. Please try again.")) } finally { setBusy(false) }
  }

  if (!items.length) return <div className="container empty-state checkout-empty"><h1>Your cart is empty</h1><p>Add an item before checking out.</p><Link className="primary-button" to="/search">Continue shopping</Link></div>
  return <div className="checkout-page"><div className="container"><div className="checkout-top"><Link to="/cart">← Back to cart</Link><div className="checkout-secure"><LockKeyhole size={15} /> Secure checkout</div></div><div className="checkout-layout"><section className="checkout-main"><CheckoutSteps step={step} /><div className="checkout-card"><div className="checkout-card__title"><div><span className="checkout-number">{step === 1 ? 1 : 2}</span><h2>{step === 1 ? "Delivery address" : "Payment method"}</h2></div>{step === 2 && <span className="checkout-complete"><Check size={15} /> Address saved</span>}</div>{step === 1 ? <form className="checkout-form" onSubmit={continueAddress}><div className="form-alert-placeholder">{error && <div className="form-alert">{error}</div>}</div><label>Full name<input value={address.name} onChange={(event) => updateAddress("name", event.target.value)} required /></label><label>Street address<input value={address.line1} onChange={(event) => updateAddress("line1", event.target.value)} required /></label><label>Apartment, suite, etc. <span>(optional)</span><input value={address.line2} onChange={(event) => updateAddress("line2", event.target.value)} /></label><div className="form-row"><label>City<input value={address.city} onChange={(event) => updateAddress("city", event.target.value)} required /></label><label>State<input value={address.state} onChange={(event) => updateAddress("state", event.target.value)} required /></label><label>ZIP code<input value={address.postalCode} onChange={(event) => updateAddress("postalCode", event.target.value)} required /></label></div><label>Phone <span>(optional)</span><input value={address.phone} onChange={(event) => updateAddress("phone", event.target.value)} /></label><button className="primary-button checkout-next" type="submit">Continue to payment <ChevronRight size={17} /></button></form> : <form className="checkout-form" onSubmit={placeOrder}><div className="payment-options"><label className={`payment-option ${payment === "Card" ? "selected" : ""}`}><input type="radio" name="payment" checked={payment === "Card"} onChange={() => setPayment("Card")} /><CreditCard size={21} /><span><strong>Credit or debit card</strong><small>Visa, Mastercard, Amex</small></span><i><Check size={14} /></i></label><label className={`payment-option ${payment === "PayPal" ? "selected" : ""}`}><input type="radio" name="payment" checked={payment === "PayPal"} onChange={() => setPayment("PayPal")} /><span className="paypal-mark">P</span><span><strong>PayPal</strong><small>Pay securely with your account</small></span><i><Check size={14} /></i></label></div><div className="demo-payment-note"><LockKeyhole size={15} /> This assignment uses simulated payment. No charge will be made.</div><button className="primary-button place-order-button" disabled={busy} type="submit">{busy ? "Placing order…" : `Place your order · ${money(total)}`}</button></form>}</div></section><aside className="checkout-summary"><h2>Order Summary</h2><div className="checkout-summary__items">{items.map((item) => <div className="checkout-summary__item" key={item.id}><img src={item.product.images?.[0]} alt={item.product.title} /><div><strong>{item.product.title}</strong><span>Qty {item.quantity}</span></div><b>{money(item.product.price * item.quantity)}</b></div>)}</div><div className="summary-row"><span>Subtotal ({count} items)</span><strong>{money(subtotal)}</strong></div><div className="summary-row"><span>Shipping</span><strong>{shipping ? money(shipping) : "FREE"}</strong></div><div className="summary-row"><span>Tax</span><strong>{money(tax)}</strong></div><div className="summary-total"><span>Total</span><strong>{money(total)}</strong></div><div className="checkout-summary__delivery"><Truck size={17} /><span><strong>Delivery</strong><small>FREE delivery to your address</small></span></div></aside></div></div></div>
}

function CheckoutSteps({ step }) { return <div className="checkout-steps"><div className={step >= 1 ? "active" : ""}><span>1</span><strong>Delivery address</strong></div><i /><div className={step >= 2 ? "active" : ""}><span>2</span><strong>Payment</strong></div><i /><div><span>3</span><strong>Place order</strong></div></div> }
