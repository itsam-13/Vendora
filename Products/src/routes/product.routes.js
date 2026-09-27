const express = require("express");
const productController = require("../controllers/product.controller");
const { createAuthMiddleware } = require("../middlewares/auth.middleware");
const { createProductValidations } = require("../middlewares/validator.middleware");
const upload = require("../middlewares/multer.middleware");

const router = express.Router();

// Middleware to handle Multer upload and file filter errors cleanly
const handleUpload = (req, res, next) => {
    upload.array("images", 5)(req, res, (err) => {
        if (err) {
            return res.status(400).json({
                success: false,
                message: err.message || "File upload error"
            });
        }
        next();
    });
};

/* POST -> /api/products/ */
router.post(
    "/",
    createAuthMiddleware(["admin", "seller"]),
    handleUpload,
    createProductValidations,
    productController.createProduct
);

//GET -> /api/products
router.get("/", productController.getProducts);

//GET -> /api/products/:id
router.get("/:id", productController.getProductById);

//PATCH -> /api/products/:id
router.patch(
    "/:id",
    createAuthMiddleware(["seller"]),
    handleUpload,
    productController.updateProduct
);


module.exports = router;