const express = require("express");
const { createAuthMiddleware } = require("../middlewares/auth.middleware");
const cartController = require("../controllers/cart.controller");
const validation = require("../middlewares/validator.middleware");
const router = express.Router();

// Protected routes
router.get('/',
    createAuthMiddleware(["user"]),
    cartController.getCart
);

router.delete('/',
    createAuthMiddleware(["user"]),
    cartController.clearCart
);

router.post("/items",
    createAuthMiddleware(["user"]),
    validation.validateAddItemsToCart,
    cartController.addItemToCart
);

router.patch("/items/:productId",
    createAuthMiddleware(["user"]),
    validation.validateUpdateCartItem,
    cartController.updateCartItem
);

router.delete("/items/:productId",
    createAuthMiddleware(["user"]),
    validation.validateDeleteCartItem,
    cartController.removeItemFromCart
);

module.exports = router;