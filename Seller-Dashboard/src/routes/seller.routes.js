const express = require('express')
const router = express.Router()
const controller = require('../controller/seller.controller')
const createAuthMiddleware = require('../middleWare/auth.middleware')


router.get('/metrics', createAuthMiddleware(['seller']), controller.getMetrics)
router.get('/orders', createAuthMiddleware(['seller']), controller.getOrders)
router.get('/products', createAuthMiddleware(['seller']), controller.getProducts)

module.exports = router
