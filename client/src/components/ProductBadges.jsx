export default function ProductBadges({ product, compact = false }) {
  const badges = []
  if (product.bestseller) badges.push({ label: "Best Seller", className: "badge--bestseller" })
  if (product.deal) badges.push({ label: product.badge || "Limited Time Deal", className: "badge--deal" })
  else if (product.discount >= 20) badges.push({ label: `${product.discount}% off`, className: "badge--discount" })
  if (product.badge && !badges.some((badge) => badge.label === product.badge)) badges.push({ label: product.badge, className: "badge--neutral" })
  if (product.prime) badges.push({ label: "Prime", className: "badge--prime" })
  if (product.stock > 0 && product.stock < 10) badges.push({ label: "Low stock", className: "badge--warning" })
  if (!compact && product.stock > 0) badges.push({ label: "In stock", className: "badge--stock" })
  return <div className={`product-badges ${compact ? "product-badges--compact" : ""}`}>{badges.slice(0, compact ? 2 : 4).map((badge) => <span className={`product-badge product-badge--${badge.className.replace("badge--", "")}`} key={`${badge.label}-${badge.className}`}>{badge.label}</span>)}</div>
}
