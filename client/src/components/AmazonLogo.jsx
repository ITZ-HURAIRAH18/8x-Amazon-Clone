import { Link } from "react-router-dom"

export default function AmazonLogo({ light = false }) {
  return (
    <Link className={`amazon-logo ${light ? "amazon-logo--light" : ""}`} to="/" aria-label="Amazon home">
      <span className="amazon-logo__word">amazon</span>
      <span className="amazon-logo__smile" aria-hidden="true" />
    </Link>
  )
}
