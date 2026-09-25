import mongoose from "mongoose"

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, trim: true, maxlength: 120 },
    phone: { type: String, trim: true, maxlength: 40 },
    street: { type: String, trim: true, maxlength: 160 },
    apartment: { type: String, trim: true, maxlength: 120 },
    city: { type: String, trim: true, maxlength: 80 },
    state: { type: String, trim: true, maxlength: 80 },
    postalCode: { type: String, trim: true, maxlength: 24 },
    country: { type: String, trim: true, maxlength: 80, default: "United States" },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
)

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    addresses: { type: [addressSchema], default: [] },
    defaultAddressId: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true },
)

userSchema.methods.toSafeObject = function toSafeObject() {
  const object = this.toObject({ versionKey: false })
  delete object.passwordHash
  return object
}

export const User = mongoose.models.User || mongoose.model("User", userSchema)
