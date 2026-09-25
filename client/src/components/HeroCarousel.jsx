import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

const slides = [
  { kicker: "Prime Day", title: "Big savings, big possibilities.", detail: "Save across the deals you love.", cta: "Shop Prime Day", href: "/search?deals=true", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1600&q=82", position: "center" },
  { kicker: "New season finds", title: "Make room for what matters.", detail: "Refresh your everyday with thoughtful essentials.", cta: "Explore home", href: "/search?category=Home", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1600&q=82", position: "center" },
  { kicker: "Tech essentials", title: "More power for your day.", detail: "Upgrade your setup with technology that keeps up.", cta: "Shop electronics", href: "/search?category=Electronics", image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1600&q=82", position: "center" },
]

export default function HeroCarousel() {
  const [index, setIndex] = useState(0)
  useEffect(() => { const timer = window.setInterval(() => setIndex((value) => (value + 1) % slides.length), 7000); return () => window.clearInterval(timer) }, [])
  const slide = slides[index]
  return <section className="hero-carousel" aria-label="Featured promotions"><div className="hero-slide" key={slide.kicker} style={{ backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.56), rgba(0,0,0,.08)), url(${slide.image})`, backgroundPosition: slide.position }}><div className="hero-copy"><span>{slide.kicker}</span><h1>{slide.title}</h1><p>{slide.detail}</p><a href={slide.href}>{slide.cta}</a></div></div><div className="hero-controls"><button type="button" aria-label="Previous promotion" onClick={() => setIndex((index - 1 + slides.length) % slides.length)}><ChevronLeft size={21} /></button><div>{slides.map((item, itemIndex) => <button key={item.kicker} className={itemIndex === index ? "active" : ""} type="button" aria-label={`Show promotion ${itemIndex + 1}`} onClick={() => setIndex(itemIndex)} />)}</div><button type="button" aria-label="Next promotion" onClick={() => setIndex((index + 1) % slides.length)}><ChevronRight size={21} /></button></div></section>
}
