import mongoose from "mongoose"
import { connectDatabase, disconnectDatabase } from "./config/db.js"
import { Product } from "./models/Product.js"
import { Coupon } from "./models/Coupon.js"
import { Category } from "./models/Category.js"
import { Brand } from "./models/Brand.js"
import { Deal } from "./models/Deal.js"
import demoProducts from "./data/products.js"

const connected = await connectDatabase()
if (!connected) {
  console.error("MongoDB is required to seed the database")
  process.exitCode = 1
} else {
  await Product.deleteMany({})
  const products = demoProducts.map(({ _id, slug2, ...product }) => ({
    ...product,
    specifications: product.specifications || {
      Brand: product.brand,
      Category: product.category,
      Shipping: "Ships from Amazon Clone",
      Returns: "30-day returns",
    },
    dealEndsAt: product.deal ? new Date(Date.now() + (8 * 60 * 60 * 1000)) : null,
  }))
  await Product.insertMany(products)
  const categoryNames = [...new Set(products.map((product) => product.category))]
  const brandNames = [...new Set(products.map((product) => product.brand))]
  await Category.deleteMany({})
  await Brand.deleteMany({})
  await Deal.deleteMany({})
  await Category.insertMany(categoryNames.map((name) => ({ name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), description: `${name} products`, active: true })))
  await Brand.insertMany(brandNames.map((name) => ({ name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), description: `${name} products`, active: true })))
  await Coupon.deleteMany({})
  await Coupon.insertMany([
    {
      code: "SAVE10",
      description: "10% off your order",
      discountType: "percent",
      discountValue: 10,
      minimumOrder: 25,
      maximumDiscount: 50,
      expiresAt: new Date("2030-12-31T23:59:59.000Z"),
      active: true,
    },
    {
      code: "WELCOME5",
      description: "$5 off orders over $20",
      discountType: "fixed",
      discountValue: 5,
      minimumOrder: 20,
      maximumDiscount: 5,
      expiresAt: new Date("2030-12-31T23:59:59.000Z"),
      active: true,
    },
    {
      code: "FREESHIP",
      description: "Free standard delivery",
      discountType: "shipping",
      discountValue: 0,
      minimumOrder: 0,
      expiresAt: new Date("2030-12-31T23:59:59.000Z"),
      active: true,
    },
  ])
  console.log(`Seeded ${products.length} products, ${categoryNames.length} categories, ${brandNames.length} brands, and 3 coupons`)
  console.log("Existing deals were removed because seeded products receive new identifiers.")
  await disconnectDatabase()
}

if (mongoose.connection.readyState !== 0) await mongoose.disconnect()
