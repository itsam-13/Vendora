const { body, validationResult } = require('express-validator')


const responseWithvalidationError = (req, res, next) => {
    try {
        const errors = validationResult(req)
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() })
        }
        next()
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Internal Server Error' })
    }
}

const registerUserValidations = [

    // username validation
    body("username")
        .notEmpty()
        .withMessage("Username is required")
        .isString()
        .withMessage("Username must be a string")
        .isLength({ min: 3, max: 30 })
        .withMessage("Username must be between 3 and 30 characters long")
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage("Username must contain only letters, numbers, and underscores"),

    // email validation
    body("email")
        .isEmail()
        .withMessage("Email is not valid")
        .normalizeEmail()
        .trim(),

    // password validation
    body("password")
        .isLength({ min: 8, max: 16 })
        .withMessage("Password must be between 8 and 16 characters long")
        .matches(/[A-Z]/)
        .withMessage("Password must contain at least one uppercase letter")
        .matches(/[a-z]/)
        .withMessage("Password must contain at least one lowercase letter")
        .matches(/\d/)
        .withMessage("Password must contain at least one number")
        .matches(/[@$!%*#?&]/)
        .withMessage("Password must contain at least one special character"),

    //role validation
    body("role")
        .optional()
        .isIn(['user', 'seller'])
        .withMessage("Role must be one of user or seller"),

    // normalize fullName from fullname if provided
    (req, res, next) => {
        if (req.body && req.body.fullname && !req.body.fullName) {
            req.body.fullName = req.body.fullname;
        }
        next();
    },

    // first name validation
    body("fullName.firstName")
        .notEmpty()
        .withMessage("First name is required")
        .isString()
        .withMessage("First name must be a string")
        .isLength({ min: 2, max: 50 })
        .withMessage("First name must be between 2 and 50 characters long"),

    // last name validation
    body("fullName.lastName")
        .notEmpty()
        .withMessage("Last name is required")
        .isString()
        .withMessage("Last name must be a string")
        .isLength({ min: 2, max: 50 })
        .withMessage("Last name must be between 2 and 50 characters long"),

    responseWithvalidationError

]

const loginUserValidations = [

    // email validation (optional, but must be valid format if provided)
    body('email')
        .optional({ values: 'falsy' })
        .isEmail()
        .withMessage('Email is not valid')
        .normalizeEmail()
        .trim(),

    // username validation (optional, but must be valid format if provided)
    body('username')
        .optional({ values: 'falsy' })
        .isString()
        .withMessage('Username must be a string')
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters long')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username must contain only letters, numbers, and underscores'),

    // password validation (required)
    body('password')
        .notEmpty()
        .withMessage('Password is required'),

    // custom: require at least one of email or username
    (req, res, next) => {
        const { email, username } = req.body;
        if (!email && !username) {
            return res.status(400).json({
                errors: [{ msg: 'Either email or username is required' }]
            });
        }
        next();
    },

    responseWithvalidationError
]

const addAddressValidations = [
    // Normalize field aliases if provided
    (req, res, next) => {
        if (req.body) {
            if (req.body.zipCode && !req.body.pincode) {
                req.body.pincode = req.body.zipCode;
            }
            if (req.body.pincode && !req.body.zipCode) {
                req.body.zipCode = req.body.pincode;
            }
            if (req.body.phoneNumber && !req.body.phone) {
                req.body.phone = req.body.phoneNumber;
            }
        }
        next();
    },

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

    // phone validation: required and valid 10-digit number (supports optional country code like +91)
    body("phone")
        .notEmpty()
        .withMessage("Phone number is required")
        .isString()
        .withMessage("Phone number must be a string")
        .trim()
        .matches(/^(\+91[\-\s]?)?[0-9]{10}$/)
        .withMessage("Phone number must be a valid 10-digit number"),

    // country validation (optional)
    body("country")
        .optional({ values: 'falsy' })
        .isString()
        .withMessage("Country must be a string")
        .trim(),

    // isDefault validation (optional)
    body("isDefault")
        .optional()
        .isBoolean()
        .withMessage("isDefault must be a boolean"),

    responseWithvalidationError
];

module.exports = {
    registerUserValidations,
    loginUserValidations,
    addAddressValidations
};
