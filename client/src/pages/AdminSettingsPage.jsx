import { useEffect, useState } from "react"
import { Check, Save } from "lucide-react"
import { adminApi, errorMessage } from "../services/api"
import { AdminError, AdminLoading, AdminPageHeader } from "../components/admin/AdminUI"

const payloadOf = (value) => value?.data?.data || value?.data || value || {}
const blank = { storeName: "Amazon Clone", lowStockThreshold: 10, currency: "USD", customerServiceEmail: "", defaultOrderStatus: "Pending" }

export default function AdminSettingsPage() {
  const [form, setForm] = useState(blank)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  useEffect(() => { adminApi.settings.get().then((result) => setForm({ ...blank, ...payloadOf(result) })).catch((requestError) => setError(errorMessage(requestError, "Settings could not be loaded."))).finally(() => setLoading(false)) }, [])
  const submit = async (event) => { event.preventDefault(); setSaving(true); setNotice(""); try { await adminApi.settings.update({ ...form, lowStockThreshold: Number(form.lowStockThreshold) }); setNotice("Settings saved.") } catch (requestError) { setError(errorMessage(requestError, "Settings could not be saved.")) } finally { setSaving(false) } }
  if (loading) return <AdminLoading label="Loading settings…" />
  return <div className="admin-page"><AdminPageHeader eyebrow="Workspace configuration" title="Settings" description="Manage non-secret operational defaults for the admin workspace." />{error && <AdminError message={error} />}{notice && <div className="admin-success-alert"><Check size={16} />{notice}</div>}<form className="admin-settings-form" onSubmit={submit}><section className="admin-panel"><div className="admin-panel__heading"><div><span className="admin-eyebrow">Store profile</span><h2>Customer-facing identity</h2></div></div><label className="admin-field">Store name<input value={form.storeName} onChange={(event) => setForm({ ...form, storeName: event.target.value })} /></label><label className="admin-field">Customer service email<input type="email" value={form.customerServiceEmail} onChange={(event) => setForm({ ...form, customerServiceEmail: event.target.value })} /></label><label className="admin-field">Currency<select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })}><option value="USD">USD — US Dollar</option></select></label></section><section className="admin-panel"><div className="admin-panel__heading"><div><span className="admin-eyebrow">Operations defaults</span><h2>Inventory and orders</h2></div></div><label className="admin-field">Default low-stock threshold<input type="number" min="0" value={form.lowStockThreshold} onChange={(event) => setForm({ ...form, lowStockThreshold: event.target.value })} /></label><label className="admin-field">Default order status<select value={form.defaultOrderStatus} onChange={(event) => setForm({ ...form, defaultOrderStatus: event.target.value })}><option>Pending</option><option>Processing</option></select></label></section><div className="admin-form-actions"><button className="admin-primary-button" type="submit" disabled={saving}><Save size={16} />{saving ? "Saving…" : "Save settings"}</button></div></form></div>
}
