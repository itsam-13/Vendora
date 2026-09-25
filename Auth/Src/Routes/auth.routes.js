const express = require('express');
const authController = require('../Controllers/auth.controller');
const validators = require('../MiddleWare/validator.middleware');
const { authMiddleware } = require('../MiddleWare/auth.middleware');


const router = express.Router();

// Register User Route
router.post('/register', validators.registerUserValidations, authController.registerUser);

// Login User Route
router.post('/login', validators.loginUserValidations, authController.loginUser);

// Get Current User Route
router.get('/me', authMiddleware, authController.getCurrentUser);

module.exports = router;