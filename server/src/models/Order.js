import mongoose from "mongoose"

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    title: { type: String, required: true },
    image: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
)

const orderEventSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    label: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
)

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, sparse: true, index: true, default: () => `AMZ-${Math.random().toString(36).slice(2, 10).toUpperCase()}` },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: { type: [orderItemSchema], required: true },
    shippingAddress: { type: mongoose.Schema.Types.Mixed, required: true },
    paymentMethod: { type: String, required: true },
    paymentStatus: { type: String, enum: ["Pending", "Paid", "Failed", "Refunded"], default: "Paid" },
    deliveryMethod: { type: String, enum: ["standard", "priority", "express"], default: "standard" },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    couponCode: { type: String, default: "" },
    shipping: { type: Number, required: true, min: 0 },
    tax: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["Pending", "Processing", "Shipped", "Out for delivery", "Delivered", "Cancelled"],
      default: "Pending",
      index: true,
    },
    estimatedDelivery: { type: Date, default: null },
    trackingNumber: { type: String, default: "" },
    statusHistory: { type: [orderEventSchema], default: [] },
    inventoryRestored: { type: Boolean, default: false },
    cancelledAt: { type: Date, default: null },
    dealReservations: { type: [{ deal: { type: mongoose.Schema.Types.ObjectId, ref: "Deal" }, product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" }, quantity: { type: Number, min: 1 } }], default: [], select: false },
    clientRequestId: { type: String, index: true },
  },
  { timestamps: true },
)

orderSchema.index({ user: 1, clientRequestId: 1 }, { unique: true, sparse: true })
orderSchema.index({ user: 1, createdAt: -1 })
orderSchema.index({ status: 1, estimatedDelivery: 1 })

export const Order = mongoose.models.Order || mongoose.model("Order", orderSchema)
