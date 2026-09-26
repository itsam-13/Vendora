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

// Logout Route
router.get('/logout', authMiddleware, authController.logoutUser);

// Address Routes

router.get('/users/me/address', authMiddleware, authController.getUserAddresses)

router.post('/users/me/address', validators.addAddressValidations, authMiddleware, authController.addUserAddress)

router.delete('/users/me/address/:addressID', authMiddleware, authController.deleteAddress)

module.exports = router;