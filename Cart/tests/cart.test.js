require("dotenv").config({ quiet: true });
const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const app = require("../src/app");
const dbHandler = require("./setupDb");

const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || "default_jwt_secret";

function generateAuthToken(userId = new mongoose.Types.ObjectId().toString(), role = "user") {
    const token = jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: "1h" });
    return { token, userId };
}

beforeAll(async () => {
    await dbHandler.connect();
});

afterEach(async () => {
    await dbHandler.clearDatabase();
});

afterAll(async () => {
    await dbHandler.closeDatabase();
});

// ─── 1. GET /api/cart ───────────────────────────────────────────────────────
describe("GET /api/cart", () => {
    let user;

    beforeEach(() => {
        user = generateAuthToken();
    });

    it("returns empty cart with totals when user has no cart", async () => {
        const response = await request(app)
            .get("/api/cart")
            .set("Cookie", [`token=${user.token}`]);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("cart");
        expect(response.body.cart.items).toHaveLength(0);
        expect(response.body).toHaveProperty("totals");
        expect(response.body.totals.itemCount).toBe(0);
        expect(response.body.totals.totalQuantity).toBe(0);
    });

    it("returns existing cart with items and correct totals", async () => {
        const sampleProductId1 = new mongoose.Types.ObjectId().toString();
        const sampleProductId2 = new mongoose.Types.ObjectId().toString();

        // Seed cart with 2 items
        await request(app)
            .post("/api/cart/items")
            .set("Cookie", [`token=${user.token}`])
            .send({ productId: sampleProductId1, qty: 3 });

        await request(app)
            .post("/api/cart/items")
            .set("Cookie", [`token=${user.token}`])
            .send({ productId: sampleProductId2, qty: 2 });

        const response = await request(app)
            .get("/api/cart")
            .set("Cookie", [`token=${user.token}`]);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("cart");
        expect(response.body.cart.items).toHaveLength(2);
        expect(response.body).toHaveProperty("totals");
        expect(response.body.totals.itemCount).toBe(2);
        expect(response.body.totals.totalQuantity).toBe(5);
    });

    it("401 when no token provided", async () => {
        const response = await request(app).get("/api/cart");

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty("success", false);
    });

    it("403 when role not allowed", async () => {
        const sellerUser = generateAuthToken(new mongoose.Types.ObjectId().toString(), "seller");

        const response = await request(app)
            .get("/api/cart")
            .set("Cookie", [`token=${sellerUser.token}`]);

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty("success", false);
    });

    it("401 when token invalid", async () => {
        const response = await request(app)
            .get("/api/cart")
            .set("Cookie", ["token=invalid_malformed_token"]);

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty("success", false);
    });
});

// ─── 2. POST /api/cart/items ────────────────────────────────────────────────
describe("POST /api/cart/items", () => {
    let user;
    const sampleProductId = new mongoose.Types.ObjectId().toString();

    beforeEach(() => {
        user = generateAuthToken();
    });

    it("creates new cart and adds first item", async () => {
        const response = await request(app)
            .post("/api/cart/items")
            .set("Cookie", [`token=${user.token}`])
            .send({
                productId: sampleProductId,
                qty: 2
            });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("success", true);
        expect(response.body).toHaveProperty("cart");
        expect(response.body.cart.items).toHaveLength(1);
        expect(response.body.cart.items[0].productId.toString()).toBe(sampleProductId);
        expect(response.body.cart.items[0].quantity).toBe(2);
    });

    it("increments quantity when item already exists", async () => {
        await request(app)
            .post("/api/cart/items")
            .set("Cookie", [`token=${user.token}`])
            .send({
                productId: sampleProductId,
                qty: 2
            });

        const response = await request(app)
            .post("/api/cart/items")
            .set("Cookie", [`token=${user.token}`])
            .send({
                productId: sampleProductId,
                qty: 3
            });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("success", true);
        expect(response.body.cart.items).toHaveLength(1);
        expect(response.body.cart.items[0].productId.toString()).toBe(sampleProductId);
        expect(response.body.cart.items[0].quantity).toBe(5);
    });

    it("validation error for invalid productId", async () => {
        const response = await request(app)
            .post("/api/cart/items")
            .set("Cookie", [`token=${user.token}`])
            .send({
                productId: "invalid_product_id",
                qty: 2
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("errors");
    });

    it("validation error for non-positive qty", async () => {
        const response = await request(app)
            .post("/api/cart/items")
            .set("Cookie", [`token=${user.token}`])
            .send({
                productId: sampleProductId,
                qty: 0
            });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("errors");
    });

    it("401 when no token provided", async () => {
        const response = await request(app)
            .post("/api/cart/items")
            .send({
                productId: sampleProductId,
                qty: 2
            });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty("success", false);
    });

    it("403 when role not allowed", async () => {
        const sellerUser = generateAuthToken(new mongoose.Types.ObjectId().toString(), "seller");

        const response = await request(app)
            .post("/api/cart/items")
            .set("Cookie", [`token=${sellerUser.token}`])
            .send({
                productId: sampleProductId,
                qty: 2
            });

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty("success", false);
    });

    it("401 when token invalid", async () => {
        const response = await request(app)
            .post("/api/cart/items")
            .set("Cookie", ["token=invalid_malformed_token"])
            .send({
                productId: sampleProductId,
                qty: 2
            });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty("success", false);
    });
});

// ─── 3. PATCH /api/cart/items/:productId ────────────────────────────────────
describe("PATCH /api/cart/items/:productId", () => {
    let user;
    const sampleProductId = new mongoose.Types.ObjectId().toString();

    beforeEach(async () => {
        user = generateAuthToken();
        // Seed cart with initial item
        await request(app)
            .post("/api/cart/items")
            .set("Cookie", [`token=${user.token}`])
            .send({
                productId: sampleProductId,
                qty: 2
            });
    });

    it("updates quantity when item already exists", async () => {
        const response = await request(app)
            .patch(`/api/cart/items/${sampleProductId}`)
            .set("Cookie", [`token=${user.token}`])
            .send({ qty: 5 });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("success", true);
        expect(response.body).toHaveProperty("cart");
        expect(response.body.cart.items).toHaveLength(1);
        expect(response.body.cart.items[0].productId.toString()).toBe(sampleProductId);
        expect(response.body.cart.items[0].quantity).toBe(5);
    });

    it("removes item when qty is 0 or less", async () => {
        const response = await request(app)
            .patch(`/api/cart/items/${sampleProductId}`)
            .set("Cookie", [`token=${user.token}`])
            .send({ qty: 0 });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("success", true);
        expect(response.body.cart.items).toHaveLength(0);
    });

    it("validation error for invalid productId", async () => {
        const response = await request(app)
            .patch("/api/cart/items/invalid_product_id")
            .set("Cookie", [`token=${user.token}`])
            .send({ qty: 3 });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("errors");
    });

    it("validation error for invalid qty", async () => {
        const response = await request(app)
            .patch(`/api/cart/items/${sampleProductId}`)
            .set("Cookie", [`token=${user.token}`])
            .send({ qty: "not_a_number" });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("errors");
    });

    it("401 when no token provided", async () => {
        const response = await request(app)
            .patch(`/api/cart/items/${sampleProductId}`)
            .send({ qty: 3 });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty("success", false);
    });

    it("403 when role not allowed", async () => {
        const sellerUser = generateAuthToken(new mongoose.Types.ObjectId().toString(), "seller");

        const response = await request(app)
            .patch(`/api/cart/items/${sampleProductId}`)
            .set("Cookie", [`token=${sellerUser.token}`])
            .send({ qty: 3 });

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty("success", false);
    });

    it("401 when token invalid", async () => {
        const response = await request(app)
            .patch(`/api/cart/items/${sampleProductId}`)
            .set("Cookie", ["token=invalid_malformed_token"])
            .send({ qty: 3 });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty("success", false);
    });
});

// ─── 4. DELETE /api/cart/items/:productId ───────────────────────────────────
describe("DELETE /api/cart/items/:productId", () => {
    let user;
    const sampleProductId = new mongoose.Types.ObjectId().toString();

    beforeEach(async () => {
        user = generateAuthToken();
        // Seed cart with initial item
        await request(app)
            .post("/api/cart/items")
            .set("Cookie", [`token=${user.token}`])
            .send({
                productId: sampleProductId,
                qty: 2
            });
    });

    it("removes the specified item line from the cart", async () => {
        const response = await request(app)
            .delete(`/api/cart/items/${sampleProductId}`)
            .set("Cookie", [`token=${user.token}`]);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("success", true);
        expect(response.body).toHaveProperty("cart");
        expect(response.body.cart.items).toHaveLength(0);
    });

    it("validation error for invalid productId", async () => {
        const response = await request(app)
            .delete("/api/cart/items/invalid_product_id")
            .set("Cookie", [`token=${user.token}`]);

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty("errors");
    });

    it("401 when no token provided", async () => {
        const response = await request(app)
            .delete(`/api/cart/items/${sampleProductId}`);

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty("success", false);
    });

    it("403 when role not allowed", async () => {
        const sellerUser = generateAuthToken(new mongoose.Types.ObjectId().toString(), "seller");

        const response = await request(app)
            .delete(`/api/cart/items/${sampleProductId}`)
            .set("Cookie", [`token=${sellerUser.token}`]);

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty("success", false);
    });

    it("401 when token invalid", async () => {
        const response = await request(app)
            .delete(`/api/cart/items/${sampleProductId}`)
            .set("Cookie", ["token=invalid_malformed_token"]);

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty("success", false);
    });
});

// ─── 5. DELETE /api/cart ────────────────────────────────────────────────────
describe("DELETE /api/cart", () => {
    let user;

    beforeEach(() => {
        user = generateAuthToken();
    });

    it("clears all items from the current user's cart", async () => {
        const sampleProductId = new mongoose.Types.ObjectId().toString();

        // Seed cart with item
        await request(app)
            .post("/api/cart/items")
            .set("Cookie", [`token=${user.token}`])
            .send({
                productId: sampleProductId,
                qty: 3
            });

        const response = await request(app)
            .delete("/api/cart")
            .set("Cookie", [`token=${user.token}`]);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("success", true);
        expect(response.body).toHaveProperty("cart");
        expect(response.body.cart.items).toHaveLength(0);
    });

    it("clears already empty cart without error", async () => {
        const response = await request(app)
            .delete("/api/cart")
            .set("Cookie", [`token=${user.token}`]);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("success", true);
        expect(response.body).toHaveProperty("cart");
        expect(response.body.cart.items).toHaveLength(0);
    });

    it("401 when no token provided", async () => {
        const response = await request(app).delete("/api/cart");

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty("success", false);
    });

    it("403 when role not allowed", async () => {
        const sellerUser = generateAuthToken(new mongoose.Types.ObjectId().toString(), "seller");

        const response = await request(app)
            .delete("/api/cart")
            .set("Cookie", [`token=${sellerUser.token}`]);

        expect(response.status).toBe(403);
        expect(response.body).toHaveProperty("success", false);
    });

    it("401 when token invalid", async () => {
        const response = await request(app)
            .delete("/api/cart")
            .set("Cookie", ["token=invalid_malformed_token"]);

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty("success", false);
    });
});
