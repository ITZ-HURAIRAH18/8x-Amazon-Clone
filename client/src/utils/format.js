export function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0))
}

export function discountLabel(product) {
  if (product.discount > 0) return `${product.discount}% off`
  if (product.originalPrice > product.price) {
    return `${Math.round((1 - product.price / product.originalPrice) * 100)}% off`
  }
  return ""
}

export function normalizeProduct(product) {
  return { ...product, id: product.id || product._id, images: product.images || [product.image].filter(Boolean) }
}

export function formatDate(value) {
  if (!value) return ""
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))
}
