import { connectDatabase, disconnectDatabase } from "./config/db.js"
import { Coupon } from "./models/Coupon.js"

const coupons = [
  { code: "SAVE10", description: "10% off your order", discountType: "percent", discountValue: 10, minimumOrder: 25, maximumDiscount: 50, expiresAt: new Date("2030-12-31T23:59:59.000Z"), active: true },
  { code: "WELCOME5", description: "$5 off orders over $20", discountType: "fixed", discountValue: 5, minimumOrder: 20, maximumDiscount: 5, expiresAt: new Date("2030-12-31T23:59:59.000Z"), active: true },
  { code: "FREESHIP", description: "Free standard delivery", discountType: "shipping", discountValue: 0, minimumOrder: 0, expiresAt: new Date("2030-12-31T23:59:59.000Z"), active: true },
]

const connected = await connectDatabase()
if (!connected) {
  console.error("MongoDB is required to seed coupons")
  process.exitCode = 1
} else {
  await Promise.all(coupons.map((coupon) => Coupon.updateOne({ code: coupon.code }, { $set: coupon }, { upsert: true })))
  console.log(`Seeded ${coupons.length} coupons`)
  await disconnectDatabase()
}
