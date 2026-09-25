import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { ArrowRight, LockKeyhole } from "lucide-react"
import AmazonLogo from "../components/AmazonLogo"
import { useAuth } from "../context/StoreContext"
import { errorMessage } from "../services/api"
import { usePageMeta } from "../utils/seo"

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: "", password: "" })
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  usePageMeta("Sign In", "Sign in to access your Amazon Clone orders and saved shopping preferences.")
  const submit = async (event) => {
    event.preventDefault(); setError(""); setBusy(true)
    try { await login(form); navigate(location.state?.from || "/account", { replace: true }) } catch (requestError) { setError(errorMessage(requestError, "Unable to sign in.")) } finally { setBusy(false) }
  }
  return <AuthFrame title="Sign in" description="Access your orders, addresses, and personalized shopping experience."><form className="auth-form" onSubmit={submit}>{error && <div className="form-alert" role="alert">{error}</div>}<label>Email or mobile number<input type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label><label>Password<input type="password" autoComplete="current-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></label><div className="auth-form__options"><label className="check-label"><input type="checkbox" /> Keep me signed in</label><button type="button" className="link-button">Forgot password?</button></div><button className="primary-button auth-submit" disabled={busy} type="submit">{busy ? "Signing in…" : <>Sign in <ArrowRight size={17} /></>}</button><div className="auth-secure"><LockKeyhole size={15} /> Your information is securely encrypted</div></form><div className="auth-switch">New to Amazon Clone? <Link to="/register">Create your account</Link></div></AuthFrame>
}

export function AuthFrame({ title, description, children }) { return <div className="auth-page"><div className="auth-page__top"><AmazonLogo /><Link to="/">Return to homepage</Link></div><div className="auth-card"><h1>{title}</h1><p className="auth-card__description">{description}</p>{children}</div><div className="auth-page__footer"><Link to="/">Conditions of Use</Link><Link to="/">Privacy Notice</Link><Link to="/">Help</Link></div></div> }
