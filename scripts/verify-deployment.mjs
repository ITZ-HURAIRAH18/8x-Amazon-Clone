#!/usr/bin/env node
/**
 * Verifies a deployed frontend -> backend -> MongoDB chain.
 *
 * Usage:
 *   node scripts/verify-deployment.mjs --api=https://api.example.com --client=https://app.example.com
 *   API_URL=https://api.example.com CLIENT_URL=https://app.example.com npm run verify:deploy
 *
 * Exits with code 1 when a required check fails so it can gate a release.
 */
const args = process.argv.slice(2)
const argValue = (name) => {
  const match = args.find((entry) => entry.startsWith(`--${name}=`))
  if (match) return match.split("=").slice(1).join("=")
  const index = args.indexOf(`--${name}`)
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith("--")) return args[index + 1]
  return process.env[name.toUpperCase().replace(/-/g, "_")]
}

const rawApi = String(argValue("api") || process.env.VITE_API_URL || "http://localhost:5000/api")
const apiUrl = rawApi.replace(/\/$/, "").endsWith("/api") ? rawApi.replace(/\/$/, "") : `${rawApi.replace(/\/$/, "")}/api`
const clientUrl = String(argValue("client") || process.env.CLIENT_URL || "").replace(/\/$/, "")

const results = []
const record = (name, status, detail) => {
  results.push({ name, status, detail })
  const icon = status === "pass" ? "PASS" : status === "warn" ? "WARN" : "FAIL"
  console.log(`${icon.padEnd(4)} ${name}\n     ${detail}`)
}

async function json(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } })
  const text = await response.text()
  let payload = null
  try { payload = JSON.parse(text) } catch { payload = null }
  return { response, text, payload, contentType: response.headers.get("content-type") || "" }
}

console.log(`API:    ${apiUrl}`)
console.log(`Client: ${clientUrl || "(not provided — skipping browser checks)"}\n`)

try {
  const health = await json(`${apiUrl}/health`)
  const ok = health.response.ok && health.payload?.data?.status === "ok"
  const database = health.payload?.data?.database
  if (ok) {
    record("Backend /api/health", "pass", `status ok, database: ${database}`)
    record("MongoDB connection", database === "connected" ? "pass" : "warn", database === "connected" ? "Production database is connected." : `Database reports "${database}". Confirm MONGODB_URI.`)
  } else {
    record("Backend /api/health", "fail", `HTTP ${health.response.status} (${health.contentType || "no content type"}). ${health.text.slice(0, 120).replace(/\s+/g, " ")}`)
    record("MongoDB connection", "fail", "Health endpoint did not return the expected payload.")
  }

  const adminLogin = await json(`${apiUrl}/admin/auth/login`, { method: "POST", body: JSON.stringify({ email: "verify@example.test", password: "VerifyOnly-Not-A-Real-Password" }) })
  if (adminLogin.response.status === 401 && adminLogin.payload?.message) {
    record("Admin API reachable", "pass", "GET/POST /api/admin responds with a structured 401 for invalid credentials.")
  } else if (adminLogin.contentType.includes("text/html")) {
    record("Admin API reachable", "fail", "The backend returned HTML (Vercel deployment protection). Disable protection or use a public API domain.")
  } else {
    record("Admin API reachable", "fail", `Expected a 401 JSON response, received HTTP ${adminLogin.response.status}.`)
  }

  if (clientUrl) {
    const preflight = await fetch(`${apiUrl}/auth/login`, {
      method: "OPTIONS",
      headers: { Origin: clientUrl, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" },
    })
    const allowOrigin = preflight.headers.get("access-control-allow-origin")
    if (preflight.ok && allowOrigin) {
      record("CORS allows the frontend", "pass", `Access-Control-Allow-Origin: ${allowOrigin}`)
    } else {
      record("CORS allows the frontend", "fail", `No Access-Control-Allow-Origin header for ${clientUrl}. Add the origin to CLIENT_URL on the backend.`)
    }

    const page = await fetch(`${clientUrl}/login`)
    const html = await page.text()
    if (!page.ok) {
      record("Frontend /login", "fail", `HTTP ${page.status}`)
    } else {
      record("Frontend /login", "pass", "The login route is served by the SPA.")
      const assets = [...html.matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map((match) => match[1])
      const expectedOrigin = apiUrl.replace(/\/api$/, "")
      const hosts = new Set()
      for (const asset of assets) {
        const bundle = await (await fetch(`${clientUrl}${asset}`)).text()
        const candidates = [...new Set([...bundle.matchAll(/https?:\/\/[a-zA-Z0-9.\-]+(?::\d+)?(?:\/api)?/g)].map((match) => match[0]))]
          .filter((value) => !/unsplash|wikimedia|w3\.org|github\.com|reactjs|reactrouter|react-dom|vercel\.app\/ship|fonts\.|schema\.org|json-schema|caniuse|developer\.mozilla/i.test(value))
        for (const candidate of candidates) hosts.add(candidate)
        if ([...hosts].some((value) => !/^https?:\/\/localhost(:\d+)?$/i.test(value))) break
      }
      const remote = [...hosts].filter((value) => !/^https?:\/\/localhost(:\d+)?$/i.test(value))
      const bundleApi = remote.find((value) => /\/api$/.test(value)) || remote[0] || [...hosts][0] || ""
      if (!bundleApi) {
        record("Frontend API base URL", "pass", "No external API origin found in the bundle; it uses a same-origin /api path (valid when one deployment serves both).")
      } else if (bundleApi === apiUrl || bundleApi === expectedOrigin) {
        record("Frontend API base URL", "pass", `Bundle targets ${bundleApi} (normalized to ${apiUrl}).`)
      } else if (/^https?:\/\/localhost/i.test(bundleApi)) {
        record("Frontend API base URL", "fail", `The production bundle only contains ${bundleApi}. Set VITE_API_URL and redeploy the client.`)
      } else {
        record("Frontend API base URL", "fail", `The bundle uses ${bundleApi} but this check targets ${apiUrl}. Update VITE_API_URL or re-run with the matching --api value.`)
      }
    }
  } else {
    record("Client checks", "warn", "Pass --client=https://<frontend-domain> to verify CORS and the deployed bundle.")
  }
} catch (error) {
  record("Deployment verification", "fail", error.message)
}

const failed = results.filter((result) => result.status === "fail")
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`)
if (failed.length) {
  console.log("\nRemediation:")
  console.log(" 1. Backend must expose a Vercel function: keep root api/index.js and the vercel.json rewrites, then redeploy.")
  console.log(" 2. Backend env: MONGODB_URI, JWT_SECRET, CLIENT_URL, NODE_ENV=production.")
  console.log(" 3. Disable Vercel deployment protection for the API domain, or use a separate public API domain.")
  console.log(" 4. Frontend env: VITE_API_URL=https://<backend-domain>/api, then redeploy the client.")
  process.exitCode = 1
}
