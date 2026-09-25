import { Notification } from "../models/Notification.js"
import { databaseReady } from "../config/db.js"
import { memory } from "../data/memory.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError, escapeRegex, idOf, isMongoId, pagination, text, withPagination } from "../utils/validation.js"
import { generateExpiryNotifications } from "./notificationController.js"

function serialize(value) {
  return {
    id: idOf(value),
    type: value.type,
    title: value.title,
    message: value.message,
    link: value.link || "",
    metadata: value.metadata || {},
    read: Boolean(value.readAt),
    readAt: value.readAt || null,
    createdAt: value.createdAt,
  }
}

export const listAdminNotifications = asyncHandler(async (req, res) => {
  await generateExpiryNotifications().catch(() => {})
  const { page, limit, skip } = pagination(req.query, { defaultLimit: 30, maxLimit: 100 })
  const search = text(req.query.search || req.query.q, { max: 120, label: "Search" })
  const readFilter = req.query.read
  if (readFilter !== undefined && !["true", "false", "all"].includes(String(readFilter))) throw new ApiError("Invalid notification read filter")
  if (databaseReady()) {
    const filter = { user: req.user._id }
    if (readFilter === "true") filter.readAt = { $ne: null }
    if (readFilter === "false") filter.readAt = null
    if (search) filter.$or = [{ title: new RegExp(escapeRegex(search), "i") }, { message: new RegExp(escapeRegex(search), "i") }]
    const [rows, total, unread] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ user: req.user._id, readAt: null }),
    ])
    return res.json({ success: true, ...withPagination(rows.map(serialize), total, page, limit), meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)), unread } })
  }
  const term = search.toLowerCase()
  const all = memory.notifications.filter((item) => String(item.user) === String(req.user._id))
  const rows = all.filter((item) => (!term || `${item.title} ${item.message}`.toLowerCase().includes(term)) && (readFilter === undefined || readFilter === "all" || String(Boolean(item.readAt)) === readFilter)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  return res.json({ success: true, ...withPagination(rows.slice(skip, skip + limit).map(serialize), rows.length, page, limit), meta: { page, limit, total: rows.length, pages: Math.max(1, Math.ceil(rows.length / limit)), unread: all.filter((item) => !item.readAt).length } })
})

export const markAdminNotificationRead = asyncHandler(async (req, res) => {
  if (!isMongoId(req.params.id) && !memory.notifications.some((item) => String(item._id) === req.params.id)) throw new ApiError("Notification not found", 404, "NOTIFICATION_NOT_FOUND")
  let item
  if (databaseReady()) item = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { $set: { readAt: new Date() } }, { new: true })
  else {
    item = memory.notifications.find((entry) => String(entry._id) === req.params.id && String(entry.user) === String(req.user._id))
    if (item) item.readAt = new Date()
  }
  if (!item) throw new ApiError("Notification not found", 404, "NOTIFICATION_NOT_FOUND")
  return res.json({ success: true, message: "Notification marked as read", data: serialize(item) })
})

export const markAllAdminNotificationsRead = asyncHandler(async (req, res) => {
  if (databaseReady()) await Notification.updateMany({ user: req.user._id, readAt: null }, { $set: { readAt: new Date() } })
  else memory.notifications.filter((item) => String(item.user) === String(req.user._id) && !item.readAt).forEach((item) => { item.readAt = new Date() })
  return res.json({ success: true, message: "All notifications marked as read", data: { updated: true } })
})

export const clearAdminNotifications = asyncHandler(async (req, res) => {
  let deleted
  if (databaseReady()) deleted = await Notification.deleteMany({ user: req.user._id })
  else {
    const keep = memory.notifications.filter((item) => String(item.user) !== String(req.user._id))
    deleted = { deletedCount: memory.notifications.length - keep.length }
    memory.notifications.splice(0, memory.notifications.length, ...keep)
  }
  return res.json({ success: true, message: "Notifications cleared", data: { deleted: deleted.deletedCount || 0 } })
})
