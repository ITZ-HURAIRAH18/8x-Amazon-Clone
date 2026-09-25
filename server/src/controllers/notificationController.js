import { Notification } from "../models/Notification.js"
import { databaseReady } from "../config/db.js"
import { memory, id } from "../data/memory.js"
import { asyncHandler } from "../utils/asyncHandler.js"

function json(item) {
  return {
    id: String(item._id || item.id),
    type: item.type,
    title: item.title,
    message: item.message,
    link: item.link || "",
    read: Boolean(item.readAt),
    readAt: item.readAt || null,
    createdAt: item.createdAt,
  }
}

export async function createNotification(userId, payload) {
  if (databaseReady()) {
    const created = await Notification.create({ user: userId, ...payload })
    return json(created)
  }
  const created = { _id: id("note"), user: String(userId), ...payload, readAt: null, createdAt: new Date() }
  memory.notifications.push(created)
  return json(created)
}

export const listNotifications = asyncHandler(async (req, res) => {
  const items = databaseReady()
    ? await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30).lean()
    : memory.notifications.filter((item) => String(item.user) === String(req.user._id)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 30)
  const data = items.map(json)
  return res.json({ data, meta: { unread: data.filter((item) => !item.read).length } })
})

export const markNotificationRead = asyncHandler(async (req, res) => {
  if (databaseReady()) {
    const item = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { readAt: new Date() }, { new: true })
    if (!item) return res.status(404).json({ message: "Notification not found", code: "NOTIFICATION_NOT_FOUND" })
    return res.json({ data: json(item) })
  }
  const item = memory.notifications.find((entry) => String(entry._id) === String(req.params.id) && String(entry.user) === String(req.user._id))
  if (!item) return res.status(404).json({ message: "Notification not found", code: "NOTIFICATION_NOT_FOUND" })
  item.readAt = new Date()
  return res.json({ data: json(item) })
})

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  if (databaseReady()) await Notification.updateMany({ user: req.user._id, readAt: null }, { readAt: new Date() })
  else memory.notifications.filter((item) => String(item.user) === String(req.user._id) && !item.readAt).forEach((item) => { item.readAt = new Date() })
  return res.json({ data: { updated: true } })
})
