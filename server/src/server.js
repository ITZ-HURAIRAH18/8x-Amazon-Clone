import { createApp } from "./app.js"
import { connectDatabase } from "./config/db.js"
import { env } from "./config/env.js"

const connected = await connectDatabase()
const app = createApp()
app.listen(env.port, () => {
  console.log(`Amazon Clone API listening on http://localhost:${env.port}`)
  if (!connected) console.log("Running with demo fallback data until MongoDB is configured")
})
