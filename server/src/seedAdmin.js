import bcrypt from "bcryptjs"
import mongoose from "mongoose"
import { stdin, stdout } from "node:process"
import { connectDatabase, disconnectDatabase } from "./config/db.js"
import { env } from "./config/env.js"
import { User } from "./models/User.js"

const say = (message = "") => console.log(message)
const fail = (message) => {
  console.error(message)
  process.exitCode = 1
}
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

// readline loses buffered lines when several questions are asked in a row, which
// deadlocks piped input. This reader buffers stdin itself and hands out one line
// per question, so interactive and piped runs behave identically.
function createPrompt() {
  let buffer = ""
  const pending = []
  let waiting = null
  let closed = false

  const deliver = (line) => {
    if (waiting) { const resolve = waiting; waiting = null; resolve(line) } else pending.push(line)
  }
  const onData = (chunk) => {
    buffer += String(chunk)
    let index = buffer.indexOf("\n")
    while (index >= 0) {
      const line = buffer.slice(0, index).replace(/\r$/, "")
      buffer = buffer.slice(index + 1)
      deliver(line)
      index = buffer.indexOf("\n")
    }
  }
  const onEnd = () => {
    closed = true
    if (buffer.length) { const line = buffer.replace(/\r$/, ""); buffer = ""; deliver(line) }
    if (waiting) { const resolve = waiting; waiting = null; resolve(null) }
  }
  stdin.setEncoding("utf8")
  stdin.on("data", onData)
  stdin.on("end", onEnd)

  const nextLine = () => {
    if (pending.length) return Promise.resolve(pending.shift())
    if (closed) return Promise.resolve(null)
    return new Promise((resolve) => { waiting = resolve })
  }

  const ask = async (question, { fallback = "" } = {}) => {
    const suffix = fallback ? ` [${fallback}]` : ""
    stdout.write(`${question}${suffix}: `)
    const line = await nextLine()
    if (line === null) process.exit(0)
    const answer = line.trim()
    return answer || fallback
  }

  const askHidden = async (question) => {
    if (!stdin.isTTY) return (await ask(question)).trim()
    stdout.write(`${question}: `)
    return new Promise((resolve) => {
      const typed = []
      const cleanup = () => {
        stdin.off("data", onKey)
        stdin.setRawMode(false)
        stdin.pause()
        stdout.write("\n")
      }
      const onKey = (chunk) => {
        for (const character of String(chunk)) {
          if (character === "\r" || character === "\n") { cleanup(); resolve(typed.join("")); return }
          if (character === "\u0003") { cleanup(); process.exit(130) }
          if (character === "\u007f" || character === "\b") { if (typed.length) { typed.pop(); stdout.write("\b \b") } continue }
          typed.push(character)
          stdout.write("*")
        }
      }
      stdin.setRawMode(true)
      stdin.resume()
      stdin.on("data", onKey)
    })
  }

  return {
    ask,
    askHidden,
    close: () => {
      if (closed) return
      closed = true
      stdin.off("data", onData)
      stdin.off("end", onEnd)
      stdin.pause()
    },
  }
}

async function resolveCredentials() {
  const envEmail = String(process.env.ADMIN_EMAIL || env.adminEmail || "").trim().toLowerCase()
  const envPassword = String(process.env.ADMIN_PASSWORD || env.adminPassword || "")
  const envName = String(process.env.ADMIN_NAME || env.adminName || "").trim()
  // SEED_ADMIN_FORCE_PROMPT=1 forces the wizard even without a TTY, which is
  // useful for scripted setup and for testing the prompts.
  const interactive = Boolean(stdin.isTTY || process.env.SEED_ADMIN_FORCE_PROMPT) && !(envEmail && envPassword)

  if (!interactive) {
    // Non-interactive shells (CI, pipes) cannot answer prompts, so print the
    // exact steps on stdout and only use stderr for the exit reason.
    if (!isEmail(envEmail)) {
      say("")
      say("Setup needs an email address. Pick either option:")
      say("")
      say("  A) Run it in a normal terminal and answer the prompts:")
      say("       npm run seed:admin")
      say("")
      say("  B) Set the values first, then run it again:")
      say('       $env:ADMIN_NAME = "Operations Administrator"')
      say('       $env:ADMIN_EMAIL = "you@example.com"')
      say('       $env:ADMIN_PASSWORD = "a-long-random-password"')
      say("       npm run seed:admin")
      say("")
      say("     Or add the same three keys to server/.env (see server/.env.example).")
      console.error("ADMIN_EMAIL is not set to a valid email address")
      process.exitCode = 1
      return null
    }
    if (envPassword.length < 12 || envPassword.length > 128) {
      say("")
      say("ADMIN_PASSWORD must be between 12 and 128 characters, or leave it blank to be prompted.")
      console.error("ADMIN_PASSWORD must be between 12 and 128 characters")
      process.exitCode = 1
      return null
    }
    return { email: envEmail, password: envPassword, name: envName || "Administrator", source: "environment" }
  }

  say("No ADMIN_EMAIL / ADMIN_PASSWORD found, so this wizard will ask for them.")
  say("Nothing is saved until both password entries match.")
  say("")
  const prompt = createPrompt()
  let name = ""
  let email = ""
  let password = ""
  try {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      name = await prompt.ask("Administrator name", { fallback: "Administrator" })
      if (name.length < 2 || name.length > 120) { say("  Name must be 2-120 characters."); continue }
      email = await prompt.ask("Administrator email")
      if (!isEmail(email)) { say("  That does not look like an email address."); continue }
      password = await prompt.askHidden("Password (12+ characters)")
      if (password.length < 12 || password.length > 128) { say("  Password must be between 12 and 128 characters."); continue }
      const confirm = await prompt.askHidden("Confirm password")
      if (confirm !== password) { say("  Passwords did not match."); continue }
      return { email: email.toLowerCase(), password, name, source: "wizard" }
    }
  } finally {
    prompt.close()
  }
  fail("Too many invalid attempts. Nothing was saved.")
  return null
}

say("Amazon Clone - administrator account setup")
say("------------------------------------------")

const credentials = await resolveCredentials()
if (!credentials) {
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect()
} else {
  say("")
  say(`Using ${credentials.source === "wizard" ? "the values you just entered" : "ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD"}.`)
  say("Connecting to MongoDB...")
  let connected = false
  try {
    connected = await connectDatabase()
  } catch (error) {
    fail(`Could not reach MongoDB: ${error?.message || "connection failed"}`)
  }
  if (!connected) {
    fail("MongoDB is required to store an administrator account. Check MONGODB_URI in server/.env.")
  } else {
    const passwordHash = await bcrypt.hash(credentials.password, 12)
    const now = new Date()
    const existing = await User.findOne({ email: credentials.email }).select("+passwordHash")
    if (existing) {
      existing.name = credentials.name
      existing.passwordHash = passwordHash
      existing.role = "admin"
      existing.status = "active"
      existing.statusReason = "Seeded administrator"
      existing.statusChangedAt = now
      existing.tokenVersion = Number(existing.tokenVersion || 0) + 1
      await existing.save()
      say("")
      say(`Administrator ${credentials.email} was updated (password reset, sessions revoked).`)
    } else {
      await User.create({
        name: credentials.name,
        email: credentials.email,
        passwordHash,
        role: "admin",
        status: "active",
        statusReason: "Seeded administrator",
        statusChangedAt: now,
        tokenVersion: 0,
        addresses: [],
      })
      say("")
      say(`Administrator ${credentials.email} was created.`)
    }
    await disconnectDatabase()
    say("")
    say("Next steps")
    say("  1. Start the app:      npm run dev")
    say("  2. Open admin sign in: http://localhost:5173/admin/login")
    say("  3. Sign out from the admin menu to revoke the session when you are done.")
  }
}

if (mongoose.connection.readyState !== 0) await mongoose.disconnect()
