const { body, validationResult } = require("express-validator");

const responseWithValidationError = (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation failed",
                errors: errors.array()
            });
        }
        next();
    } catch (error) {
        console.error("Validation middleware error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

const createProductValidations = [
    // Normalize aliases so both priceAmount and price object are accepted
    (req, res, next) => {
        if (req.body) {
            if (req.body.price && typeof req.body.price === "object") {
                if (req.body.price.amount !== undefined && !req.body.priceAmount) {
                    req.body.priceAmount = req.body.price.amount;
                }
                if (req.body.price.currency !== undefined && !req.body.priceCurrency) {
                    req.body.priceCurrency = req.body.price.currency;
                }
            }
            if (req.body["price[amount]"] !== undefined && !req.body.priceAmount) {
                req.body.priceAmount = req.body["price[amount]"];
            }
            if (req.body["price[currency]"] !== undefined && !req.body.priceCurrency) {
                req.body.priceCurrency = req.body["price[currency]"];
            }
        }
        next();
    },

    // Title validation: trimmed first so whitespace-only fails notEmpty
    body("title")
        .trim()
        .notEmpty()
        .withMessage("Product title is required")
        .isString()
        .withMessage("Product title must be a string"),

    // Description validation (optional)
    body("description")
        .optional()
        .isString()
        .withMessage("Description must be a string")
        .trim(),

    // Price amount validation
    body("priceAmount")
        .notEmpty()
        .withMessage("Price amount is required")
        .isFloat({ gt: 0 })
        .withMessage("Price amount must be a number greater than 0"),

    // Currency validation (optional, default INR)
    body("priceCurrency")
        .optional()
        .isString()
        .withMessage("Currency must be a string")
        .toUpperCase()
        .isIn(["INR", "USD"])
        .withMessage("Currency must be one of INR or USD"),

    responseWithValidationError
];

module.exports = {
    createProductValidations,
    responseWithValidationError
};
