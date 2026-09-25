import { money } from "../utils/format"

export default function Price({ product, compact = false }) {
  const hasDiscount = product.originalPrice > product.price || product.discount > 0
  return <div className={`price ${compact ? "price--compact" : ""}`}><strong>{money(product.price)}</strong>{hasDiscount && <span className="price__original">{money(product.originalPrice)}</span>}{hasDiscount && <span className="price__discount">{product.discount || Math.round((1 - product.price / product.originalPrice) * 100)}% off</span>}</div>
}
