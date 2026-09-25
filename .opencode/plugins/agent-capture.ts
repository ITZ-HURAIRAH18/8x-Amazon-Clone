import { promises as fs } from "node:fs"
import path from "node:path"

const TOOL = "opencode"
const AUTHOR = process.env.AGENT_CAPTURE_AUTHOR || "ITZ-HURAIRAH18"
const LOG_DIR_NAME = ".agent-logs"

type Turn = {
  num: number
  messageID: string
  prompt: string
  promptTime: string
  model: string
  response?: string
  responseTime?: string
  responseModel?: string
}

type SessionState = {
  sessionID: string
  file: string
  turns: Turn[]
  model: string
}

const states = new Map<string, SessionState>()
const timers = new Map<string, ReturnType<typeof setTimeout>>()
const queues = new Map<string, Promise<unknown>>()

function enqueue<T>(sessionID: string, task: () => Promise<T>) {
  const previous = queues.get(sessionID) || Promise.resolve()
  const current = previous.catch(() => undefined).then(task)
  queues.set(sessionID, current)
  void current.then(
    () => {
      if (queues.get(sessionID) === current) queues.delete(sessionID)
    },
    () => {
      if (queues.get(sessionID) === current) queues.delete(sessionID)
    },
  )
  return current
}

function iso(time = Date.now()) {
  return new Date(time).toISOString()
}

function fileStamp(time: string) {
  const date = new Date(time)
  const pad = (value: number) => String(value).padStart(2, "0")
  return [
    date.getUTCFullYear(),
    "-",
    pad(date.getUTCMonth() + 1),
    "-",
    pad(date.getUTCDate()),
    "_",
    pad(date.getUTCHours()),
    "-",
    pad(date.getUTCMinutes()),
    "-",
    pad(date.getUTCSeconds()),
  ].join("")
}

function safeID(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_")
}

function modelName(model: any) {
  if (!model) return "unknown"
  if (typeof model === "string") return model
  if (model.id) {
    return model.providerID ? `${model.providerID}/${model.id}` : String(model.id)
  }
  return "unknown"
}

function projectName(directory: string) {
  const value = path.basename(directory).toLowerCase().replace(/[^a-z0-9]+/g, "-")
  return value || "project"
}

function projectForLog(file: string) {
  return path.basename(path.dirname(path.dirname(file)))
}

function logDirectory(directory: string) {
  return path.join(directory, LOG_DIR_NAME)
}

function messageID(message: any) {
  return typeof message?.id === "string" ? message.id : undefined
}

function textOf(message: any) {
  if (!message) return ""
  if (typeof message.text === "string" && !Array.isArray(message.content)) return message.text
  if (!Array.isArray(message.content)) return ""
  return message.content
    .filter((part: any) => part?.type === "text" && typeof part.text === "string")
    .map((part: any) => part.text)
    .join("")
}

function modelOf(message: any, fallback: string) {
  const value = modelName(message?.model)
  return value === "unknown" ? fallback : value
}

function entryHeader(type: "PROMPT" | "RESPONSE", turn: Turn, state: SessionState) {
  const timestamp = type === "PROMPT" ? turn.promptTime : turn.responseTime || iso()
  const model = type === "PROMPT" ? turn.model : turn.responseModel || turn.model
  return `[LOG_ENTRY type=${type} num=${turn.num} session=${state.sessionID}]\ntimestamp: ${timestamp}\nmodel: ${model}\n\n`
}

function initialFile(state: SessionState, first: Turn) {
  const date = first.promptTime.slice(0, 10)
  return [
    "---",
    `session_id: ${state.sessionID}`,
    `date: ${date}`,
    `author: ${AUTHOR}`,
    `model: ${state.model}`,
    `tool: ${TOOL}`,
    `project: ${projectForLog(state.file)}`,
    `total_exchanges: ${Math.max(1, state.turns.length)}`,
    `first_prompt_time: ${first.promptTime}`,
    `last_prompt_time: ${first.promptTime}`,
    "---",
    "",
    `# Session Log - ${date}`,
    "",
    `Session: \`${state.sessionID}\` | Project: \`${projectForLog(state.file)}\` | Author: \`${AUTHOR}\``,
    "",
    "---",
    "",
  ].join("\n")
}

async function updateHeader(file: string, state: SessionState) {
  let text = await fs.readFile(file, "utf8")
  const first = state.turns[0]
  const last = state.turns[state.turns.length - 1]
  const replacements: Record<string, string> = {
    date: first.promptTime.slice(0, 10),
    model: state.model,
    total_exchanges: String(state.turns.length),
    first_prompt_time: first.promptTime,
    last_prompt_time: last.promptTime,
  }
  for (const [key, value] of Object.entries(replacements)) {
    const expression = new RegExp(`^${key}:.*$`, "m")
    text = text.replace(expression, `${key}: ${value}`)
  }
  await fs.writeFile(file, text, "utf8")
}

async function findLogFile(directory: string, sessionID: string) {
  const dir = logDirectory(directory)
  const names = await fs.readdir(dir).catch(() => [])
  const suffix = `_${safeID(sessionID)}.md`
  const name = names.filter((value) => value.endsWith(suffix)).sort()[0]
  return name ? path.join(dir, name) : undefined
}

async function ensureState(ctx: any, sessionID: string, first: Turn) {
  const existing = states.get(sessionID)
  if (existing) return existing
  const directory = ctx.location.directory
  await fs.mkdir(logDirectory(directory), { recursive: true })
  const existingFile = await findLogFile(directory, sessionID)
  const file = existingFile || path.join(logDirectory(directory), `${fileStamp(first.promptTime)}_${safeID(sessionID)}.md`)
  const state: SessionState = {
    sessionID,
    file,
    turns: [],
    model: first.model,
  }
  states.set(sessionID, state)
  if (!existingFile) {
    await fs.writeFile(file, initialFile(state, first), { encoding: "utf8", flag: "wx" }).catch(async (error: any) => {
      if (error?.code !== "EEXIST") throw error
    })
  }
  return state
}

async function addTurnUnsafe(ctx: any, event: any) {
  const sessionID = String(event.sessionID)
  const text = typeof event.prompt?.text === "string" ? event.prompt.text : ""
  const promptTime = iso()
  let model = "unknown"
  let parentID: string | undefined
  try {
    const session = await ctx.session.get({ sessionID })
    model = modelName(session?.model)
    parentID = session?.parentID
  } catch {
    // The admission hook can run before a newly-created session is readable.
  }

  // Subagent sessions are implementation details, not user-facing exchanges.
  if (parentID) return

  const first: Turn = {
    num: 1,
    messageID: String(event.messageID),
    prompt: text,
    promptTime,
    model,
  }
  const state = await ensureState(ctx, sessionID, first)
  if (state.turns.some((turn) => turn.messageID === first.messageID)) return
  const turn: Turn = { ...first, num: state.turns.length + 1 }
  state.turns.push(turn)
  state.model = model
  await fs.appendFile(state.file, entryHeader("PROMPT", turn, state) + text + "\n\n", "utf8")
  await updateHeader(state.file, state)
}

async function addTurn(ctx: any, event: any) {
  return enqueue(String(event.sessionID), () => addTurnUnsafe(ctx, event))
}

async function messagesFor(ctx: any, sessionID: string) {
  const result = await ctx.session.context({ sessionID })
  if (Array.isArray(result)) return result
  if (Array.isArray(result?.data)) return result.data
  if (Array.isArray(result?.messages)) return result.messages
  return []
}

async function captureResponsesUnsafe(ctx: any, sessionID: string) {
  const state = states.get(sessionID)
  if (!state) return
  const messages = await messagesFor(ctx, sessionID)
  for (const turn of state.turns) {
    if (turn.response !== undefined) continue
    const start = messages.findIndex((message: any) => messageID(message) === turn.messageID)
    if (start < 0) continue
    const assistants = messages.slice(start + 1).filter((message: any) => message?.type === "assistant")
    const finalMessage = [...assistants].reverse().find((message: any) => textOf(message).length > 0)
    if (!finalMessage) continue
    const response = textOf(finalMessage)
    turn.response = response
    turn.responseTime = finalMessage?.time?.completed ? iso(finalMessage.time.completed) : iso()
    turn.responseModel = modelOf(finalMessage, turn.model)
    state.model = turn.responseModel
    await fs.appendFile(state.file, entryHeader("RESPONSE", turn, state) + response + "\n\n", "utf8")
    await updateHeader(state.file, state)
  }
}

async function captureResponses(ctx: any, sessionID: string) {
  try {
    await enqueue(sessionID, () => captureResponsesUnsafe(ctx, sessionID))
  } catch (error) {
    console.error("[agent-capture] response capture failed", error)
  }
}

function schedule(ctx: any, sessionID: string, delay = 150) {
  const previous = timers.get(sessionID)
  if (previous) clearTimeout(previous)
  timers.set(
    sessionID,
    setTimeout(() => {
      timers.delete(sessionID)
      void captureResponses(ctx, sessionID)
    }, delay),
  )
}

function sessionIDFromEvent(event: any) {
  const data = event?.data
  const properties = event?.properties
  return data?.sessionID || data?.sessionId || properties?.sessionID || properties?.sessionId || event?.sessionID || event?.sessionId
}

export default {
  id: "assignment.agent-capture",
  async setup(ctx) {
    const controller = new AbortController()
    void (async () => {
      try {
        for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
          const sessionID = sessionIDFromEvent(event)
          if (!sessionID) continue
          const type = String(event?.type || "")
          if (
            type === "session.idle" ||
            type === "session.error" ||
            type === "session.execution.succeeded" ||
            type === "session.execution.failed" ||
            type === "session.execution.interrupted"
          ) {
            schedule(ctx, String(sessionID), 250)
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) console.error("[agent-capture] event stream failed", error)
      }
    })()

    const registration = await ctx.session.hook("prompt", async (event) => {
      await addTurn(ctx, event)
    })

    return async () => {
      controller.abort()
      await registration.dispose()
      for (const timer of timers.values()) clearTimeout(timer)
      timers.clear()
    }
  },
}
