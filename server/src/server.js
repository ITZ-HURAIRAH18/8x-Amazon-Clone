import { createApp } from "./app.js"
import { connectDatabase, disconnectDatabase } from "./config/db.js"
import { env } from "./config/env.js"

const connected = await connectDatabase()
const app = createApp()
const server = app.listen(env.port, () => {
  console.log(`Amazon Clone API listening on http://localhost:${env.port}`)
  if (!connected) console.log("Running with demo fallback data until MongoDB is configured")
})

server.once("error", (error) => {
  if (error?.code === "EADDRINUSE") {
    console.error([
      `Unable to start the API because port ${env.port} is already in use.`,
      `Another backend may already be running at http://localhost:${env.port}/api/health.`,
      "If it is this API, do not start a second instance.",
      "Otherwise, stop the process using that port or update PORT in server/.env and VITE_API_URL in client/.env together.",
    ].join("\n"))
  } else {
    console.error(`Unable to start the API: ${error?.message || "Unknown server error"}`)
  }

  void disconnectDatabase()
    .catch(() => {})
    .finally(() => {
      process.exitCode = 1
    })
})

const shutdown = async (signal) => {
  console.log(`${signal} received; closing HTTP server`)
  server.close(async () => {
    await disconnectDatabase()
    process.exit(0)
  })
}

process.once("SIGTERM", () => void shutdown("SIGTERM"))
process.once("SIGINT", () => void shutdown("SIGINT"))
