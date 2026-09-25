import { useEffect } from "react"

export function usePageMeta(title, description) {
  useEffect(() => {
    document.title = title ? `${title} | Amazon Clone` : "Amazon Clone"
    const meta = document.querySelector('meta[name="description"]')
    if (meta && description) meta.setAttribute("content", description)
    let canonical = document.querySelector('link[rel="canonical"]')
    if (!canonical) {
      canonical = document.createElement("link")
      canonical.rel = "canonical"
      document.head.appendChild(canonical)
    }
    canonical.href = window.location.origin + window.location.pathname
  }, [title, description])
}
