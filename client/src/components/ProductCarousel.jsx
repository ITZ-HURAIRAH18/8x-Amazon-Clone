import { useRef } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import ProductCard from "./ProductCard"

export default function ProductCarousel({ title, products = [], action }) {
  const track = useRef(null)
  const move = (direction) => track.current?.scrollBy({ left: direction * Math.min(700, track.current.clientWidth * 0.82), behavior: "smooth" })
  return <section className="product-carousel-section"><div className="section-heading"><h2>{title}</h2>{action && <a href={action.href}>{action.label} <ChevronRight size={17} /></a>}</div><div className="carousel-wrap"><button className="carousel-control carousel-control--left" type="button" aria-label={`Scroll ${title} left`} onClick={() => move(-1)}><ChevronLeft size={23} /></button><div className="carousel-track" ref={track}>{products.map((product) => <ProductCard key={product.id} product={product} />)}</div><button className="carousel-control carousel-control--right" type="button" aria-label={`Scroll ${title} right`} onClick={() => move(1)}><ChevronRight size={23} /></button></div></section>
}
