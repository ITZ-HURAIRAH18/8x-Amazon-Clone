import mongoose from "mongoose"

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 100, index: true },
    slug: { type: String, required: true, unique: true, trim: true, maxlength: 120, index: true },
    description: { type: String, default: "", trim: true, maxlength: 500 },
    logo: { type: String, default: "", trim: true, maxlength: 2048 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
)

brandSchema.index({ active: 1, name: 1 })

export const Brand = mongoose.models.Brand || mongoose.model("Brand", brandSchema)
export default Brand
