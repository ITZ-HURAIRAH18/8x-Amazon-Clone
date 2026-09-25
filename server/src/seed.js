import mongoose from "mongoose"
import { connectDatabase, disconnectDatabase } from "./config/db.js"
import { Product } from "./models/Product.js"
import demoProducts from "./data/products.js"

const connected = await connectDatabase()
if (!connected) {
  console.error("MongoDB is required to seed the database")
  process.exitCode = 1
} else {
  await Product.deleteMany({})
  const products = demoProducts.map(({ _id, slug2, ...product }) => product)
  await Product.insertMany(products)
  console.log(`Seeded ${products.length} products`)
  await disconnectDatabase()
}

if (mongoose.connection.readyState !== 0) await mongoose.disconnect()
