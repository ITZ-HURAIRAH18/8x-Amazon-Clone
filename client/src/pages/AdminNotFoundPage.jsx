import { Link } from "react-router-dom"
import { ArrowLeft, SearchX } from "lucide-react"

export default function AdminNotFoundPage() {
  return <div className="admin-forbidden"><SearchX size={42} /><span className="admin-eyebrow">Admin 404</span><h1>Admin page not found</h1><p>The requested operations page does not exist.</p><Link className="admin-primary-button" to="/admin/dashboard"><ArrowLeft size={15} /> Back to dashboard</Link></div>
}
