import { useEffect, useState } from "react"
import { Check, Save } from "lucide-react"
import { adminApi, errorMessage } from "../services/api"
import { AdminError, AdminLoading, AdminPageHeader } from "../components/admin/AdminUI"

const payloadOf = (value) => value?.data?.data || value?.data || value || {}
const blank = {
  storeName: "Amazon Clone",
  customerServiceEmail: "",
  currency: "USD",
  defaultOrderStatus: "Pending",
  lowStockThreshold: 10,
  freeShippingThreshold: 35,
  standardShippingFee: 5.99,
  taxRate: 8,
  lowStockNotifications: true,
  orderNotifications: true,
  reviewNotifications: true,
  couponExpiryDays: 7,
  dealExpiryDays: 7,
  maintenanceMessage: "",
}

export default function AdminSettingsPage() {
  const [form, setForm] = useState(blank)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  useEffect(() => {
    adminApi.settings.get().then((result) => setForm({ ...blank, ...payloadOf(result) })).catch((requestError) => setError(errorMessage(requestError, "Settings could not be loaded."))).finally(() => setLoading(false))
  }, [])

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setNotice("")
    setError("")
    try {
      const result = await adminApi.settings.update({
        ...form,
        lowStockThreshold: Number(form.lowStockThreshold),
        freeShippingThreshold: Number(form.freeShippingThreshold),
        standardShippingFee: Number(form.standardShippingFee),
        taxRate: Number(form.taxRate),
        couponExpiryDays: Number(form.couponExpiryDays),
        dealExpiryDays: Number(form.dealExpiryDays),
      })
      setForm((current) => ({ ...current, ...payloadOf(result) }))
      setNotice("Settings saved.")
    } catch (requestError) {
      setError(errorMessage(requestError, "Settings could not be saved."))
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <AdminLoading label="Loading settings…" />

  return <div className="admin-page">
    <AdminPageHeader eyebrow="Workspace configuration" title="Settings" description="Manage non-secret operational defaults for the store and the admin workspace." />
    {error && <AdminError message={error} />}
    {notice && <div className="admin-success-alert"><Check size={16} />{notice}</div>}
    <form className="admin-settings-form" onSubmit={submit}>
      <section className="admin-panel">
        <div className="admin-panel__heading"><div><span className="admin-eyebrow">Store profile</span><h2>Customer-facing identity</h2></div></div>
        <label className="admin-field">Store name<input value={form.storeName} onChange={(event) => update("storeName", event.target.value)} /></label>
        <label className="admin-field">Customer service email<input type="email" value={form.customerServiceEmail} onChange={(event) => update("customerServiceEmail", event.target.value)} /></label>
        <label className="admin-field">Currency<select value={form.currency} onChange={(event) => update("currency", event.target.value)}><option value="USD">USD — US Dollar</option></select></label>
        <label className="admin-field">Maintenance message <span>shown to customers while the store is degraded</span><textarea rows={2} value={form.maintenanceMessage || ""} onChange={(event) => update("maintenanceMessage", event.target.value)} /></label>
      </section>
      <section className="admin-panel">
        <div className="admin-panel__heading"><div><span className="admin-eyebrow">Operations defaults</span><h2>Inventory, orders, and shipping</h2></div></div>
        <div className="admin-form-grid">
          <label className="admin-field">Default low-stock threshold<input type="number" min="0" value={form.lowStockThreshold} onChange={(event) => update("lowStockThreshold", event.target.value)} /></label>
          <label className="admin-field">Default order status<select value={form.defaultOrderStatus} onChange={(event) => update("defaultOrderStatus", event.target.value)}><option>Pending</option><option>Processing</option></select></label>
          <label className="admin-field">Free-shipping threshold<input type="number" min="0" step="0.01" value={form.freeShippingThreshold} onChange={(event) => update("freeShippingThreshold", event.target.value)} /></label>
          <label className="admin-field">Standard shipping fee<input type="number" min="0" step="0.01" value={form.standardShippingFee} onChange={(event) => update("standardShippingFee", event.target.value)} /></label>
          <label className="admin-field">Tax rate %<input type="number" min="0" max="100" step="0.01" value={form.taxRate} onChange={(event) => update("taxRate", event.target.value)} /></label>
        </div>
      </section>
      <section className="admin-panel">
        <div className="admin-panel__heading"><div><span className="admin-eyebrow">Alerts</span><h2>Admin notifications</h2></div></div>
        <div className="admin-form-grid">
          <label className="admin-field">Coupon expiry notice days<input type="number" min="1" max="90" value={form.couponExpiryDays} onChange={(event) => update("couponExpiryDays", event.target.value)} /></label>
          <label className="admin-field">Deal expiry notice days<input type="number" min="1" max="90" value={form.dealExpiryDays} onChange={(event) => update("dealExpiryDays", event.target.value)} /></label>
        </div>
        <div className="admin-check-grid">
          <label><input type="checkbox" checked={Boolean(form.lowStockNotifications)} onChange={(event) => update("lowStockNotifications", event.target.checked)} /> Low-stock alerts</label>
          <label><input type="checkbox" checked={Boolean(form.orderNotifications)} onChange={(event) => update("orderNotifications", event.target.checked)} /> New order alerts</label>
          <label><input type="checkbox" checked={Boolean(form.reviewNotifications)} onChange={(event) => update("reviewNotifications", event.target.checked)} /> Review moderation alerts</label>
        </div>
      </section>
      <div className="admin-form-actions"><button className="admin-primary-button" type="submit" disabled={saving}><Save size={16} />{saving ? "Saving…" : "Save settings"}</button></div>
    </form>
  </div>
}
