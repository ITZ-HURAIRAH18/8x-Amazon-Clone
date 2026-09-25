import mongoose from "mongoose"

const productSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, unique: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, index: true },
    description: { type: String, required: true },
    price: { type: Number, required: true, min: 0, index: true },
    originalPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    images: [{ type: String, required: true }],
    category: { type: String, required: true, index: true },
    brand: { type: String, required: true, index: true },
    rating: { type: Number, default: 0, min: 0, max: 5, index: true },
    reviewCount: { type: Number, default: 0, min: 0 },
    stock: { type: Number, default: 0, min: 0, index: true },
    bestseller: { type: Boolean, default: false, index: true },
    featured: { type: Boolean, default: false, index: true },
    deal: { type: Boolean, default: false, index: true },
    badge: { type: String, default: "" },
    prime: { type: Boolean, default: true },
    delivery: { type: String, default: "FREE delivery" },
    features: [{ type: String }],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
)

productSchema.index({ title: "text", category: "text", brand: "text" })

export const Product = mongoose.models.Product || mongoose.model("Product", productSchema)
