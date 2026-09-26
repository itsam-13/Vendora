const Product = require("../models/product.model");
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

const productController = {
    createProduct
};

module.exports = {
    createProduct,
    productController
};
