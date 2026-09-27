const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    items: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                require: true
            },
            quantity: {
                type: Number,
                require: true,
                min: 1
            }
        }
    ]

}, { timestamps: true });

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;
