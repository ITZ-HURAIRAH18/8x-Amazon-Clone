import mongoose from "mongoose"

const addressSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, trim: true, default: "United States" },
    phone: { type: String, trim: true },
  },
  { _id: false },
)

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    address: { type: addressSchema, default: () => ({}) },
  },
  { timestamps: true },
)

userSchema.methods.toSafeObject = function toSafeObject() {
  const object = this.toObject({ versionKey: false })
  delete object.passwordHash
  return object
}

export const User = mongoose.models.User || mongoose.model("User", userSchema)
