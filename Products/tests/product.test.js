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
    await Product.init();
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

// ─── Test Suite: GET /api/products ───────────────────────────────────────────

describe("GET /api/products - Get Products API", () => {
    const mockSellerId = new mongoose.Types.ObjectId();

    const sampleProducts = [
        {
            title: "Apple iPhone 15 Pro",
            description: "High performance flagship smartphone with titanium design and A17 chip",
            price: { amount: 120000, currency: "INR" },
            seller: mockSellerId
        },
        {
            title: "Samsung Galaxy S24 Ultra",
            description: "Flagship Android phone with S-Pen stylus and 200MP camera",
            price: { amount: 110000, currency: "INR" },
            seller: mockSellerId
        },
        {
            title: "Sony WH-1000XM5 Wireless Headphones",
            description: "Premium noise cancelling over-ear headphones with long battery life",
            price: { amount: 28000, currency: "INR" },
            seller: mockSellerId
        },
        {
            title: "Logitech MX Master 3S Mouse",
            description: "Ergonomic wireless office mouse with ultrafast scroll wheel",
            price: { amount: 8500, currency: "INR" },
            seller: mockSellerId
        },
        {
            title: "Keychron K2 Mechanical Keyboard",
            description: "Compact wireless mechanical keyboard with RGB backlighting",
            price: { amount: 7500, currency: "INR" },
            seller: mockSellerId
        },
        {
            title: "Budget Wired Gaming Mouse",
            description: "Affordable optical USB gaming mouse for entry-level gamers",
            price: { amount: 899, currency: "INR" },
            seller: mockSellerId
        }
    ];

    describe("Basic Fetching & Public Access", () => {
        it("returns 200 and an empty array when no products exist in database", async () => {
            const response = await request(app).get("/api/products");

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("success", true);
            expect(response.body).toHaveProperty("message", "Products fetched successfully");
            expect(response.body.products).toBeInstanceOf(Array);
            expect(response.body.products).toHaveLength(0);
        });

        it("returns 200 and all products without requiring an authentication token", async () => {
            await Product.insertMany(sampleProducts);

            const response = await request(app).get("/api/products");

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe("Products fetched successfully");
            expect(response.body.products).toHaveLength(sampleProducts.length);
        });

        it("returns products with correct data structure matching schema", async () => {
            await Product.create({
                title: "OnePlus 12",
                description: "Flagship killer phone with Hasselblad camera",
                price: { amount: 64999, currency: "INR" },
                seller: mockSellerId,
                images: [{ url: "https://example.com/phone.jpg", thumbnail: "https://example.com/thumb.jpg", id: "img_1" }]
            });

            const response = await request(app).get("/api/products");

            expect(response.status).toBe(200);
            expect(response.body.products).toHaveLength(1);
            const product = response.body.products[0];
            expect(product).toHaveProperty("_id");
            expect(product.title).toBe("OnePlus 12");
            expect(product.description).toBe("Flagship killer phone with Hasselblad camera");
            expect(product.price).toEqual({ amount: 64999, currency: "INR" });
            expect(product.seller).toBe(mockSellerId.toString());
            expect(product.images).toHaveLength(1);
            expect(product.images[0].url).toBe("https://example.com/phone.jpg");
        });
    });

    describe("Pagination (skip and limit)", () => {
        beforeEach(async () => {
            await Product.insertMany(sampleProducts);
        });

        it("applies default pagination (limit: 20, skip: 0)", async () => {
            const response = await request(app).get("/api/products");

            expect(response.status).toBe(200);
            expect(response.body.products).toHaveLength(sampleProducts.length);
        });

        it("limits the number of returned products using ?limit", async () => {
            const response = await request(app).get("/api/products?limit=2");

            expect(response.status).toBe(200);
            expect(response.body.products).toHaveLength(2);
        });

        it("skips products using ?skip", async () => {
            const allResponse = await request(app).get("/api/products");
            const skippedResponse = await request(app).get("/api/products?skip=2");

            expect(skippedResponse.status).toBe(200);
            expect(skippedResponse.body.products).toHaveLength(sampleProducts.length - 2);
            expect(skippedResponse.body.products[0]._id).toBe(allResponse.body.products[2]._id);
        });

        it("paginates properly with both skip and limit together", async () => {
            const allResponse = await request(app).get("/api/products");
            const pagedResponse = await request(app).get("/api/products?skip=1&limit=2");

            expect(pagedResponse.status).toBe(200);
            expect(pagedResponse.body.products).toHaveLength(2);
            expect(pagedResponse.body.products[0]._id).toBe(allResponse.body.products[1]._id);
            expect(pagedResponse.body.products[1]._id).toBe(allResponse.body.products[2]._id);
        });

        it("returns an empty array when skip exceeds total count of products", async () => {
            const response = await request(app).get("/api/products?skip=100");

            expect(response.status).toBe(200);
            expect(response.body.products).toHaveLength(0);
        });
    });

    describe("Price Range Filtering (minPrice and maxPrice)", () => {
        beforeEach(async () => {
            await Product.insertMany(sampleProducts);
        });

        it("filters products with price greater than or equal to minPrice", async () => {
            const response = await request(app).get("/api/products?minPrice=28000");

            expect(response.status).toBe(200);
            expect(response.body.products).toHaveLength(3); // 120000, 110000, 28000
            response.body.products.forEach((prod) => {
                expect(prod.price.amount).toBeGreaterThanOrEqual(28000);
            });
        });

        it("filters products with price less than or equal to maxPrice", async () => {
            const response = await request(app).get("/api/products?maxPrice=8500");

            expect(response.status).toBe(200);
            expect(response.body.products).toHaveLength(3); // 8500, 7500, 899
            response.body.products.forEach((prod) => {
                expect(prod.price.amount).toBeLessThanOrEqual(8500);
            });
        });

        it("filters products within a price range using both minPrice and maxPrice", async () => {
            const response = await request(app).get("/api/products?minPrice=5000&maxPrice=30000");

            expect(response.status).toBe(200);
            expect(response.body.products).toHaveLength(3); // 28000, 8500, 7500
            response.body.products.forEach((prod) => {
                expect(prod.price.amount).toBeGreaterThanOrEqual(5000);
                expect(prod.price.amount).toBeLessThanOrEqual(30000);
            });
        });

        it("returns an empty array when no products fall within price range", async () => {
            const response = await request(app).get("/api/products?minPrice=500000&maxPrice=1000000");

            expect(response.status).toBe(200);
            expect(response.body.products).toHaveLength(0);
        });
    });

    describe("Text Search (q)", () => {
        beforeEach(async () => {
            await Product.insertMany(sampleProducts);
        });

        it("searches and finds products matching keywords in title", async () => {
            const response = await request(app).get("/api/products?q=iPhone");

            expect(response.status).toBe(200);
            expect(response.body.products.length).toBeGreaterThanOrEqual(1);
            expect(response.body.products.some(p => p.title.includes("iPhone"))).toBe(true);
        });

        it("searches and finds products matching keywords in description", async () => {
            const response = await request(app).get("/api/products?q=cancelling");

            expect(response.status).toBe(200);
            expect(response.body.products.length).toBeGreaterThanOrEqual(1);
            expect(response.body.products.some(p => p.title.includes("Sony"))).toBe(true);
        });

        it("returns multiple matching products for a common query keyword", async () => {
            const response = await request(app).get("/api/products?q=wireless");

            expect(response.status).toBe(200);
            expect(response.body.products.length).toBeGreaterThanOrEqual(2);
        });

        it("returns an empty array when query does not match any product", async () => {
            const response = await request(app).get("/api/products?q=nonexistentproductxyz");

            expect(response.status).toBe(200);
            expect(response.body.products).toHaveLength(0);
        });
    });

    describe("Combined Queries (Search + Price Filter + Pagination)", () => {
        beforeEach(async () => {
            await Product.insertMany(sampleProducts);
        });

        it("combines text search with price filtering", async () => {
            // "wireless" matches Sony (28000), Logitech (8500), Keychron (7500)
            const response = await request(app).get("/api/products?q=wireless&maxPrice=10000");

            expect(response.status).toBe(200);
            expect(response.body.products.length).toBeGreaterThanOrEqual(1);
            response.body.products.forEach((prod) => {
                expect(prod.price.amount).toBeLessThanOrEqual(10000);
            });
            expect(response.body.products.some(p => p.title.includes("Sony"))).toBe(false);
        });

        it("combines search, price range filter, and limit pagination", async () => {
            const response = await request(app).get("/api/products?q=mouse&minPrice=500&maxPrice=10000&limit=1");

            expect(response.status).toBe(200);
            expect(response.body.products).toHaveLength(1);
            expect(response.body.products[0].price.amount).toBeGreaterThanOrEqual(500);
            expect(response.body.products[0].price.amount).toBeLessThanOrEqual(10000);
        });
    });

    describe("Error Handling", () => {
        it("returns 500 when database operation fails", async () => {
            const findSpy = jest.spyOn(Product, "find").mockImplementationOnce(() => {
                throw new Error("Database query failure");
            });

            const response = await request(app).get("/api/products");

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty("success", false);
            expect(response.body).toHaveProperty("message", "Internal server error while fetching products");
            expect(response.body).toHaveProperty("error", "Database query failure");

            findSpy.mockRestore();
        });
    });
});

// ─── Test Suite: GET /api/products/:id ───────────────────────────────────────

describe("GET /api/products/:id - Get Product By ID API", () => {
    const mockSellerId = new mongoose.Types.ObjectId();

    it("returns 200 and product data for a valid existing ID", async () => {
        const product = await Product.create({
            title: "Apple MacBook Pro M3",
            description: "16-inch Space Black laptop with M3 Max chip",
            price: { amount: 249999, currency: "INR" },
            seller: mockSellerId,
            images: [
                {
                    url: "https://example.com/macbook.jpg",
                    thumbnail: "https://example.com/thumb_macbook.jpg",
                    id: "mb_img_01"
                }
            ]
        });

        const response = await request(app).get(`/api/products/${product._id}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("success", true);
        expect(response.body).toHaveProperty("message", "Product fetched successfully");
        expect(response.body.product).toMatchObject({
            _id: product._id.toString(),
            title: "Apple MacBook Pro M3",
            description: "16-inch Space Black laptop with M3 Max chip",
            price: {
                amount: 249999,
                currency: "INR"
            },
            seller: mockSellerId.toString()
        });
        expect(response.body.product.images).toHaveLength(1);
        expect(response.body.product.images[0].url).toBe("https://example.com/macbook.jpg");
    });

    it("is publicly accessible without requiring an authentication token", async () => {
        const product = await Product.create({
            title: "Noise Cancelling Earbuds",
            price: { amount: 4999, currency: "INR" },
            seller: mockSellerId
        });

        const response = await request(app).get(`/api/products/${product._id}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.product._id).toBe(product._id.toString());
    });

    it("returns 404 when product ID is a valid ObjectId but does not exist in database", async () => {
        const nonExistentId = new mongoose.Types.ObjectId();

        const response = await request(app).get(`/api/products/${nonExistentId}`);

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty("success", false);
        expect(response.body).toHaveProperty("message", "Product not found");
    });

    it("returns 500 when product ID is malformed / invalid ObjectId format", async () => {
        const response = await request(app).get("/api/products/invalid-object-id");

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty("success", false);
        expect(response.body).toHaveProperty("message", "Internal server error while fetching product");
        expect(response.body).toHaveProperty("error");
    });

    it("returns 500 when database operation throws an unexpected error", async () => {
        const validId = new mongoose.Types.ObjectId();
        const findByIdSpy = jest.spyOn(Product, "findById").mockRejectedValueOnce(
            new Error("Database connection failure")
        );

        const response = await request(app).get(`/api/products/${validId}`);

        expect(response.status).toBe(500);
        expect(response.body).toHaveProperty("success", false);
        expect(response.body).toHaveProperty("message", "Internal server error while fetching product");
        expect(response.body).toHaveProperty("error", "Database connection failure");

        findByIdSpy.mockRestore();
    });
});

