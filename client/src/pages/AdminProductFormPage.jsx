import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Check, Save } from "lucide-react"
import { adminApi, errorMessage } from "../services/api"
import { AdminError, AdminLoading, AdminPageHeader } from "../components/admin/AdminUI"

const blank = {
  title: "", description: "", price: "", originalPrice: "", discount: "", category: "", brand: "", images: "", stock: "", lowStockThreshold: 10, sku: "", rating: 0, featured: false, bestseller: false, deal: false, isActive: true, features: "", specifications: "{}", dealEndsAt: "",
}
const readPayload = (value) => value?.data?.data || value?.data || value || {}
const toDateInput = (value) => value ? new Date(value).toISOString().slice(0, 16) : ""

export default function AdminProductFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(id)
  const [form, setForm] = useState(blank)
  const [loading, setLoading] = useState(editing)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [taxonomy, setTaxonomy] = useState({ categories: ["Electronics", "Computers", "Home", "Kitchen", "Fashion", "Beauty", "Books", "Toys", "Grocery", "Sports"], brands: [] })

  useEffect(() => {
    if (!editing) return
    adminApi.products.get(id).then((result) => {
      const product = readPayload(result)
      setForm({
        ...blank,
        ...product,
        isActive: product.active ?? product.isActive ?? true,
        images: (product.images || []).join("\n"),
        features: (product.features || []).join("\n"),
        specifications: JSON.stringify(product.specifications || {}, null, 2),
        dealEndsAt: toDateInput(product.dealEndsAt),
      })
    }).catch((requestError) => setError(errorMessage(requestError, "Product could not be loaded."))).finally(() => setLoading(false))
  }, [id, editing])
  useEffect(() => {
    Promise.all([adminApi.categories.list({ limit: 100 }), adminApi.brands.list({ limit: 100 })]).then(([categoryResponse, brandResponse]) => {
      const categoryValue = categoryResponse?.data?.data || categoryResponse?.data || categoryResponse || []
      const brandValue = brandResponse?.data?.data || brandResponse?.data || brandResponse || []
      setTaxonomy({ categories: (Array.isArray(categoryValue) ? categoryValue : categoryValue.data || []).map((item) => item.name).filter(Boolean), brands: (Array.isArray(brandValue) ? brandValue : brandValue.data || []).map((item) => item.name).filter(Boolean) })
    }).catch(() => {})
  }, [])

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const submit = async (event) => {
    event.preventDefault()
    setError("")
    setNotice("")
    let specifications
    try { specifications = JSON.parse(form.specifications || "{}") } catch { setError("Specifications must be valid JSON."); return }
    const images = form.images.split("\n").map((value) => value.trim()).filter(Boolean)
    if (!images.length) { setError("Add at least one product image URL."); return }
    if (images.some((image) => !/^https?:\/\//i.test(image))) { setError("Every product image must use an http or https URL."); return }
    if (Number(form.price) < 0 || Number(form.originalPrice) < Number(form.price) || Number(form.stock) < 0) { setError("Check price and stock values."); return }
    const details = { ...form, active: form.isActive, isActive: form.isActive, price: Number(form.price), originalPrice: Number(form.originalPrice), discount: Number(form.discount || 0), stock: Math.floor(Number(form.stock)), lowStockThreshold: Math.floor(Number(form.lowStockThreshold || 10)), rating: Number(form.rating || 0), images, features: form.features.split("\n").map((value) => value.trim()).filter(Boolean), specifications, dealEndsAt: form.dealEndsAt || null }
    setSaving(true)
    try {
      const result = editing ? await adminApi.products.update(id, details) : await adminApi.products.create(details)
      const product = readPayload(result)
      setNotice(editing ? "Product updated." : "Product created.")
      window.setTimeout(() => navigate(`/admin/products${product?.id ? `?highlight=${product.id}` : ""}`), 450)
    } catch (requestError) { setError(errorMessage(requestError, "Product could not be saved.")) } finally { setSaving(false) }
  }

  if (loading) return <AdminLoading label="Loading product form…" />
  return <div className="admin-page">
    <AdminPageHeader eyebrow={editing ? "Edit catalog item" : "Catalog operations"} title={editing ? "Edit product" : "Create product"} description="Keep catalog information accurate for customers and operations." actions={<Link className="admin-secondary-button" to="/admin/products"><ArrowLeft size={15} /> Back to products</Link>} />
    {error && <AdminError message={error} />}
    {notice && <div className="admin-success-alert"><Check size={16} />{notice}</div>}
    <form className="admin-product-form" onSubmit={submit}>
      <section className="admin-form-section">
        <div className="admin-form-section__heading"><span>01</span><div><h2>Product information</h2><p>Core copy shown throughout the storefront.</p></div></div>
        <div className="admin-form-grid">
          <label className="admin-field admin-field--wide">Title<input value={form.title} onChange={(event) => update("title", event.target.value)} required /></label>
          <label className="admin-field admin-field--wide">Description<textarea rows={5} value={form.description} onChange={(event) => update("description", event.target.value)} required /></label>
          <label className="admin-field">Category<input list="admin-category-options" value={form.category} onChange={(event) => update("category", event.target.value)} required /><datalist id="admin-category-options">{taxonomy.categories.map((category) => <option key={category} value={category} />)}</datalist></label>
          <label className="admin-field">Brand<input list="admin-brand-options" value={form.brand} onChange={(event) => update("brand", event.target.value)} required /><datalist id="admin-brand-options">{taxonomy.brands.map((brand) => <option key={brand} value={brand} />)}</datalist></label>
          <label className="admin-field">SKU<input value={form.sku} onChange={(event) => update("sku", event.target.value)} required={!editing} placeholder="e.g. AMZ-NEW-001" /></label>
          <label className="admin-field">Rating<input type="number" min="0" max="5" step="0.1" value={form.rating} onChange={(event) => update("rating", event.target.value)} /></label>
        </div>
      </section>
      <section className="admin-form-section">
        <div className="admin-form-section__heading"><span>02</span><div><h2>Pricing and inventory</h2><p>Values are validated again by the API.</p></div></div>
        <div className="admin-form-grid">
          <label className="admin-field">Price<input type="number" min="0" step="0.01" value={form.price} onChange={(event) => update("price", event.target.value)} required /></label>
          <label className="admin-field">Original price<input type="number" min="0" step="0.01" value={form.originalPrice} onChange={(event) => update("originalPrice", event.target.value)} required /></label>
          <label className="admin-field">Discount percentage<input type="number" min="0" max="100" value={form.discount} onChange={(event) => update("discount", event.target.value)} /></label>
          <label className="admin-field">Stock<input type="number" min="0" step="1" value={form.stock} onChange={(event) => update("stock", event.target.value)} required /></label>
          <label className="admin-field">Low-stock threshold<input type="number" min="0" step="1" value={form.lowStockThreshold} onChange={(event) => update("lowStockThreshold", event.target.value)} /></label>
          <label className="admin-field">Deal end date<input type="datetime-local" value={form.dealEndsAt} onChange={(event) => update("dealEndsAt", event.target.value)} /></label>
        </div>
      </section>
      <section className="admin-form-section">
        <div className="admin-form-section__heading"><span>03</span><div><h2>Media and merchandising</h2><p>Use consistent, reliable product photography.</p></div></div>
        <div className="admin-form-grid">
          <label className="admin-field admin-field--wide">Image URLs <span>one URL per line</span><textarea rows={4} value={form.images} onChange={(event) => update("images", event.target.value)} required /></label>
          <label className="admin-field admin-field--wide">Features <span>one feature per line</span><textarea rows={4} value={form.features} onChange={(event) => update("features", event.target.value)} /></label>
          <label className="admin-field admin-field--wide">Specifications <span>JSON object</span><textarea rows={6} className="admin-code-input" value={form.specifications} onChange={(event) => update("specifications", event.target.value)} /></label>
        </div>
        <div className="admin-check-grid"><label><input type="checkbox" checked={form.featured} onChange={(event) => update("featured", event.target.checked)} /> Featured product</label><label><input type="checkbox" checked={form.bestseller} onChange={(event) => update("bestseller", event.target.checked)} /> Bestseller</label><label><input type="checkbox" checked={form.deal} onChange={(event) => update("deal", event.target.checked)} /> Active deal</label><label><input type="checkbox" checked={form.isActive} onChange={(event) => update("isActive", event.target.checked)} /> Active in storefront</label></div>
      </section>
      <div className="admin-form-actions"><Link className="admin-secondary-button" to="/admin/products">Cancel</Link><button className="admin-primary-button" type="submit" disabled={saving}><Save size={16} /> {saving ? "Saving…" : editing ? "Save changes" : "Create product"}</button></div>
    </form>
  </div>
}
