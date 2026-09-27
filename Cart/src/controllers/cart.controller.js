const cartModel = require("../model/cart.model");

async function addItemToCart(req, res) {
    try {
        const { productId, qty } = req.body;
        const userId = req.user.id || req.user._id;

        let cart = await cartModel.findOne({ userId });

        if (!cart) {
            cart = await cartModel.create({ userId, items: [] });
        }

        const existingItemIndex = cart.items.findIndex((item) =>
            item.productId.toString() === productId.toString()
        );

        if (existingItemIndex >= 0) {
            cart.items[existingItemIndex].quantity += Number(qty);
        } else {
            cart.items.push({ productId, quantity: Number(qty) });
        }

        await cart.save();
        res.status(200).json({
            success: true,
            message: "Item added to cart",
            cart
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

async function updateCartItem(req, res) {
    try {
        const productId = req.params.productId || req.params.products;
        const { qty } = req.body;
        const userId = req.user.id || req.user._id;

        let cart = await cartModel.findOne({ userId });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found"
            });
        }

        const existingItemIndex = cart.items.findIndex((item) =>
            item.productId.toString() === productId.toString()
        );

        if (existingItemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Item not found in cart"
            });
        }

        const newQty = Number(qty);
        if (newQty <= 0) {
            cart.items.splice(existingItemIndex, 1);
        } else {
            cart.items[existingItemIndex].quantity = newQty;
        }

        await cart.save();
        res.status(200).json({
            success: true,
            message: newQty <= 0 ? "Item removed from cart" : "Item quantity updated",
            cart
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

async function getCart(req, res) {
    try {
        const userId = req.user.id || req.user._id;

        let cart = await cartModel.findOne({ userId });

        if (!cart) {
            cart = await cartModel.create({ userId, items: [] });
        }

        res.status(200).json({
            success: true,
            cart,
            totals: {
                itemCount: cart.items.length,
                totalQuantity: cart.items.reduce((sum, item) => sum + (item.quantity || item.qty || 0), 0)
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

async function removeItemFromCart(req, res) {
    try {
        const productId = req.params.productId || req.params.products;
        const userId = req.user.id || req.user._id;

        let cart = await cartModel.findOne({ userId });

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found"
            });
        }

        const existingItemIndex = cart.items.findIndex((item) =>
            item.productId.toString() === productId.toString()
        );

        if (existingItemIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Item not found in cart"
            });
        }

        cart.items.splice(existingItemIndex, 1);
        await cart.save();

        res.status(200).json({
            success: true,
            message: "Item removed from cart",
            cart
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

async function clearCart(req, res) {
    try {
        const userId = req.user.id || req.user._id;

        let cart = await cartModel.findOne({ userId });

        if (!cart) {
            cart = await cartModel.create({ userId, items: [] });
        } else {
            cart.items = [];
            await cart.save();
        }

        res.status(200).json({
            success: true,
            message: "Cart cleared successfully",
            cart
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}

module.exports = {
    addItemToCart,
    updateCartItem,
    getCart,
    removeItemFromCart,
    deleteCartItem: removeItemFromCart,
    clearCart
};