import mongoose from "mongoose"

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    comment: { type: String, required: true, trim: true, maxlength: 2000 },
    verifiedPurchase: { type: Boolean, default: false },
    helpfulCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
)

reviewSchema.index({ product: 1, user: 1 }, { unique: true })
reviewSchema.index({ product: 1, createdAt: -1 })

export const Review = mongoose.models.Review || mongoose.model("Review", reviewSchema)
