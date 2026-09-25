import mongoose from "mongoose"

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    description: { type: String, required: true, trim: true, maxlength: 240 },
    discountType: { type: String, enum: ["percent", "fixed", "shipping"], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    minimumOrder: { type: Number, default: 0, min: 0 },
    maximumDiscount: { type: Number, default: null, min: 0 },
    startsAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    active: { type: Boolean, default: true, index: true },
    usageLimit: { type: Number, default: null, min: 1 },
    usageCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
)

couponSchema.index({ active: 1, expiresAt: 1 })

export const Coupon = mongoose.models.Coupon || mongoose.model("Coupon", couponSchema)
