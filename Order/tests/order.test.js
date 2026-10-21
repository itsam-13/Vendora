const request = require("supertest");
const mongoose = require("mongoose");

// Downstream microservices Mock Server (Cart & Inventory)
const mockServer = require("./setupDB");

// Database model mock
const orderModel = require("../src/models/order.model");
jest.mock("../src/models/order.model");

// Express test application
const app = require("../src/app");
const { getAuthCookie } = require("../src/middleware/auth");

describe("POST /api/orders – Create order from current cart", () => {
  const mockUserId = new mongoose.Types.ObjectId().toString();
  let authCookie;

  const mockShippingAddress = {
    street: "123 High Street",
    city: "Bangalore",
    state: "Karnataka",
    zipCode: "560001",
    pincode: "560001",
    phone: "+919876543210",
    country: "India",
  };

  const mockCartItems = [
    {
      productId: new mongoose.Types.ObjectId().toString(),
      name: "Wireless Headphones",
      quantity: 2,
      price: {
        amount: 1500,
        currency: "INR",
      },
    },
    {
      productId: new mongoose.Types.ObjectId().toString(),
      name: "USB-C Fast Charger",
      quantity: 1,
      price: {
        amount: 800,
        currency: "INR",
      },
    },
  ];

  beforeAll(async () => {
    // Start mock server to intercept Cart and Inventory HTTP requests
    await mockServer.start();
    // Generate valid auth cookie using getAuthCookie helper
    authCookie = getAuthCookie({ userId: mockUserId, extra: { role: "user" } });
  });

  afterAll(async () => {
    // Gracefully shut down mock server
    await mockServer.stop();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockServer.reset();

    // Default mock server state
    mockServer.setCart({
      userId: mockUserId,
      items: mockCartItems,
    });
    mockServer.setInventoryResponse({
      success: true,
      reservationId: "res_mock_123",
    });

    // Mock orderModel constructor & save behavior
    orderModel.mockImplementation((orderData) => ({
      ...orderData,
      _id: new mongoose.Types.ObjectId().toString(),
      createdAt: new Date(),
      save: jest.fn().mockResolvedValue({
        _id: new mongoose.Types.ObjectId().toString(),
        ...orderData,
        createdAt: new Date(),
      }),
    }));

    // Mock orderModel.create behavior
    orderModel.create = jest.fn().mockImplementation(async (orderData) => ({
      _id: new mongoose.Types.ObjectId().toString(),
      ...orderData,
      createdAt: new Date(),
    }));
  });

  it("creates order from current cart, computes totals, sets status=PENDING, reserves inventory", async () => {
    const res = await request(app)
      .post("/api/orders")
      .set("Cookie", authCookie)
      .send({
        shippingAddress: mockShippingAddress,
        shippingInfo: mockShippingAddress,
      });

    expect(res.status).toBe(201);
    const order = res.body.order || res.body;
    expect(order).toBeDefined();

    // Verifies items copied from current cart
    expect(order.items).toBeDefined();
    expect(order.items.length).toBe(mockCartItems.length);

    // Verifies status is set to PENDING
    expect(order.status).toBe("PENDING");

    // Verifies computes totals
    expect(order.totalPrice).toBeDefined();
    const totalAmount =
      typeof order.totalPrice === "object"
        ? order.totalPrice.amount
        : order.totalPrice;
    expect(totalAmount).toBeGreaterThan(0);

    // Verifies reserves inventory
    expect(mockServer.history.reserveInventory.length).toBeGreaterThanOrEqual(1);
  });

  it("returns 422 when shipping address is missing/invalid", async () => {
    const res = await request(app)
      .post("/api/orders")
      .set("Cookie", authCookie)
      .send({});

    expect(res.status).toBe(422);
  });

  it("returns 400 when the cart is empty", async () => {
    mockServer.setCart({ items: [] });

    const res = await request(app)
      .post("/api/orders")
      .set("Cookie", authCookie)
      .send({ shippingAddress: mockShippingAddress });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Cart is empty");
  });

  it("returns 409 when inventory reservation fails", async () => {
    mockServer.setInventoryError(409, { error: "Insufficient inventory" });

    const res = await request(app)
      .post("/api/orders")
      .set("Cookie", authCookie)
      .send({ shippingAddress: mockShippingAddress });

    expect(res.status).toBe(409);
  });
});

describe("Order API endpoints", () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const orderId = new mongoose.Types.ObjectId().toString();
  const authCookie = getAuthCookie({ userId, extra: { role: "user" } });

  beforeEach(() => {
    jest.clearAllMocks();
    orderModel.findById = jest.fn().mockResolvedValue(null);
    orderModel.countDocuments = jest.fn().mockResolvedValue(0);
  });

  it("returns the authenticated customer's paginated orders", async () => {
    const orders = [{ _id: orderId, user: userId }];
    const limitQuery = { limit: jest.fn().mockResolvedValue(orders) };
    const findQuery = { skip: jest.fn().mockReturnValue(limitQuery) };
    orderModel.find = jest.fn().mockReturnValue(findQuery);
    orderModel.countDocuments.mockResolvedValue(6);

    const res = await request(app)
      .get("/api/orders/me?page=2&limit=5")
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body.orders).toEqual(orders);
    expect(res.body.meta).toEqual({ total: 6, page: 2, limit: 5 });
    expect(findQuery.skip).toHaveBeenCalledWith(5);
    expect(limitQuery.limit).toHaveBeenCalledWith(5);
  });

  it("returns an order owned by the authenticated customer", async () => {
    const order = { _id: orderId, user: userId };
    orderModel.findById.mockResolvedValue(order);

    const res = await request(app)
      .get(`/api/orders/${orderId}`)
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(res.body.order).toEqual(order);
  });

  it("cancels an order owned by the authenticated customer", async () => {
    const order = { _id: orderId, user: userId, status: "PENDING", save: jest.fn() };
    orderModel.findById.mockResolvedValue(order);

    const res = await request(app)
      .post(`/api/orders/${orderId}/cancel`)
      .set("Cookie", authCookie);

    expect(res.status).toBe(200);
    expect(order.status).toBe("CANCELLED");
    expect(order.save).toHaveBeenCalled();
  });

  it("updates the shipping address on a pending order", async () => {
    const order = {
      _id: orderId,
      user: userId,
      status: "PENDING",
      shippingInfo: {},
      save: jest.fn(),
    };
    orderModel.findById.mockResolvedValue(order);

    const shippingAddress = {
      street: "456 New Street",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560002",
      country: "India",
    };
    const res = await request(app)
      .patch(`/api/orders/${orderId}/address`)
      .set("Cookie", authCookie)
      .send(shippingAddress);

    expect(res.status).toBe(200);
    expect(res.body.order.shippingInfo).toEqual({
      street: shippingAddress.street,
      city: shippingAddress.city,
      state: shippingAddress.state,
      zip: shippingAddress.pincode,
      country: shippingAddress.country,
    });
    expect(order.save).toHaveBeenCalled();
  });

  it("returns 404 when the requested order does not exist", async () => {
    const res = await request(app)
      .get(`/api/orders/${new mongoose.Types.ObjectId()}`)
      .set("Cookie", authCookie);

    expect(res.status).toBe(404);
  });

  it("returns 401 when getting an order without authentication", async () => {
    const res = await request(app).get(`/api/orders/${orderId}`);

    expect(res.status).toBe(401);
  });

  it("returns 401 when getting the customer's orders without authentication", async () => {
    const res = await request(app).get("/api/orders/me");

    expect(res.status).toBe(401);
  });

  it("returns 401 when cancelling an order without authentication", async () => {
    const res = await request(app).post(`/api/orders/${orderId}/cancel`);

    expect(res.status).toBe(401);
  });

  it("returns 401 when updating an address without authentication", async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/address`)
      .send({
        street: "456 New Street",
        city: "Bangalore",
        state: "Karnataka",
        zip: "560002",
        country: "India",
      });

    expect(res.status).toBe(401);
  });

  it("returns 404 when the order ID is malformed", async () => {
    const res = await request(app)
      .get("/api/orders/not-a-valid-id")
      .set("Cookie", authCookie);

    expect(res.status).toBe(404);
  });

  it("returns 404 when cancelling an order that does not exist", async () => {
    const res = await request(app)
      .post(`/api/orders/${new mongoose.Types.ObjectId()}/cancel`)
      .set("Cookie", authCookie);

    expect(res.status).toBe(404);
  });

  it("rejects an address update when the delivery address is missing", async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/address`)
      .set("Cookie", authCookie)
      .send({});

    expect(res.status).toBe(422);
  });

  it("rejects an address update when the street is missing", async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/address`)
      .set("Cookie", authCookie)
      .send({
        city: "Bangalore",
        state: "Karnataka",
        pincode: "560001",
      });

    expect(res.status).toBe(422);
  });

  it("rejects an address update when the pincode is invalid", async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/address`)
      .set("Cookie", authCookie)
      .send({
        street: "456 New Street",
        city: "Bangalore",
        state: "Karnataka",
        pincode: "5600",
      });

    expect(res.status).toBe(422);
  });

  it("returns 404 when updating the address of a nonexistent order", async () => {
    const res = await request(app)
      .patch(`/api/orders/${new mongoose.Types.ObjectId()}/address`)
      .set("Cookie", authCookie)
      .send({
        street: "456 New Street",
        city: "Bangalore",
        state: "Karnataka",
        pincode: "560002",
      });

    expect(res.status).toBe(404);
  });
});
