const http = require("http");
const express = require("express");

/**
 * Mock HTTP Server for Downstream Microservices (Cart Service & Inventory Service)
 * Used in tests to simulate network calls made by the Order service.
 */
class MockServer {
  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.server = null;
    this.port = null;
    this.baseUrl = null;

    // Track calls made to mock endpoints
    this.history = {
      getCart: [],
      clearCart: [],
      reserveInventory: [],
      reverseInventory: [],
    };

    // Configurable state / mock responses
    this.state = {
      cart: null,
      cartError: null,
      clearCartError: null,
      inventoryResponse: { success: true, reservationId: "res_mock_123" },
      inventoryError: null,
      reverseInventoryResponse: { success: true },
      reverseInventoryError: null,
    };

    this._setupRoutes();
  }

  _setupRoutes() {
    // -------------------------------------------------------------
    // CART SERVICE MOCK ENDPOINTS
    // Handles GET /api/cart, GET /cart, DELETE /api/cart, DELETE /cart
    // -------------------------------------------------------------
    const handleGetCart = (req, res) => {
      this.history.getCart.push({
        headers: req.headers,
        query: req.query,
      });

      if (this.state.cartError) {
        return res
          .status(this.state.cartError.status || 400)
          .json(this.state.cartError.data || { error: "Cart error" });
      }

      return res.status(200).json(this.state.cart || { items: [] });
    };

    const handleClearCart = (req, res) => {
      this.history.clearCart.push({
        headers: req.headers,
        body: req.body,
      });

      if (this.state.clearCartError) {
        return res
          .status(this.state.clearCartError.status || 500)
          .json(this.state.clearCartError.data || { error: "Failed to clear cart" });
      }

      return res.status(200).json({ success: true, message: "Cart cleared" });
    };

    this.app.get("/api/cart", handleGetCart);
    this.app.get("/cart", handleGetCart);

    this.app.delete("/api/cart", handleClearCart);
    this.app.delete("/cart", handleClearCart);

    // -------------------------------------------------------------
    // INVENTORY SERVICE MOCK ENDPOINTS
    // Handles POST /api/inventory/reserve, POST /inventory/reserve,
    //         POST /api/inventory/reverse, POST /inventory/reverse
    // -------------------------------------------------------------
    const handleReserveInventory = (req, res) => {
      this.history.reserveInventory.push({
        headers: req.headers,
        body: req.body,
      });

      if (this.state.inventoryError) {
        return res
          .status(this.state.inventoryError.status || 400)
          .json(
            this.state.inventoryError.data || {
              error: "Insufficient inventory for requested products",
            }
          );
      }

      return res.status(200).json(this.state.inventoryResponse);
    };

    const handleReverseInventory = (req, res) => {
      this.history.reverseInventory.push({
        headers: req.headers,
        body: req.body,
      });

      if (this.state.reverseInventoryError) {
        return res
          .status(this.state.reverseInventoryError.status || 500)
          .json(
            this.state.reverseInventoryError.data || {
              error: "Failed to reverse inventory",
            }
          );
      }

      return res.status(200).json(this.state.reverseInventoryResponse);
    };

    this.app.post("/api/inventory/reserve", handleReserveInventory);
    this.app.post("/inventory/reserve", handleReserveInventory);

    this.app.post("/api/inventory/reverse", handleReverseInventory);
    this.app.post("/inventory/reverse", handleReverseInventory);
    this.app.post("/api/inventory/release", handleReverseInventory);
    this.app.post("/inventory/release", handleReverseInventory);
  }

  /**
   * Start mock server on an ephemeral random available port
   */
  start() {
    return new Promise((resolve) => {
      this.server = http.createServer(this.app);
      this.server.listen(0, () => {
        this.port = this.server.address().port;
        this.baseUrl = `http://127.0.0.1:${this.port}`;

        // Set environment variables so Order service points to this mock server
        process.env.CART_SERVICE_URL = this.baseUrl;
        process.env.INVENTORY_SERVICE_URL = this.baseUrl;

        resolve(this.baseUrl);
      });
    });
  }

  /**
   * Stop the mock server
   */
  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Reset mock states and recorded histories between test cases
   */
  reset() {
    this.history = {
      getCart: [],
      clearCart: [],
      reserveInventory: [],
      reverseInventory: [],
    };

    this.state = {
      cart: null,
      cartError: null,
      clearCartError: null,
      inventoryResponse: { success: true, reservationId: "res_mock_123" },
      inventoryError: null,
      reverseInventoryResponse: { success: true },
      reverseInventoryError: null,
    };
  }

  /**
   * Helper to set active cart returned by mock server
   */
  setCart(cartData) {
    this.state.cart = cartData;
    this.state.cartError = null;
  }

  /**
   * Helper to simulate cart service error (e.g. 404, 500)
   */
  setCartError(status, data) {
    this.state.cartError = { status, data };
  }

  /**
   * Helper to set inventory reservation response
   */
  setInventoryResponse(response) {
    this.state.inventoryResponse = response;
    this.state.inventoryError = null;
  }

  /**
   * Helper to simulate inventory error (e.g. 400 out of stock, 500 failure)
   */
  setInventoryError(status, data) {
    this.state.inventoryError = { status, data };
  }

  /**
   * Helper to simulate inventory reversal error
   */
  setReverseInventoryError(status, data) {
    this.state.reverseInventoryError = { status, data };
  }
}

const mockServer = new MockServer();
module.exports = mockServer;
