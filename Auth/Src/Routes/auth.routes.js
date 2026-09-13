const express = require('express');

const authController = require('../Controllers/auth.controller');
const validators = require('../MiddleWare/validator.middleware');


const router = express.Router();

router.post('/register', validators.registerUserValidations, authController.registerUser);

module.exports = router;