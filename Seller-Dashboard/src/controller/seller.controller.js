const mongoose = require('mongoose');
const userModel = require('../models/user.model');
const productModel = require('../models/product.model');
const orderModel = require('../models/order.model');
const paymentModel = require('../models/payment.model');

async function getMetrics(req, res) {
    try {
        const sellerId = req.user?.id || req.user?._id;
        if (!sellerId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Seller ID not found in token"
            });
        }

        let sellerObjectId;
        try {
            sellerObjectId = new mongoose.Types.ObjectId(sellerId);
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: "Invalid seller ID format"
            });
        }

        // 1. Fetch all products belonging to this seller
        const sellerProducts = await productModel.find({ seller: sellerObjectId }).select('_id');
        const totalProducts = sellerProducts.length;

        // If seller has no products, return zeroed metrics immediately
        if (totalProducts === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    totalProducts: 0,
                    sales: {
                        totalOrders: 0,
                        totalUnitsSold: 0
                    },
                    revenue: {
                        total: 0,
                        currency: "INR"
                    },
                    topProducts: []
                }
            });
        }

        const productIds = sellerProducts.map((p) => p._id);
        const topLimit = Math.max(1, parseInt(req.query.limit, 10) || 5);

        // 2. Aggregate sales, revenue, and top products from order items
        const [aggregatedData] = await orderModel.aggregate([
            { $unwind: "$items" },
            {
                $match: {
                    "items.productId": { $in: productIds },
                    status: { $ne: "CANCELLED" }
                }
            },
            {
                $facet: {
                    summary: [
                        {
                            $group: {
                                _id: null,
                                totalUnitsSold: { $sum: "$items.quantity" },
                                totalRevenue: {
                                    $sum: {
                                        $multiply: [
                                            "$items.quantity",
                                            { $ifNull: ["$items.price.amount", 0] }
                                        ]
                                    }
                                },
                                distinctOrders: { $addToSet: "$_id" }
                            }
                        },
                        {
                            $project: {
                                _id: 0,
                                totalUnitsSold: 1,
                                totalRevenue: 1,
                                totalOrders: { $size: "$distinctOrders" }
                            }
                        }
                    ],
                    topProducts: [
                        {
                            $group: {
                                _id: "$items.productId",
                                unitsSold: { $sum: "$items.quantity" },
                                revenue: {
                                    $sum: {
                                        $multiply: [
                                            "$items.quantity",
                                            { $ifNull: ["$items.price.amount", 0] }
                                        ]
                                    }
                                }
                            }
                        },
                        { $sort: { unitsSold: -1, revenue: -1 } },
                        { $limit: topLimit },
                        {
                            $lookup: {
                                from: "products",
                                localField: "_id",
                                foreignField: "_id",
                                as: "productDetails"
                            }
                        },
                        { $unwind: "$productDetails" },
                        {
                            $project: {
                                _id: 0,
                                productId: "$_id",
                                title: "$productDetails.title",
                                images: "$productDetails.images",
                                price: "$productDetails.price",
                                stock: "$productDetails.stock",
                                unitsSold: 1,
                                revenue: 1
                            }
                        }
                    ]
                }
            }
        ]);

        const summary = aggregatedData?.summary?.[0] || {
            totalUnitsSold: 0,
            totalRevenue: 0,
            totalOrders: 0
        };

        const topProducts = aggregatedData?.topProducts || [];

        return res.status(200).json({
            success: true,
            data: {
                totalProducts,
                sales: {
                    totalOrders: summary.totalOrders,
                    totalUnitsSold: summary.totalUnitsSold
                },
                revenue: {
                    total: summary.totalRevenue,
                    currency: "INR"
                },
                topProducts
            }
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching seller metrics",
            error: error.message
        });
    }
}

async function getOrders(req, res) {
    try {
        const sellerId = req.user?.id || req.user?._id;
        if (!sellerId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Seller ID not found in token"
            });
        }

        // Get all products for this seller
        const products = await productModel.find({ seller: sellerId }).select('_id');
        const productIds = products.map((p) => p._id.toString());
        const productIdSet = new Set(productIds);

        // Get all orders containing seller's products
        const orders = await orderModel.find({
            "items.productId": { $in: products.map((p) => p._id) }
        }).populate("items.productId", "title price images stock").lean();

        // Filter order items to only include those from this seller 
        const filteredOrders = orders.map(order => {
            const filteredItems = order.items.filter(item => {
                const itemProdId = (item.productId?._id || item.productId)?.toString();
                return productIdSet.has(itemProdId);
            });

            return {
                ...order,
                items: filteredItems
            };
        }).filter(order => order.items.length > 0);

        return res.status(200).json(filteredOrders);

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching seller orders",
            error: error.message
        });
    }
}

async function getProducts(req, res) {
    try {
        const sellerId = req.user?.id || req.user?._id;
        if (!sellerId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Seller ID not found in token"
            });
        }

        // Get all products for this seller
        const products = await productModel.find({ seller: sellerId });

        return res.status(200).json(products);

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching seller products",
            error: error.message
        });
    }
}

module.exports = {
    getMetrics,
    getOrders,
    getProducts
};
