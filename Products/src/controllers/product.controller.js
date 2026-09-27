const mongoose = require("mongoose");
const productModel = require("../models/product.model");
const Product = productModel;
const { uploadToImageKit } = require("../services/imagekit.service");


async function createProduct(req, res) {
    try {
        const { title, description, priceAmount, priceCurrency = "INR" } = req.body;

        if (!title || !priceAmount) {
            return res.status(400).json({
                success: false,
                message: "Product title and priceAmount are required"
            });
        }
        // Seller ID extracted from authenticated user token (or request body fallback)

        const seller = req.user?.id || req.body.seller;
        if (!seller) {
            return res.status(400).json({
                success: false,
                message: "Seller ID is required"
            });
        }

        const price = {
            amount: Number(priceAmount),
            currency: priceCurrency || req.body.price?.currency || "INR"
        };

        // Handle image uploads if files were provided via multer
        const uploadedImages = [];
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
            try {
                const uploadPromises = req.files.map((file) => uploadToImageKit(file));
                const uploadResults = await Promise.all(uploadPromises);
                uploadedImages.push(...uploadResults);

            } catch (uploadError) {
                if (process.env.NODE_ENV !== "test") {
                    console.error("Image upload failed:", uploadError);
                }
                return res.status(500).json({
                    success: false,
                    message: "Failed to upload product images",
                    error: uploadError.message
                });
            }
        }

        const newProduct = await Product.create({
            title: title.trim(),
            description: description ? description.trim() : "",
            price,
            seller,
            images: uploadedImages
        });

        return res.status(201).json({
            success: true,
            message: "Product created successfully",
            product: newProduct
        });
    } catch (error) {
        if (process.env.NODE_ENV !== "test") {
            console.error("Error creating product:", error);
        }
        return res.status(500).json({
            success: false,
            message: "Internal server error while creating product",
            error: error.message
        });
    }
}

async function getProducts(req, res) {
    try {
        const { q, minPrice, maxPrice, skip = 0, limit = 20 } = req.query;

        const filter = {};
        if (q) {
            filter.$text = { $search: q };
        }

        if (minPrice) {
            filter['price.amount'] = { ...filter['price.amount'], $gte: Number(minPrice) };
        }

        if (maxPrice) {
            filter['price.amount'] = { ...filter['price.amount'], $lte: Number(maxPrice) };
        }

        const products = await productModel.find(filter).skip(Number(skip)).limit(Math.min(Number(limit), 20))

        return res.status(200).json({
            success: true,
            message: "Products fetched successfully",
            products
        });
    } catch (error) {
        if (process.env.NODE_ENV !== "test") {
            console.error("Error fetching products:", error);
        }
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching products",
            error: error.message
        });
    }
}

async function getProductById(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Product ID is required"
            });
        }

        const product = await productModel.findById(id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }
        return res.status(200).json({
            success: true,
            message: "Product fetched successfully",
            product: product
        });
    } catch (error) {
        if (process.env.NODE_ENV !== "test") {
            console.error("Error fetching product:", error);
        }
        return res.status(500).json({
            success: false,
            message: "Internal server error while fetching product",
            error: error.message
        });
    }
}

async function updateProduct(req, res) {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID"
            });
        }

        const product = await productModel.findById(id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        if (req.user?.id !== product.seller.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to update this product"
            });
        }

    const allowUpdates = ["title", "description", "price"]
    for (const key of Object.keys()(req.body)) {
        if (allowUpdates.includes(key)) {
            if (key === "price" && typeof req.body.price === 'Object') {
                if (req.body.price.amount !== undefined) {
                    product[key].amount = Number(req.body.price.amount);
                }
                if (req.body.price.currency !== undefined) {
                    product[key].currency = Number(req.body.price.currency)
                }
            }
            else {
                product[key] = req.body[key];
            }
        }
    }

    await product.save()
    return res.status(200).json({
        message: "Product updated successfully",
        product: product
    });
    } catch (error) {
        if (process.env.NODE_ENV !== "test") {
            console.error("Error updating product:", error);
        }
        return res.status(500).json({
            success: false,
            message: "Internal server error while updating product",
            error: error.message
        });
    }
}

module.exports = {
    createProduct,
    getProducts,
    getProductById,
    updateProduct
};
