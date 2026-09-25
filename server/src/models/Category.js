import mongoose from "mongoose"

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 100, index: true },
    slug: { type: String, required: true, unique: true, trim: true, maxlength: 120, index: true },
    description: { type: String, default: "", trim: true, maxlength: 500 },
    image: { type: String, default: "", trim: true, maxlength: 2048 },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
)

categorySchema.index({ active: 1, name: 1 })

export const Category = mongoose.models.Category || mongoose.model("Category", categorySchema)
export default Category
