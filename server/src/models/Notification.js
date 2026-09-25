import mongoose from "mongoose"

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["order", "wishlist", "stock", "system", "admin-order", "admin-review", "admin-stock", "admin-coupon", "admin-deal", "admin-customer", "admin-system"], default: "system" },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    link: { type: String, default: "" },
    readAt: { type: Date, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

notificationSchema.index({ user: 1, createdAt: -1 })
notificationSchema.index({ user: 1, readAt: 1 })

export const Notification = mongoose.models.Notification || mongoose.model("Notification", notificationSchema)
