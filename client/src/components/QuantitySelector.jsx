import { Minus, Plus } from "lucide-react"

export default function QuantitySelector({ value, onChange, min = 1, max = 99 }) {
  return <div className="quantity-selector" aria-label="Quantity"><button type="button" aria-label="Decrease quantity" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}><Minus size={15} /></button><span aria-live="polite">{value}</span><button type="button" aria-label="Increase quantity" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}><Plus size={15} /></button></div>
}
