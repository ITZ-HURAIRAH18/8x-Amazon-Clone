import { Link } from "react-router-dom"
import { ShieldAlert } from "lucide-react"

export default function AdminForbiddenPage() {
  return <div className="admin-forbidden"><ShieldAlert size={44} /><span className="admin-eyebrow">403 Forbidden</span><h1>Administrator access required</h1><p>Your account is authenticated, but it does not have permission to open the operations dashboard.</p><div><Link className="admin-primary-button" to="/admin/login">Use an admin account</Link><Link className="admin-secondary-button" to="/account">Return to account</Link></div></div>
}
