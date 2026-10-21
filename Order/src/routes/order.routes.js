const express = require("express")
const authMiddleware = require("../middleware/auth.middleware")
const orderController = require("../controller/order.controller")
const validation = require("../middleware/validation.middleware")

const router = express.Router()

//Order API

router.post("/", authMiddleware.createAuthMiddleware(["user"]), validation.createOrderValidation, orderController.createOrder)

router.get("/me", authMiddleware.createAuthMiddleware(["user"]), orderController.getMyOrders)

router.get("/:id", authMiddleware.createAuthMiddleware(["user", "admin"]), orderController.getOrderById)

router.post("/:id/cancel", authMiddleware.createAuthMiddleware(["user"]), orderController.cancelOrderById)

router.patch("/:id/address", authMiddleware.createAuthMiddleware(["user"]), validation.updateAddressValidation, orderController.updateOrderAddressById)

module.exports = router
