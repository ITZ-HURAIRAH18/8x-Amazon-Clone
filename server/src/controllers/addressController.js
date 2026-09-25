import { User } from "../models/User.js"
import { databaseReady } from "../config/db.js"
import { memory } from "../data/memory.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { normalizeAddress } from "../utils/pricing.js"

function serialize(address) {
  if (!address) return null
  return {
    id: String(address._id || address.id),
    ...normalizeAddress(address),
    isDefault: Boolean(address.isDefault),
  }
}

function fallbackUser(userId) {
  return memory.users.find((entry) => String(entry._id) === String(userId))
}

function listFor(user) {
  const addresses = user?.addresses || []
  return [...addresses].sort((a, b) => Number(Boolean(b.isDefault)) - Number(Boolean(a.isDefault)))
}

export const listAddresses = asyncHandler(async (req, res) => {
  const user = databaseReady() ? await User.findById(req.user._id).lean() : fallbackUser(req.user._id)
  return res.json({ data: listFor(user).map(serialize) })
})

export const addAddress = asyncHandler(async (req, res) => {
  const address = normalizeAddress(req.body)
  if (!address.fullName || !address.street || !address.city || !address.state || !address.postalCode) {
    return res.status(400).json({ message: "Complete name, street, city, state, and postal code are required", code: "ADDRESS_REQUIRED" })
  }
  if (databaseReady()) {
    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: "Account not found", code: "USER_NOT_FOUND" })
    const makeDefault = Boolean(req.body.isDefault) || user.addresses.length === 0
    if (makeDefault) user.addresses.forEach((entry) => { entry.isDefault = false })
    user.addresses.push({ ...address, isDefault: makeDefault })
    if (makeDefault) user.defaultAddressId = user.addresses[user.addresses.length - 1]._id
    await user.save()
    return res.status(201).json({ data: serialize(user.addresses[user.addresses.length - 1]) })
  }
  const user = fallbackUser(req.user._id)
  if (!user) return res.status(404).json({ message: "Account not found", code: "USER_NOT_FOUND" })
  user.addresses ||= []
  const makeDefault = Boolean(req.body.isDefault) || user.addresses.length === 0
  if (makeDefault) user.addresses.forEach((entry) => { entry.isDefault = false })
  const entry = { _id: `addr_${Date.now().toString(36)}`, ...address, isDefault: makeDefault }
  user.addresses.push(entry)
  if (makeDefault) user.defaultAddressId = entry._id
  return res.status(201).json({ data: serialize(entry) })
})

export const updateAddress = asyncHandler(async (req, res) => {
  const address = normalizeAddress(req.body)
  if (!address.fullName || !address.street || !address.city || !address.state || !address.postalCode) {
    return res.status(400).json({ message: "Complete address fields are required", code: "ADDRESS_REQUIRED" })
  }
  if (databaseReady()) {
    const user = await User.findById(req.user._id)
    const entry = user?.addresses.id(req.params.addressId)
    if (!entry) return res.status(404).json({ message: "Address not found", code: "ADDRESS_NOT_FOUND" })
    const makeDefault = req.body.isDefault === undefined ? entry.isDefault : Boolean(req.body.isDefault)
    if (makeDefault) user.addresses.forEach((item) => { item.isDefault = false })
    Object.assign(entry, address, { isDefault: makeDefault })
    if (makeDefault) user.defaultAddressId = entry._id
    else if (String(user.defaultAddressId) === String(entry._id)) user.defaultAddressId = user.addresses.find((item) => item.isDefault)?._id || null
    await user.save()
    return res.json({ data: serialize(entry) })
  }
  const user = fallbackUser(req.user._id)
  const entry = user?.addresses?.find((item) => String(item._id) === String(req.params.addressId))
  if (!entry) return res.status(404).json({ message: "Address not found", code: "ADDRESS_NOT_FOUND" })
  const makeDefault = req.body.isDefault === undefined ? entry.isDefault : Boolean(req.body.isDefault)
  if (makeDefault) user.addresses.forEach((item) => { item.isDefault = false })
  Object.assign(entry, address, { isDefault: makeDefault })
  if (makeDefault) user.defaultAddressId = entry._id
  return res.json({ data: serialize(entry) })
})

export const deleteAddress = asyncHandler(async (req, res) => {
  if (databaseReady()) {
    const user = await User.findById(req.user._id)
    if (!user) return res.status(404).json({ message: "Address not found", code: "ADDRESS_NOT_FOUND" })
    const entry = user.addresses.id(req.params.addressId)
    if (!entry) return res.status(404).json({ message: "Address not found", code: "ADDRESS_NOT_FOUND" })
    const wasDefault = entry.isDefault
    entry.deleteOne()
    if (wasDefault) {
      const next = user.addresses[0]
      if (next) {
        next.isDefault = true
        user.defaultAddressId = next._id
      } else user.defaultAddressId = null
    }
    await user.save()
    return res.json({ data: { id: req.params.addressId } })
  }
  const user = fallbackUser(req.user._id)
  const index = user?.addresses?.findIndex((item) => String(item._id) === String(req.params.addressId)) ?? -1
  if (index < 0) return res.status(404).json({ message: "Address not found", code: "ADDRESS_NOT_FOUND" })
  const [removed] = user.addresses.splice(index, 1)
  if (removed.isDefault && user.addresses[0]) user.addresses[0].isDefault = true
  if (!user.addresses.length) user.defaultAddressId = null
  return res.json({ data: { id: req.params.addressId } })
})

export const setDefaultAddress = asyncHandler(async (req, res) => {
  if (databaseReady()) {
    const user = await User.findById(req.user._id)
    const entry = user?.addresses.id(req.params.addressId)
    if (!entry) return res.status(404).json({ message: "Address not found", code: "ADDRESS_NOT_FOUND" })
    user.addresses.forEach((item) => { item.isDefault = String(item._id) === String(entry._id) })
    user.defaultAddressId = entry._id
    await user.save()
    return res.json({ data: serialize(entry) })
  }
  const user = fallbackUser(req.user._id)
  const entry = user?.addresses?.find((item) => String(item._id) === String(req.params.addressId))
  if (!entry) return res.status(404).json({ message: "Address not found", code: "ADDRESS_NOT_FOUND" })
  user.addresses.forEach((item) => { item.isDefault = String(item._id) === String(entry._id) })
  user.defaultAddressId = entry._id
  return res.json({ data: serialize(entry) })
})
