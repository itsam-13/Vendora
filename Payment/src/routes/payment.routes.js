const express = require('express');
const createAuthMiddleware = require('../middleware/auth.middleware')
const paymentController = require('../controller/payment.controller');


const router = express.Router();


//routes

router.post('/create/:orderId', createAuthMiddleware(['user']), paymentController.createPayment);

router.post('/verify', createAuthMiddleware(['user']), paymentController.verifyPayment);

module.exports = router;