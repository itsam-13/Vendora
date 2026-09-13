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
        .isAlphanumeric()
        .withMessage("Username must contain only letters and numbers"),

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

    // first name validation
    body("fullname.firstName")
        .notEmpty()
        .withMessage("First name is required")
        .isString()
        .withMessage("First name must be a string")
        .isLength({ min: 2, max: 50 })
        .withMessage("First name must be between 2 and 50 characters long"),

    // last name validation
    body("fullname.lastName")
        .notEmpty()
        .withMessage("Last name is required")
        .isString()
        .withMessage("Last name must be a string")
        .isLength({ min: 2, max: 50 })
        .withMessage("Last name must be between 2 and 50 characters long"),

    responseWithvalidationError

]

module.exports = {
    registerUserValidations
}