import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { ArrowRight, LockKeyhole } from "lucide-react"
import AmazonLogo from "../components/AmazonLogo"
import { AuthFrame } from "./LoginPage"
import { useAuth } from "../context/StoreContext"
import { errorMessage } from "../services/api"

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ name: "", email: "", password: "" })
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const submit = async (event) => {
    event.preventDefault(); setError(""); setBusy(true)
    try { await register(form); navigate(location.state?.from || "/account", { replace: true }) } catch (requestError) { setError(errorMessage(requestError, "Unable to create your account.")) } finally { setBusy(false) }
  }
  return <AuthFrame title="Create account" description="Shop confidently with a secure account and faster checkout."><form className="auth-form" onSubmit={submit}>{error && <div className="form-alert" role="alert">{error}</div>}<label>Full name<input autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label><label>Email<input type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label><label>Password<input type="password" autoComplete="new-password" minLength="6" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /><small>Use at least 6 characters.</small></label><label className="check-label"><input type="checkbox" required /> I agree to the Terms of Use and Privacy Notice.</label><button className="primary-button auth-submit" disabled={busy} type="submit">{busy ? "Creating account…" : <>Create your account <ArrowRight size={17} /></>}</button><div className="auth-secure"><LockKeyhole size={15} /> Your information is securely encrypted</div></form><div className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></div></AuthFrame>
}
