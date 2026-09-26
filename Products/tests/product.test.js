const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const Product = require("../src/models/product.model");
const dbHandler = require("./setupDb");
const imagekitService = require("../src/services/imagekit.service");

// ─── Mock ImageKit Service ───────────────────────────────────────────────────

jest.mock("../src/services/imagekit.service", () => ({
    uploadToImageKit: jest.fn().mockImplementation(async (file) => ({
        url: `https://ik.imagekit.io/vendora/products/${file.originalname}`,
        thumbnail: `https://ik.imagekit.io/vendora/products/tr:n-media_library_thumbnail/${file.originalname}`,
        id: `mock_file_id_${Math.random().toString(36).substring(2, 9)}`
    })),
    getImageKitInstance: jest.fn()
}));

// ─── Database Lifecycle ──────────────────────────────────────────────────────

beforeAll(async () => {
    await dbHandler.connect();
});

afterEach(async () => {
    await dbHandler.clearDatabase();
    jest.clearAllMocks();
});

afterAll(async () => {
    await dbHandler.closeDatabase();
});

// ─── Helper Functions ────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || "default_jwt_secret";

const generateSellerToken = (custom = {}) => {
    const payload = {
        id: new mongoose.Types.ObjectId().toString(),
        username: "topseller",
        email: "seller@vendora.com",
        role: "seller",
        ...custom
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
    return { token, sellerId: payload.id };
};

const generateUserToken = (custom = {}) => {
    const payload = {
        id: new mongoose.Types.ObjectId().toString(),
        username: "regularcustomer",
        email: "customer@vendora.com",
        role: "user",
        ...custom
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
    return { token, userId: payload.id };
};

// ─── Test Suite: POST /api/products/ ─────────────────────────────────────────

describe("POST /api/products/ - Create Product API", () => {

    describe("Authentication and Role Authorization", () => {
        it("returns 401 Unauthorized if no token is provided", async () => {
            const response = await request(app)
                .post("/api/products")
                .send({
                    title: "Test Product",
                    priceAmount: 499
                });

            expect(response.status).toBe(401);
            expect(response.body.message).toMatch(/unauthorized/i);
        });

        it("returns 401 Unauthorized if token is invalid or malformed", async () => {
            const response = await request(app)
                .post("/api/products")
                .set("Authorization", "Bearer invalid.jwt.token")
                .send({
                    title: "Test Product",
                    priceAmount: 499
                });

            expect(response.status).toBe(401);
            expect(response.body.message).toMatch(/invalid or expired token/i);
        });

        it("returns 401 Unauthorized if user role is not allowed (e.g. user instead of seller/admin)", async () => {
            const { token } = generateUserToken();

            const response = await request(app)
                .post("/api/products")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    title: "Test Product",
                    priceAmount: 499
                });

            expect(response.status).toBe(401);
            expect(response.body.message).toMatch(/unauthorized/i);
        });
    });

    describe("Request Validation (express-validator)", () => {
        it("returns 400 Bad Request if title is missing", async () => {
            const { token } = generateSellerToken();

            const response = await request(app)
                .post("/api/products")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    description: "Product description without title",
                    priceAmount: 299
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("success", false);
            expect(response.body).toHaveProperty("errors");
            expect(response.body.errors.some(err => /title is required/i.test(err.msg))).toBe(true);
        });

        it("returns 400 Bad Request if title is only whitespace", async () => {
            const { token } = generateSellerToken();

            const response = await request(app)
                .post("/api/products")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    title: "    ",
                    priceAmount: 299
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("success", false);
            expect(response.body).toHaveProperty("errors");
            expect(response.body.errors.some(err => /title is required/i.test(err.msg))).toBe(true);
        });

        it("returns 400 Bad Request if price is missing", async () => {
            const { token } = generateSellerToken();

            const response = await request(app)
                .post("/api/products")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    title: "Product Without Price"
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("success", false);
            expect(response.body).toHaveProperty("errors");
            expect(response.body.errors.some(err => /price amount is required/i.test(err.msg))).toBe(true);
        });

        it("returns 400 Bad Request if price amount is zero or negative", async () => {
            const { token } = generateSellerToken();

            const response = await request(app)
                .post("/api/products")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    title: "Invalid Price Product",
                    priceAmount: -50
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("success", false);
            expect(response.body).toHaveProperty("errors");
            expect(response.body.errors.some(err => /greater than 0/i.test(err.msg))).toBe(true);
        });
    });

    describe("Product Creation with JSON Payload", () => {
        it("creates a product successfully without images via Authorization header", async () => {
            const { token, sellerId } = generateSellerToken();

            const response = await request(app)
                .post("/api/products")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    title: "Mechanical Keyboard",
                    description: "RGB Mechanical Keyboard with Blue Switches",
                    price: { amount: 2999, currency: "INR" }
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty("success", true);
            expect(response.body).toHaveProperty("message", "Product created successfully");
            expect(response.body.product).toMatchObject({
                title: "Mechanical Keyboard",
                description: "RGB Mechanical Keyboard with Blue Switches",
                price: {
                    amount: 2999,
                    currency: "INR"
                },
                seller: sellerId
            });
            expect(response.body.product.images).toEqual([]);

            // Verify in MongoDB
            const savedProduct = await Product.findById(response.body.product._id);
            expect(savedProduct).not.toBeNull();
            expect(savedProduct.title).toBe("Mechanical Keyboard");
            expect(savedProduct.seller.toString()).toBe(sellerId);
        });

        it("supports cookie-based authentication and default currency (INR)", async () => {
            const { token, sellerId } = generateSellerToken();

            const response = await request(app)
                .post("/api/products")
                .set("Cookie", `token=${token}`)
                .send({
                    title: "Wireless Mouse",
                    price: { amount: 799 }
                });

            expect(response.status).toBe(201);
            expect(response.body.product.price.currency).toBe("INR");
            expect(response.body.product.seller).toBe(sellerId);
        });

        it("supports USD currency when specified", async () => {
            const { token } = generateSellerToken();

            const response = await request(app)
                .post("/api/products")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    title: "Imported Headphones",
                    price: { amount: 99, currency: "USD" }
                });

            expect(response.status).toBe(201);
            expect(response.body.product.price).toEqual({
                amount: 99,
                currency: "USD"
            });
        });
    });

    describe("Product Creation with Multer & ImageKit Image Uploads", () => {
        it("uploads multiple images to ImageKit and stores structured image data", async () => {
            const { token, sellerId } = generateSellerToken();

            // Create fake dummy image buffers
            const dummyBuffer1 = Buffer.from("fake-image-binary-data-1");
            const dummyBuffer2 = Buffer.from("fake-image-binary-data-2");

            const response = await request(app)
                .post("/api/products")
                .set("Authorization", `Bearer ${token}`)
                .field("title", "Smart Watch Pro")
                .field("description", "AMOLED display with fitness tracking")
                .field("price[amount]", "4999")
                .field("price[currency]", "INR")
                .attach("images", dummyBuffer1, "watch_front.jpg")
                .attach("images", dummyBuffer2, "watch_side.png");

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty("success", true);
            expect(response.body.product.title).toBe("Smart Watch Pro");
            expect(response.body.product.seller).toBe(sellerId);
            expect(response.body.product.price.amount).toBe(4999);

            // Verify ImageKit was called for each attached file
            expect(imagekitService.uploadToImageKit).toHaveBeenCalledTimes(2);

            // Verify stored image schema { url, thumbnail, id }
            expect(response.body.product.images).toHaveLength(2);
            expect(response.body.product.images[0]).toHaveProperty("url");
            expect(response.body.product.images[0]).toHaveProperty("thumbnail");
            expect(response.body.product.images[0]).toHaveProperty("id");
            expect(response.body.product.images[0].url).toContain("watch_front.jpg");
            expect(response.body.product.images[1].url).toContain("watch_side.png");

            // Verify MongoDB document
            const dbProduct = await Product.findById(response.body.product._id);
            expect(dbProduct.images).toHaveLength(2);
            expect(dbProduct.images[0].url).toContain("watch_front.jpg");
        });

        it("returns 400 Bad Request if uploaded file is not an image", async () => {
            const { token } = generateSellerToken();
            const textFileBuffer = Buffer.from("Just a plain text file");

            const response = await request(app)
                .post("/api/products")
                .set("Authorization", `Bearer ${token}`)
                .field("title", "Invalid File Product")
                .field("price[amount]", "999")
                .attach("images", textFileBuffer, "document.txt");

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty("success", false);
            expect(response.body.message).toMatch(/only image files are allowed/i);
        });

        it("returns 500 if ImageKit upload encounters an error", async () => {
            const { token } = generateSellerToken();
            const dummyBuffer = Buffer.from("fake-image-data");

            // Mock an upload failure
            imagekitService.uploadToImageKit.mockRejectedValueOnce(new Error("ImageKit service connection timeout"));

            const response = await request(app)
                .post("/api/products")
                .set("Authorization", `Bearer ${token}`)
                .field("title", "Camera Lens")
                .field("price[amount]", "15000")
                .attach("images", dummyBuffer, "lens.jpg");

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty("success", false);
            expect(response.body.message).toMatch(/failed to upload product images/i);
            expect(response.body.error).toMatch(/ImageKit service connection timeout/i);

            // Verify no product was persisted to DB
            const count = await Product.countDocuments();
            expect(count).toBe(0);
        });
    });

});
