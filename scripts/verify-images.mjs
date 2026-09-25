// Verifies the seeded catalog's product photography actually resolves, so no
// product image can 404 in the storefront.
//
//   npm run verify:images            # verifies the whole image pool
//   npm run verify:images photo-123  # verifies specific IDs
import { imagePool } from "../server/src/data/imagePool.js"

const argumentIds = process.argv.slice(2).filter((value) => value.startsWith("photo-"))
const poolIds = [...new Set(Object.values(imagePool).flat())]
const ids = argumentIds.length ? argumentIds : poolIds
const results = []
const limit = 8
for (let i = 0; i < ids.length; i += limit) {
  const batch = ids.slice(i, i + limit)
  const checks = await Promise.all(batch.map(async (id) => {
    const url = `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=82`
    try {
      const response = await fetch(url, { method: "HEAD" })
      return { id, ok: response.ok, status: response.status }
    } catch (error) {
      return { id, ok: false, status: error.name }
    }
  }))
  results.push(...checks)
}
const good = results.filter((entry) => entry.ok).map((entry) => entry.id)
const bad = results.filter((entry) => !entry.ok)
console.log(`VERIFIED ${good.length}/${results.length} product images`)
if (bad.length) {
  console.log("FAILED:", bad.map((entry) => `${entry.id}(${entry.status})`).join(" "))
  process.exitCode = 1
} else {
  console.log("Every seeded product image resolves.")
}
