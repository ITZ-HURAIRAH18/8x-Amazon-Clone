import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Check, ChevronRight, CreditCard, LockKeyhole, MapPin, Package, Tag, Truck } from "lucide-react"
import { addressApi, couponApi, orderApi, errorMessage } from "../services/api"
import { money } from "../utils/format"
import { useAuth, useCart } from "../context/StoreContext"
import { usePageMeta } from "../utils/seo"

const blankAddress = { fullName: "", phone: "", street: "", apartment: "", city: "", state: "", postalCode: "", country: "United States" }
const deliveryOptions = [
  { id: "standard", label: "Standard delivery", detail: "Arrives in 4–6 days", cost: (subtotal) => subtotal >= 35 ? 0 : 5.99 },
  { id: "priority", label: "Priority delivery", detail: "Arrives in 2–3 days", cost: () => 9.99 },
  { id: "express", label: "Express delivery", detail: "Arrives in 1–2 days", cost: () => 18.99 },
]

export default function CheckoutPage() {
  const { user } = useAuth()
  const { items, count, subtotal, clearCart } = useCart()
  const navigate = useNavigate()
  const [addresses, setAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState("")
  const [newAddress, setNewAddress] = useState({ ...blankAddress, fullName: user?.name || "" })
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [addressLoading, setAddressLoading] = useState(true)
  const [deliveryMethod, setDeliveryMethod] = useState("standard")
  const [payment, setPayment] = useState("Card")
  const [couponCode, setCouponCode] = useState("")
  const [coupon, setCoupon] = useState(null)
  const [couponError, setCouponError] = useState("")
  const [couponBusy, setCouponBusy] = useState(false)
  const [step, setStep] = useState(1)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const requestId = useRef(`${user?._id || user?.id || "user"}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  usePageMeta("Checkout", "Securely complete your Amazon Clone order.")
  useEffect(() => {
    let active = true
    addressApi.list().then((items) => { if (!active) return; setAddresses(items || []); const preferred = items?.find((item) => item.isDefault) || items?.[0]; if (preferred) setSelectedAddressId(preferred.id) }).catch((requestError) => { if (active) setError(errorMessage(requestError, "Saved addresses could not be loaded.")) }).finally(() => { if (active) setAddressLoading(false) })
    return () => { active = false }
  }, [])
  const selectedAddress = addresses.find((address) => address.id === selectedAddressId)
  const shippingBase = deliveryOptions.find((option) => option.id === deliveryMethod)?.cost(subtotal) || 0
  const discount = coupon?.discount || 0
  const shipping = coupon?.shippingCoupon ? 0 : shippingBase
  const taxableSubtotal = Math.max(0, subtotal - (coupon?.shippingCoupon ? 0 : discount))
  const tax = taxableSubtotal * 0.08
  const total = taxableSubtotal + shipping + tax
  const canContinueAddress = Boolean(selectedAddress || (newAddress.fullName && newAddress.street && newAddress.city && newAddress.state && newAddress.postalCode))
  const updateNewAddress = (key, value) => setNewAddress((current) => ({ ...current, [key]: value }))
  const addAddress = async (event) => {
    event.preventDefault(); setError("")
    try { const address = await addressApi.add({ ...newAddress, isDefault: addresses.length === 0 }); setAddresses((current) => [...current, address]); setSelectedAddressId(address.id); setNewAddress({ ...blankAddress, fullName: user?.name || "" }); setShowAddressForm(false) } catch (requestError) { setError(errorMessage(requestError, "The address could not be saved.")) }
  }
  const continueAddress = (event) => { event.preventDefault(); if (!canContinueAddress) { setError("Choose a saved address or complete the new address fields."); return } setError(""); setStep(2) }
  const applyCoupon = async (event) => {
    event.preventDefault(); setCouponError(""); setCouponBusy(true)
    try { const result = await couponApi.validate(couponCode, subtotal); setCoupon({ code: result.coupon.code, discount: result.coupon.discountType === "shipping" ? 0 : result.discount, shippingCoupon: result.coupon.discountType === "shipping" }) } catch (requestError) { setCoupon(null); setCouponError(errorMessage(requestError, "This coupon could not be applied.")) } finally { setCouponBusy(false) }
  }
  const placeOrder = async (event) => {
    event.preventDefault(); setBusy(true); setError("")
    const shippingAddress = selectedAddress || newAddress
    try {
      const order = await orderApi.create({ addressId: selectedAddress?.id, shippingAddress, deliveryMethod, paymentMethod: payment, couponCode: coupon?.code || "", clientRequestId: requestId.current })
      await clearCart(); navigate(`/checkout/confirmation/${order.id}`, { replace: true, state: { order } })
    } catch (requestError) { setError(errorMessage(requestError, "We could not place your order. Please try again.")) } finally { setBusy(false) }
  }
  const steps = useMemo(() => ["Delivery address", "Delivery method", "Payment", "Review"], [])
  if (!items.length) return <div className="container empty-state checkout-empty"><h1>Your cart is empty</h1><p>Add an item before checking out.</p><Link className="primary-button" to="/search">Continue shopping</Link></div>
  return <div className="checkout-page"><div className="container"><div className="checkout-top"><Link to="/cart">← Back to cart</Link><div className="checkout-secure"><LockKeyhole size={15} /> Secure checkout</div></div><div className="checkout-layout"><section className="checkout-main"><CheckoutSteps step={step} steps={steps} />{error && <div className="form-alert" role="alert">{error}</div>}{step === 1 && <section className="checkout-card"><div className="checkout-card__title"><div><span className="checkout-number">1</span><h2>Choose a delivery address</h2></div></div><div className="saved-address-list">{addressLoading ? <div className="address-loading">Loading saved addresses…</div> : addresses.length === 0 && <p className="checkout-muted">You have no saved addresses yet. Add one to continue.</p>}{addresses.map((address) => <label className={`address-option ${selectedAddressId === address.id ? "selected" : ""}`} key={address.id}><input type="radio" name="address" checked={selectedAddressId === address.id} onChange={() => setSelectedAddressId(address.id)} /><span><strong>{address.fullName}</strong><small>{address.street}{address.apartment ? `, ${address.apartment}` : ""}<br />{address.city}, {address.state} {address.postalCode}<br />{address.country}</small></span>{address.isDefault && <b>Default</b>}</label>)}<button className="secondary-button add-address-button" type="button" onClick={() => setShowAddressForm((value) => !value)}>{showAddressForm ? "Cancel" : "Add a new address"}</button></div>{showAddressForm && <AddressForm value={newAddress} onChange={updateNewAddress} onSubmit={addAddress} submitLabel="Save address" />}{!showAddressForm && <button className="primary-button checkout-next" type="button" onClick={continueAddress} disabled={addressLoading}>Continue to delivery <ChevronRight size={17} /></button>}</section>}{step === 2 && <section className="checkout-card"><CheckoutHeader number="2" title="Choose delivery method" /><div className="delivery-options">{deliveryOptions.map((option) => <label className={`delivery-option ${deliveryMethod === option.id ? "selected" : ""}`} key={option.id}><input type="radio" name="delivery" checked={deliveryMethod === option.id} onChange={() => setDeliveryMethod(option.id)} /><Truck size={20} /><span><strong>{option.label}</strong><small>{option.detail}</small></span><b>{option.cost(subtotal) ? money(option.cost(subtotal)) : "FREE"}</b></label>)}</div><button className="primary-button checkout-next" type="button" onClick={() => setStep(3)}>Continue to payment <ChevronRight size={17} /></button></section>}{step === 3 && <section className="checkout-card"><CheckoutHeader number="3" title="Choose a payment method" /><div className="payment-options"><PaymentOption value="Card" selected={payment === "Card"} onChange={setPayment} title="Credit or debit card" detail="Visa, Mastercard, Amex" /><PaymentOption value="PayPal" selected={payment === "PayPal"} onChange={setPayment} title="PayPal" detail="Pay with your PayPal account" /><PaymentOption value="Gift card" selected={payment === "Gift card"} onChange={setPayment} title="Gift card" detail="Apply a gift card at payment" /></div><div className="demo-payment-note"><LockKeyhole size={14} /> This assignment uses a realistic simulated payment step. No card is charged.</div><button className="primary-button checkout-next" type="button" onClick={() => setStep(4)}>Review your order <ChevronRight size={17} /></button></section>}{step === 4 && <section className="checkout-card"><CheckoutHeader number="4" title="Review and place your order" /><OrderReview address={selectedAddress || newAddress} deliveryMethod={deliveryMethod} payment={payment} items={items} /><form onSubmit={placeOrder}><button className="primary-button place-order-button" type="submit" disabled={busy}>{busy ? "Placing order…" : "Place your order"}</button></form></section>}</section><aside className="checkout-summary"><h2>Order summary</h2><div className="checkout-summary__items">{items.map((item) => <div className="checkout-summary__item" key={item.id}><img src={item.product.images?.[0]} alt={item.product.title} /><div><strong>{item.product.title}</strong><span>Qty {item.quantity}</span></div><b>{money(item.product.price * item.quantity)}</b></div>)}</div><div className="checkout-summary__delivery"><Truck size={20} /><span><strong>{deliveryOptions.find((option) => option.id === deliveryMethod)?.label}</strong><small>{deliveryOptions.find((option) => option.id === deliveryMethod)?.detail}</small></span></div><div className="checkout-totals"><div><span>Subtotal</span><b>{money(subtotal)}</b></div>{discount > 0 && <div className="discount-line"><span>Discount ({coupon.code})</span><b>−{money(discount)}</b></div>}<div><span>Shipping</span><b>{shipping ? money(shipping) : "FREE"}</b></div><div><span>Estimated tax</span><b>{money(tax)}</b></div><strong className="checkout-total">Total <b>{money(total)}</b></strong></div><form className="checkout-coupon" onSubmit={applyCoupon}><label htmlFor="checkout-coupon"><Tag size={15} /> Coupon</label><div><input id="checkout-coupon" value={couponCode} onChange={(event) => setCouponCode(event.target.value)} placeholder="e.g. SAVE10" /><button className="secondary-button" type="submit" disabled={couponBusy}>{couponBusy ? "…" : "Apply"}</button></div>{coupon && <div className="coupon-applied"><span>{coupon.code} applied</span><button type="button" onClick={() => { setCoupon(null); setCouponCode("") }}>Remove</button></div>}{couponError && <small className="form-error">{couponError}</small>}</form></aside></div></div></div>
}

function CheckoutSteps({ step, steps }) { return <div className="checkout-steps">{steps.map((label, index) => <div className={step >= index + 1 ? "active" : ""} key={label}><span>{step > index + 1 ? <Check size={14} /> : index + 1}</span><strong>{label}</strong>{index < steps.length - 1 && <i />}</div>)}</div> }
function CheckoutHeader({ number, title }) { return <div className="checkout-card__title"><div><span className="checkout-number">{number}</span><h2>{title}</h2></div></div> }
function AddressForm({ value, onChange, onSubmit, submitLabel }) { return <form className="checkout-form address-form" onSubmit={onSubmit}><h3>Add a delivery address</h3><label>Full name<input value={value.fullName} onChange={(event) => onChange("fullName", event.target.value)} required /></label><label>Street address<input value={value.street} onChange={(event) => onChange("street", event.target.value)} required /></label><label>Apartment, suite, etc. <span>(optional)</span><input value={value.apartment} onChange={(event) => onChange("apartment", event.target.value)} /></label><div className="form-row"><label>City<input value={value.city} onChange={(event) => onChange("city", event.target.value)} required /></label><label>State<input value={value.state} onChange={(event) => onChange("state", event.target.value)} required /></label><label>ZIP code<input value={value.postalCode} onChange={(event) => onChange("postalCode", event.target.value)} required /></label></div><label>Phone <span>(optional)</span><input value={value.phone} onChange={(event) => onChange("phone", event.target.value)} /></label><button className="primary-button" type="submit">{submitLabel}</button></form> }
function PaymentOption({ value, selected, onChange, title, detail }) { return <label className={`payment-option ${selected ? "selected" : ""}`}><input type="radio" name="payment" checked={selected} onChange={() => onChange(value)} /><CreditCard size={20} /><span><strong>{title}</strong><small>{detail}</small></span><i>{selected && <Check size={14} />}</i></label> }
function OrderReview({ address, deliveryMethod, payment, items }) { return <div className="order-review"><div><h3>Deliver to</h3><p>{address.fullName || address.name}<br />{address.street || address.line1}<br />{address.city}, {address.state} {address.postalCode}</p></div><div><h3>Delivery & payment</h3><p>{deliveryMethod === "express" ? "Express" : deliveryMethod === "priority" ? "Priority" : "Standard"} delivery<br />{payment}</p></div><div><h3>Items ({items.length})</h3>{items.map((item) => <p key={item.id}>{item.quantity} × {item.product.title}</p>)}</div></div> }
