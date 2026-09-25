import { Notification } from "../models/Notification.js"
import { User } from "../models/User.js"
import { Coupon } from "../models/Coupon.js"
import { Deal } from "../models/Deal.js"
import { Setting } from "../models/Setting.js"
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
    metadata: item.metadata || {},
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

export async function createAdminNotification(payload, { dedupeKey = null, dedupeHours = 24 } = {}) {
  const metadata = { ...(payload.metadata || {}), ...(dedupeKey ? { dedupeKey } : {}) }
  const safePayload = { ...payload, metadata }
  const admins = databaseReady()
    ? await User.find({ role: "admin", $or: [{ status: "active" }, { status: { $exists: false } }] }).select("_id")
    : memory.users.filter((user) => user.role === "admin" && (!user.status || user.status === "active"))
  if (databaseReady()) {
    const activeAdmins = admins
    for (const admin of activeAdmins) {
      if (dedupeKey) {
        const since = new Date(Date.now() - dedupeHours * 60 * 60 * 1000)
        const existing = await Notification.exists({ user: admin._id, "metadata.dedupeKey": dedupeKey, createdAt: { $gte: since } })
        if (existing) continue
      }
      await Notification.create({ user: admin._id, ...safePayload })
    }
    return activeAdmins.length
  }
  for (const admin of admins) {
    if (dedupeKey) {
      const since = Date.now() - dedupeHours * 60 * 60 * 1000
      const existing = memory.notifications.some((item) => String(item.user) === String(admin._id) && item.metadata?.dedupeKey === dedupeKey && new Date(item.createdAt).getTime() >= since)
      if (existing) continue
    }
    memory.notifications.push({ _id: id("admin-note"), user: String(admin._id), ...safePayload, readAt: null, createdAt: new Date() })
  }
  return admins.length
}

export async function generateExpiryNotifications() {
  const settings = databaseReady()
    ? await Setting.findOne({ key: "store" }).lean()
    : memory.settings
  const value = settings?.value || settings || {}
  const now = new Date()
  const couponDays = Number(value.couponExpiryDays || 7)
  const dealDays = Number(value.dealExpiryDays || 7)
  const couponLimit = new Date(now.getTime() + couponDays * 86400000)
  const dealLimit = new Date(now.getTime() + dealDays * 86400000)

  if (databaseReady()) {
    const [coupons, deals] = await Promise.all([
      Coupon.find({ active: true, expiresAt: { $gte: now, $lte: couponLimit } }).select("code expiresAt").limit(50).lean(),
      Deal.find({ active: true, endsAt: { $gte: now, $lte: dealLimit } }).select("name endsAt").limit(50).lean(),
    ])
    await Promise.all([
      ...coupons.map((coupon) => createAdminNotification({
        type: "admin-coupon",
        title: "Coupon expiring soon",
        message: `Coupon ${coupon.code} expires soon.`,
        link: "/admin/coupons",
        metadata: { entityId: String(coupon._id), expiresAt: coupon.expiresAt },
      }, { dedupeKey: `coupon-expiry:${coupon._id}:${new Date(coupon.expiresAt).toISOString().slice(0, 10)}`, dedupeHours: 24 })),
      ...deals.map((deal) => createAdminNotification({
        type: "admin-deal",
        title: "Deal expiring soon",
        message: `Deal ${deal.name} expires soon.`,
        link: "/admin/deals",
        metadata: { entityId: String(deal._id), expiresAt: deal.endsAt },
      }, { dedupeKey: `deal-expiry:${deal._id}:${new Date(deal.endsAt).toISOString().slice(0, 10)}`, dedupeHours: 24 })),
    ])
    return
  }
  const coupons = memory.coupons.filter((coupon) => coupon.active && new Date(coupon.expiresAt) >= now && new Date(coupon.expiresAt) <= couponLimit)
  const deals = memory.deals.filter((deal) => deal.active && new Date(deal.endsAt) >= now && new Date(deal.endsAt) <= dealLimit)
  await Promise.all([
    ...coupons.map((coupon) => createAdminNotification({ type: "admin-coupon", title: "Coupon expiring soon", message: `Coupon ${coupon.code} expires soon.`, link: "/admin/coupons", metadata: { entityId: coupon._id, expiresAt: coupon.expiresAt } }, { dedupeKey: `coupon-expiry:${coupon._id}:${new Date(coupon.expiresAt).toISOString().slice(0, 10)}` })),
    ...deals.map((deal) => createAdminNotification({ type: "admin-deal", title: "Deal expiring soon", message: `Deal ${deal.name} expires soon.`, link: "/admin/deals", metadata: { entityId: deal._id, expiresAt: deal.endsAt } }, { dedupeKey: `deal-expiry:${deal._id}:${new Date(deal.endsAt).toISOString().slice(0, 10)}` })),
  ])
}

export const listNotifications = asyncHandler(async (req, res) => {
  const items = databaseReady()
    ? await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(30).lean()
    : memory.notifications.filter((item) => String(item.user) === String(req.user._id)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 30)
  const data = items.map(json)
  return res.json({ success: true, data, meta: { unread: data.filter((item) => !item.read).length } })
})

export const markNotificationRead = asyncHandler(async (req, res) => {
  if (databaseReady()) {
    const item = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { readAt: new Date() }, { new: true })
    if (!item) return res.status(404).json({ success: false, message: "Notification not found", code: "NOTIFICATION_NOT_FOUND" })
    return res.json({ success: true, data: json(item) })
  }
  const item = memory.notifications.find((entry) => String(entry._id) === String(req.params.id) && String(entry.user) === String(req.user._id))
  if (!item) return res.status(404).json({ success: false, message: "Notification not found", code: "NOTIFICATION_NOT_FOUND" })
  item.readAt = new Date()
  return res.json({ success: true, data: json(item) })
})

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  if (databaseReady()) await Notification.updateMany({ user: req.user._id, readAt: null }, { readAt: new Date() })
  else memory.notifications.filter((item) => String(item.user) === String(req.user._id) && !item.readAt).forEach((item) => { item.readAt = new Date() })
  return res.json({ success: true, data: { updated: true } })
})
