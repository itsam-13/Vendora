const { body, validationResult } = require("express-validator")

const responseWithValidationError = (req, res, next) => {
    try {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() })
        }
        next()
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Internal Server Error' })
    }
}

const createOrderValidation = [
    
    // street validation
    body("shippingAddress.street")
        .notEmpty()
        .withMessage("Street is required")
        .isString()
        .withMessage("Street must be a string")
        .trim(),

    // city validation
    body("shippingAddress.city")
        .notEmpty()
        .withMessage("City is required")
        .isString()
        .withMessage("City must be a string")
        .trim(),

    // state validation
    body("shippingAddress.state")
        .notEmpty()
        .withMessage("State is required")
        .isString()
        .withMessage("State must be a string")
        .trim(),

    // pincode validation: required and valid 6-digit number
    body("shippingAddress.pincode")
        .notEmpty()
        .withMessage("Pincode is required")
        .isString()
        .withMessage("Pincode must be a string")
        .trim()
        .matches(/^\d{6}$/)
        .withMessage("Pincode must be a valid 6-digit number"),

    // country validation (optional)
    body("shippingAddress.country")
        .optional({ values: 'falsy' })
        .isString()
        .withMessage("Country must be a string")
        .trim(),

    
    responseWithValidationError
];

const updateAddressValidation = [
    // street validation
    body("street")
        .notEmpty()
        .withMessage("Street is required")
        .isString()
        .withMessage("Street must be a string")
        .trim(),

    // city validation
    body("city")
        .notEmpty()
        .withMessage("City is required")
        .isString()
        .withMessage("City must be a string")
        .trim(),

    // state validation
    body("state")
        .notEmpty()
        .withMessage("State is required")
        .isString()
        .withMessage("State must be a string")
        .trim(),

    // pincode validation: required and valid 6-digit number
    body("pincode")
        .notEmpty()
        .withMessage("Pincode is required")
        .isString()
        .withMessage("Pincode must be a string")
        .trim()
        .matches(/^\d{6}$/)
        .withMessage("Pincode must be a valid 6-digit number"),

    // country validation (optional)
    body("country")
        .optional({ values: 'falsy' })
        .isString()
        .withMessage("Country must be a string")
        .trim(),

    responseWithValidationError
];

module.exports = {
    createOrderValidation,
    updateAddressValidation
};