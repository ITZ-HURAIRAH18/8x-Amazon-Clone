import { Router } from "express"
import { addAddress, deleteAddress, listAddresses, setDefaultAddress, updateAddress } from "../controllers/addressController.js"
import { protect } from "../middleware/auth.js"

const router = Router()
router.use(protect)
router.get("/", listAddresses)
router.post("/", addAddress)
router.patch("/:addressId", updateAddress)
router.delete("/:addressId", deleteAddress)
router.post("/:addressId/default", setDefaultAddress)
export default router
