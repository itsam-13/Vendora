const orderModel = require("../models/order.model")
const axios = require("axios");
const { publishToQueue } = require('../broker/broker')

function isOrderOwner(order, user) {
    const orderUserId = order.user?._id || order.user;
    const userId = user?.id || user?._id;
    return orderUserId != null && userId != null && String(orderUserId) === String(userId);
}

async function createOrder(req, res) {

    const user = req.user;
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1]
    if (!token) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    try {
        const CART_SERVICE_URL = process.env.CART_SERVICE_URL || "http://localhost:3002";
        const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL || "http://localhost:3001";

        // fetch user cart from cart services
        const cartResponse = await axios.get(`${CART_SERVICE_URL}/api/cart`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const items = cartResponse.data?.cart?.items || cartResponse.data?.items || [];
        if (!items.length) {
            return res.status(400).json({ message: "Cart is empty" });
        }

        let priceAmount = 0;

        const orderItems = items.map((item) => {
            const amount = item.price?.amount ?? (typeof item.price === "number" ? item.price : 0);
            const currency = item.price?.currency || "INR";
            const itemTotal = amount * item.quantity;
            priceAmount += itemTotal;
            return {
                productId: item.productId,
                quantity: item.quantity,
                price: {
                    amount,
                    currency
                }
            };
        });

        // Reserve inventory with downstream Inventory service
        await axios.post(`${INVENTORY_SERVICE_URL}/api/inventory/reserve`, {
            items: orderItems
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const shipping = req.body.shippingAddress || req.body.shippingInfo || {};

        const order = await orderModel.create({
            user: user?.id || user?._id,
            userId: user?.id || user?._id,
            items: orderItems,
            status: "PENDING",
            totalPrice: {
                amount: priceAmount,
                currency: "INR"
            },
            shippingInfo: {
                street: shipping.street,
                city: shipping.city,
                state: shipping.state,
                zip: shipping.pincode || shipping.zip || shipping.zipCode,
                country: shipping.country || "India"
            }
        });

        await publishToQueue("ORDER_SELLER_DASHBOARD.ORDER_CREATED", order)

        res.status(201).json({
            message: "Order created successfully",
            order
        });

    } catch (error) {
        if (error.response?.status === 409) {
            return res.status(409).json({ message: error.response.data?.error || "Inventory reservation failed" });
        }
        res.status(500).json({ message: "Internal server error", error: error.message });
    }

}

async function getMyOrders(req, res) {

    const user = req.user;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    try {
        const userId = user?.id || user?._id;
        const filter = { user: userId };
        const orders = await orderModel.find(filter).skip(skip).limit(limit);
        const totalOrders = await orderModel.countDocuments(filter);

        res.status(200).json({
            orders,
            meta: {
                total: totalOrders,
                page,
                limit,
            }
        });
    } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message });
    }

}

async function getOrderById(req, res) {

    const user = req.user;
    const orderId = req.params.id;

    try {
        const order = await orderModel.findById(orderId)

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        if (user?.role !== "admin" && !isOrderOwner(order, user)) {
            return res.status(403).json({ message: "Forbidden" });
        }

        return res.status(200).json({ order });

    } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
}

async function cancelOrderById(req, res) {

    const user = req.user;
    const orderId = req.params.id;

    try {
        const order = await orderModel.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        if (!isOrderOwner(order, user)) {
            return res.status(403).json({ message: "Forbidden" });
        }

        order.status = "CANCELLED";
        await order.save();

        res.status(200).json({ message: "Order cancelled successfully" });
    } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
}

async function updateOrderAddressById(req, res) {

    const user = req.user;
    const orderId = req.params.id;

    try {
        const order = await orderModel.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (!isOrderOwner(order, user)) {
            return res.status(403).json({ message: "Forbidden" });
        }

        if (order.status !== "PENDING") {
            return res.status(400).json({ message: "Only pending orders can be updated" });
        }

        order.shippingInfo = {
            street: req.body.street,
            city: req.body.city,
            state: req.body.state,
            zip: req.body.pincode,
            country: req.body.country
        }

        await order.save();
        
        res.status(200).json({ message: "Order address updated successfully", order });


    } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message });
    }

}

module.exports = {
    createOrder,
    getMyOrders,
    getOrderById,
    cancelOrderById,
    updateOrderAddressById
};
