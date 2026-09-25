import { Link } from "react-router-dom"
import { ChevronRight } from "lucide-react"

export default function CategoryCard({ category, products }) {
  return <article className="category-card"><h2>{category}</h2><div className="category-card__grid">{(products || []).slice(0, 4).map((product) => <Link key={product.id} to={`/product/${product.id}`}><img src={product.images?.[0]} alt={product.title} loading="lazy" /><span>{product.brand}</span></Link>)}</div><Link className="category-card__link" to={`/search?category=${encodeURIComponent(category)}`}>Shop now <ChevronRight size={16} /></Link></article>
}
