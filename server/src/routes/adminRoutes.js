import { Router } from "express"
import { adminLogin, adminLogout, adminMe } from "../controllers/adminAuthController.js"
import { protect, requireAdmin } from "../middleware/auth.js"
import { rateLimit } from "../middleware/security.js"
import { validateRequest } from "../middleware/validate.js"
import { ApiError } from "../utils/validation.js"
import { getDashboard } from "../controllers/adminAnalyticsController.js"
import {
  bulkProducts,
  changeProductStatus,
  createProduct,
  deleteProduct,
  getProduct,
  listProducts,
  updateProduct,
} from "../controllers/adminProductController.js"
import { createCategory, deleteCategory, getCategory, listCategories, updateCategory } from "../controllers/adminCategoryController.js"
import { createBrand, deleteBrand, getBrand, listBrands, updateBrand } from "../controllers/adminBrandController.js"
import { getOrder, listOrders, updateOrderStatus } from "../controllers/adminOrderController.js"
import { getUser, listUsers, updateUserRole, updateUserStatus } from "../controllers/adminUserController.js"
import { deleteReview, getReview, listReviews, moderateReview } from "../controllers/adminReviewController.js"
import { createCoupon, deleteCoupon, getCoupon, listCoupons, updateCoupon } from "../controllers/adminCouponController.js"
import { createDeal, deleteDeal, getDeal, listDeals, updateDeal } from "../controllers/adminDealController.js"
import { listInventory, updateInventory } from "../controllers/adminInventoryController.js"
import { clearAdminNotifications, listAdminNotifications, markAdminNotificationRead, markAllAdminNotificationsRead } from "../controllers/adminNotificationController.js"
import { getAnalyticsOverview, getBrandAnalytics, getCategoryAnalytics, getCustomerAnalytics, getOrderAnalytics, getProductAnalytics, getRevenueAnalytics } from "../controllers/adminAnalyticsController.js"
import { adminSearch } from "../controllers/adminSearchController.js"
import { getSettings, updateSettings } from "../controllers/adminSettingsController.js"

const router = Router()
const validateAdminLogin = validateRequest({
  body: {
    email: (value) => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim())) throw new ApiError("A valid administrator email is required")
      return String(value).trim().toLowerCase()
    },
    password: (value) => {
      if (!value || String(value).length > 128) throw new ApiError("A valid administrator password is required")
      return String(value)
    },
  },
})

// Authentication is the only public part of the admin API. Every route below
// verifies the signed token against the current user record and role.
router.post("/auth/login", validateAdminLogin, rateLimit({ windowMs: 15 * 60_000, max: 20 }), adminLogin)
router.post("/login", validateAdminLogin, rateLimit({ windowMs: 15 * 60_000, max: 20 }), adminLogin)
router.use(protect, requireAdmin)
router.post("/auth/logout", adminLogout)
router.post("/logout", adminLogout)
router.get("/auth/me", adminMe)
router.get("/me", adminMe)

router.get("/dashboard", getDashboard)
router.get("/analytics", getAnalyticsOverview)
router.get("/analytics/overview", getAnalyticsOverview)
router.get("/analytics/revenue", getRevenueAnalytics)
router.get("/analytics/orders", getOrderAnalytics)
router.get("/analytics/products", getProductAnalytics)
router.get("/analytics/categories", getCategoryAnalytics)
router.get("/analytics/brands", getBrandAnalytics)
router.get("/analytics/customers", getCustomerAnalytics)

router.get("/products", listProducts)
router.post("/products", createProduct)
router.post("/products/bulk", bulkProducts)
router.get("/products/:id", getProduct)
router.patch("/products/:id", updateProduct)
router.delete("/products/:id", deleteProduct)
router.patch("/products/:id/status", changeProductStatus)

router.get("/categories", listCategories)
router.get("/categories/:id", getCategory)
router.post("/categories", createCategory)
router.patch("/categories/:id", updateCategory)
router.delete("/categories/:id", deleteCategory)

router.get("/brands", listBrands)
router.get("/brands/:id", getBrand)
router.post("/brands", createBrand)
router.patch("/brands/:id", updateBrand)
router.delete("/brands/:id", deleteBrand)

router.get("/orders", listOrders)
router.get("/orders/:id", getOrder)
router.patch("/orders/:id/status", updateOrderStatus)

router.get("/users", listUsers)
router.get("/users/:id", getUser)
router.patch("/users/:id/status", updateUserStatus)
router.patch("/users/:id/role", updateUserRole)

router.get("/reviews", listReviews)
router.get("/reviews/:id", getReview)
router.patch("/reviews/:id", moderateReview)
router.delete("/reviews/:id", deleteReview)

router.get("/coupons", listCoupons)
router.get("/coupons/:id", getCoupon)
router.post("/coupons", createCoupon)
router.patch("/coupons/:id", updateCoupon)
router.delete("/coupons/:id", deleteCoupon)

router.get("/deals", listDeals)
router.post("/deals", createDeal)
router.get("/deals/:id", getDeal)
router.patch("/deals/:id", updateDeal)
router.delete("/deals/:id", deleteDeal)

router.get("/inventory", listInventory)
router.patch("/inventory/:id", updateInventory)

router.get("/notifications", listAdminNotifications)
router.patch("/notifications/read-all", markAllAdminNotificationsRead)
router.patch("/notifications/:id/read", markAdminNotificationRead)
router.delete("/notifications", clearAdminNotifications)

router.get("/search", adminSearch)
router.get("/settings", getSettings)
router.patch("/settings", updateSettings)

export default router
