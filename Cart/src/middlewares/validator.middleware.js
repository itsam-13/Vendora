const { body, param, validationResult } = require("express-validator");
const mongoose = require("mongoose");

const validateResult = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

const validateAddItemsToCart = [
    body("productId")
        .isString()
        .withMessage("Product ID must be String")
        .custom(value => mongoose.Types.ObjectId.isValid(value))
        .withMessage("Product ID is not valid"),
    body('qty')
        .isInt({ gt: 0 })
        .withMessage('Quantity must be positive Integer'),
    validateResult
];

const validateUpdateCartItem = [
    param("productId")
        .custom((value, { req }) => {
            const id = value || req.params.products;
            return mongoose.Types.ObjectId.isValid(id);
        })
        .withMessage("Product ID is not valid"),
    body("qty")
        .notEmpty()
        .withMessage("Quantity is required")
        .isInt()
        .withMessage("Quantity must be an integer"),
    validateResult
];

const validateGetCart = (req, res, next) => next();

const validateDeleteCartItem = [
    param("productId")
        .custom((value, { req }) => {
            const id = value || req.params.products;
            return mongoose.Types.ObjectId.isValid(id);
        })
        .withMessage("Product ID is not valid"),
    validateResult
];

const validateClearCart = (req, res, next) => next();

module.exports = { 
    validateAddItemsToCart,
    validateUpdateCartItem,
    validateGetCart,
    validateDeleteCartItem,
    validateClearCart
};
