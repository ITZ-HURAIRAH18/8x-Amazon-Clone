import { useEffect, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react"
import { useAdminAuth } from "../context/AdminAuthContext"
import { errorMessage } from "../services/api"

export default function AdminLoginPage() {
  const { admin, ready, login } = useAdminAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: "", password: "" })
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (ready && admin?.role === "admin") navigate(location.state?.from || "/admin/dashboard", { replace: true }) }, [ready, admin, navigate, location.state])
  const submit = async (event) => { event.preventDefault(); setBusy(true); setError(""); try { await login(form); navigate(location.state?.from || "/admin/dashboard", { replace: true }) } catch (requestError) { setError(errorMessage(requestError, "Admin sign-in failed.")) } finally { setBusy(false) } }
  return <div className="admin-login-page"><div className="admin-login-card"><Link to="/" className="admin-login-brand">amazon <strong>ADMIN</strong></Link><div className="admin-login-heading"><span className="admin-eyebrow">Restricted operations area</span><h1>Administrator sign in</h1><p>Use an account with the admin role to manage the Amazon Clone catalog and orders.</p></div>{error && <div className="admin-form-alert" role="alert">{error}</div>}<form className="admin-login-form" onSubmit={submit}><label>Email address<input type="email" autoComplete="username" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label><label>Password<input type="password" autoComplete="current-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label><button className="admin-primary-button" type="submit" disabled={busy}>{busy ? "Signing in…" : <>Sign in to admin <ArrowRight size={17} /></>}</button></form><div className="admin-login-security"><ShieldCheck size={16} /><span>Admin access is role protected and every sensitive action is verified by the API.</span></div><Link className="admin-back-link" to="/">← Return to storefront</Link></div><div className="admin-login-aside"><div><span className="admin-eyebrow">Amazon Clone operations</span><h2>Keep every order moving.</h2><p>Monitor revenue, manage inventory, moderate reviews, and keep the customer experience running from one focused workspace.</p></div><div className="admin-login-aside__footer"><LockKeyhole size={15} /> Authorized staff only</div></div></div>
}
