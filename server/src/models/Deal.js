import mongoose from "mongoose"

const dealProductSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    originalPrice: { type: Number, required: true, min: 0 },
    dealPrice: { type: Number, required: true, min: 0 },
    previousPrice: { type: Number, required: true, min: 0 },
    previousDiscount: { type: Number, default: 0, min: 0, max: 100 },
    previousDeal: { type: Boolean, default: false },
    previousDealEndsAt: { type: Date, default: null },
  },
  { _id: false },
)

const dealSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 140, index: true },
    slug: { type: String, required: true, unique: true, trim: true, maxlength: 160, index: true },
    description: { type: String, default: "", trim: true, maxlength: 1000 },
    bannerImage: { type: String, default: "", trim: true, maxlength: 2048 },
    discountType: { type: String, enum: ["percent", "fixed"], default: "percent" },
    discountValue: { type: Number, required: true, min: 0 },
    startsAt: { type: Date, default: Date.now, index: true },
    endsAt: { type: Date, required: true, index: true },
    products: { type: [dealProductSchema], default: [] },
    stockLimit: { type: Number, default: null, min: 1 },
    claimedQuantity: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true, index: true },
    featured: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
)

dealSchema.index({ active: 1, startsAt: 1, endsAt: 1 })
dealSchema.index({ "products.product": 1 })

export const Deal = mongoose.models.Deal || mongoose.model("Deal", dealSchema)
export default Deal
