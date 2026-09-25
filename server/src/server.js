import { createApp } from "./app.js"
import { connectDatabase, disconnectDatabase } from "./config/db.js"
import { env } from "./config/env.js"

const connected = await connectDatabase()
const app = createApp()
const server = app.listen(env.port, () => {
  console.log(`Amazon Clone API listening on http://localhost:${env.port}`)
  if (!connected) console.log("Running with demo fallback data until MongoDB is configured")
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
