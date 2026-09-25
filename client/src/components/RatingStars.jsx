import { Star } from "lucide-react"

export default function RatingStars({ rating = 0, count, compact = false }) {
  const value = Number(rating) || 0
  return <span className={`rating ${compact ? "rating--compact" : ""}`} aria-label={`${value} out of 5 stars${count ? `, ${count} reviews` : ""}`}><span className="rating__stars">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={compact ? 13 : 16} fill={star <= Math.round(value) ? "currentColor" : "none"} />)}</span>{count !== undefined && <span className="rating__count">{Number(count).toLocaleString()}</span>}</span>
}
