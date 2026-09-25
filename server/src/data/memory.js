import demoProducts from "./products.js"

for (const product of demoProducts) {
  product.active ??= true
  product.lowStockThreshold ??= 10
}

const categories = [...new Set(demoProducts.map((product) => product.category))].map((name) => ({
  _id: `category-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  description: `${name} products`,
  image: "",
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}))

const brands = [...new Set(demoProducts.map((product) => product.brand))].map((name) => ({
  _id: `brand-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
  description: `${name} products`,
  logo: "",
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}))

export const memory = {
  products: demoProducts,
  categories,
  brands,
  deals: [],
  users: [],
  carts: new Map(),
  wishlists: new Map(),
  orders: [],
  reviews: [],
  notifications: [],
  coupons: [
    {
      _id: "coupon-save10",
      code: "SAVE10",
      description: "10% off your order",
      discountType: "percent",
      discountValue: 10,
      minimumOrder: 25,
      maximumDiscount: 50,
      startsAt: new Date("2025-01-01T00:00:00.000Z"),
      expiresAt: new Date("2030-12-31T23:59:59.000Z"),
      active: true,
      usageLimit: null,
      perUserLimit: null,
      usageCount: 0,
      redemptions: [],
    },
    {
      _id: "coupon-welcome5",
      code: "WELCOME5",
      description: "$5 off orders over $20",
      discountType: "fixed",
      discountValue: 5,
      minimumOrder: 20,
      maximumDiscount: 5,
      startsAt: new Date("2025-01-01T00:00:00.000Z"),
      expiresAt: new Date("2030-12-31T23:59:59.000Z"),
      active: true,
      usageLimit: null,
      perUserLimit: null,
      usageCount: 0,
      redemptions: [],
    },
    {
      _id: "coupon-freeship",
      code: "FREESHIP",
      description: "Free standard delivery",
      discountType: "shipping",
      discountValue: 0,
      minimumOrder: 0,
      maximumDiscount: null,
      startsAt: new Date("2025-01-01T00:00:00.000Z"),
      expiresAt: new Date("2030-12-31T23:59:59.000Z"),
      active: true,
      usageLimit: null,
      perUserLimit: null,
      usageCount: 0,
      redemptions: [],
    },
  ],
  settings: {
    storeName: "Amazon Clone",
    supportEmail: "support@example.com",
    customerServiceEmail: "support@example.com",
    currency: "USD",
    defaultOrderStatus: "Pending",
    lowStockThreshold: 10,
    freeShippingThreshold: 35,
    standardShippingFee: 5.99,
    taxRate: 8,
    lowStockNotifications: true,
    orderNotifications: true,
    reviewNotifications: true,
    couponExpiryDays: 7,
    dealExpiryDays: 7,
    maintenanceMessage: "",
  },
}

export function id(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}
