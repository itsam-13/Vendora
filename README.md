<div align="center">

# 🛍️ Vendora

**A Scalable, Modern Multi-Vendor E-Commerce Platform Backend**

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/express-v5.2.1-blue.svg?style=flat-square&logo=express)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%20v9-green.svg?style=flat-square&logo=mongodb)](https://mongoosejs.com/)
[![Redis](https://img.shields.io/badge/Redis-ioredis%20v6-red.svg?style=flat-square&logo=redis)](https://redis.io/)
[![ImageKit](https://img.shields.io/badge/ImageKit-Media%20CDN-orange.svg?style=flat-square)](https://imagekit.io/)
[![Tests](https://img.shields.io/badge/tests-47%20passed%20%7C%206%20suites-brightgreen.svg?style=flat-square&logo=jest)](https://jestjs.io/)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg?style=flat-square)](LICENSE)

</div>

---

## 📌 Project Overview

**Vendora** is an enterprise-ready, multi-vendor e-commerce backend built with a modular, service-oriented architecture. Designed to handle high-concurrency traffic, secure transactional workflows, and segregated seller-buyer operations, Vendora provides a resilient foundation for modern online commerce.

### 🚀 Current Development Progress

Vendora currently comprises two production-ready microservices:

1. **Authentication & Identity Service (`Port 3000`)**: Complete user credential management, dual token transport (HTTP-only cookies and Bearer headers), distributed Redis token blacklisting on logout, role-based access control (`user` and `seller`), and user shipping address book management.
2. **Product Catalog & Media Service (`Port 3001`)**: Product schema modeling, role-restricted product creation for verified sellers/admins, in-memory multipart streaming with Multer, automated cloud image processing and CDN delivery via **ImageKit**, input sanitization via express-validator, and atomic failure handling.

---

## ✨ Key Features & Capabilities

### 🔐 Authentication & Identity Management (`Auth/`)
- **Robust Registration & Dual Identifier Login**
  - Registration with duplicate protection across both `username` and `email`.
  - Role-based profile provisioning (`user` vs. `seller`).
  - Flexible login via either registered `email` or `username` (case-insensitive).
  - Secure password hashing using `bcryptjs` with salted rounds.

- **Token Management & Dual Transport**
  - Stateless JSON Web Token (JWT) issuance for authenticated sessions.
  - Accepts tokens from both `HttpOnly` cookies and `Authorization: Bearer <token>` headers.
  - Cookie security hardening: `httpOnly`, `sameSite: strict`, and SSL `secure` flag support.

- **Distributed Redis Session Revocation**
  - Immediate token blacklisting in Redis upon logout with automated TTL matching token expiration (24h).
  - Clean cookie clearance and server-side revocation.

- **Customer Address Book Management**
  - Full CRUD operations for customer shipping/billing addresses (`street`, `city`, `state`, `pincode`, `phone`, `country`).
  - Automatic default address setting: marks initial address as default, and enforces a single default address constraint.

### 📦 Product Catalog & Cloud Media CDN (`Products/`)
- **Role-Gated Product Creation (RBAC)**
  - Guarded by role verification middleware: only users with `seller` or `admin` roles can create products.
  - Non-privileged buyers receive an explicit `401 Unauthorized` error.

- **Cloud Media Pipeline (Multer + ImageKit)**
  - In-memory multipart handling via `multer` without storing temporary files on local disk.
  - Strict MIME validation (permits only `image/*`; rejects unsupported files with `400 Bad Request`).
  - Enforces a maximum of 5 images per product, up to 5 MB per image.
  - Parallel cloud upload to **ImageKit** with unique UUID naming.
  - Stores structured media payloads including full `url`, optimized `thumbnail`, and ImageKit file `id`.

- **Flexible Input Sanitization & Normalization**
  - Seamlessly handles both `application/json` and `multipart/form-data` request formats.
  - Automatically normalizes bracketed or nested price fields (`priceAmount`, `price.amount`, `price[amount]`, `price.currency`, `price[currency]`).
  - Validates positive price values and allowed currencies (`INR`, `USD`, defaults to `INR`).
  - Validates trimmed product title and optional description.

- **Atomic Creation & Resilience**
  - If ImageKit upload encounters an error, the operation aborts without persisting phantom data to MongoDB.

### 🧪 Automated Testing & Isolated CI/CD
- **100% In-Memory Test Automation**: Powered by Jest, Supertest, and `mongodb-memory-server`.
- **Offline External Service Mocks**: ImageKit SDK and Redis instances are fully mocked or fixture-isolated during test suites.
- **47 Passed Tests across 6 suites** with zero flaky cloud dependencies.

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Runtime** | Node.js | Asynchronous, event-driven JavaScript runtime (v18+) |
| **Framework** | Express.js 5.x | Next-generation web framework with native async error propagation |
| **Primary Database** | MongoDB | Document database for accounts, addresses, and product catalog |
| **ODM** | Mongoose 9.x | Schema modeling, validations, references, and hooks |
| **Caching & Invalidation** | Redis (ioredis 6.x) | In-memory distributed store for JWT token revocation blacklists |
| **Media Storage & CDN** | ImageKit SDK 6.x | Cloud media storage, asset optimization, and CDN delivery |
| **File Processing** | Multer 2.x | High-throughput in-memory multipart form data streaming |
| **Security & Auth** | JWT & Bcrypt.js | Stateless authorization tokens and salted password hashing |
| **Validation** | express-validator 7.x | Declarative request sanitization, type coercion, and schemas |
| **Testing Suite** | Jest & Supertest | Automated integration tests with in-memory MongoDB emulation |

---

## 📂 Project Structure

```text
Vendora/
├── README.md                       # Root repository documentation and guide
├── Auth/                           # Authentication & User Management Service (Port 3000)
│   ├── package.json                # Service dependencies and runner scripts
│   ├── server.js                   # Application bootstrap and database connector
│   ├── jest.config.js              # Jest configuration for integration test runs
│   ├── Src/
│   │   ├── app.js                  # Express app initialization and global middleware
│   │   ├── Controllers/
│   │   │   └── auth.controller.js  # Business logic (register, login, me, logout, addresses)
│   │   ├── DataBase/
│   │   │   ├── db.js               # MongoDB connection handler with DNS SRV resolver
│   │   │   └── redis.js            # ioredis client instance and event listeners
│   │   ├── MiddleWare/
│   │   │   ├── auth.middleware.js  # JWT Bearer and cookie authentication guard
│   │   │   └── validator.middleware.js # Express-validator request schemas
│   │   ├── Model/
│   │   │   └── user.model.js       # User & Address Mongoose schemas
│   │   └── Routes/
│   │       └── auth.routes.js      # Auth and address route definitions
│   └── tests/                      # Automated integration test suites (34 tests)
│       ├── setupDb.js              # In-memory MongoDB lifecycle fixtures
│       ├── auth.register.test.js   # Registration endpoint test suite
│       ├── auth.login.test.js      # Login validation and credential test suite
│       ├── auth.me.test.js         # Profile retrieval test suite
│       ├── auth.logout.test.js     # Redis revocation and cookie clear test suite
│       └── auth.address.test.js    # Address book management test suite
└── Products/                       # Product Catalog & Media Service (Port 3001)
    ├── package.json                # Service dependencies and runner scripts
    ├── server.js                   # Application bootstrap and database connector
    ├── jest.config.js              # Jest configuration for integration test runs
    ├── src/
    │   ├── app.js                  # Express app setup and product routing
    │   ├── controllers/
    │   │   └── product.controller.js # Product creation logic & ImageKit coordination
    │   ├── database/
    │   │   └── db.js               # MongoDB connection handler with DNS fallback
    │   ├── middlewares/
    │   │   ├── auth.middleware.js  # RBAC & JWT verification guard
    │   │   ├── multer.middleware.js # In-memory multipart upload parser & filter
    │   │   └── validator.middleware.js # Input sanitization and validation schemas
    │   ├── models/
    │   │   └── product.model.js    # Product Mongoose schema
    │   ├── routes/
    │   │   └── product.routes.js   # Product route definitions (/api/products)
    │   └── services/
    │       └── imagekit.service.js # ImageKit SDK integration and cloud uploader
    └── tests/                      # Automated integration test suites (13 tests)
        ├── setupDb.js              # In-memory MongoDB lifecycle fixtures
        └── product.test.js         # Product creation, RBAC, Multer & ImageKit tests
```

---

## 📡 API Reference

### 1. Authentication & Profile Endpoints (`Auth Service: 3000`)

All authentication endpoints are exposed under `/api/auth` (and aliased under `/auth`).

| Method | Endpoint | Auth Required | Allowed Roles | Description |
| :--- | :--- | :---: | :---: | :--- |
| `POST` | `/api/auth/register` | ❌ No | Any | Registers a new user or seller account. |
| `POST` | `/api/auth/login` | ❌ No | Any | Authenticates credentials and returns JWT + cookie. |
| `GET` | `/api/auth/me` | ✅ Yes | Any authenticated | Retrieves authenticated user profile. |
| `GET` | `/api/auth/logout` | ✅ Yes | Any authenticated | Revokes session, blacklists token in Redis, clears cookie. |

#### `POST /api/auth/register`
**Request Body:**
```json
{
  "username": "janedoe",
  "email": "jane@example.com",
  "password": "Password123!",
  "fullName": {
    "firstName": "Jane",
    "lastName": "Doe"
  },
  "role": "seller" // optional: 'user' or 'seller' (default: 'user')
}
```

#### `POST /api/auth/login`
**Request Body (Accepts either email or username):**
```json
{
  "email": "jane@example.com", // or "username": "janedoe"
  "password": "Password123!"
}
```

---

### 2. User Address Management Endpoints (`Auth Service: 3000`)

| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/auth/users/me/address` | ✅ Yes | Fetches all saved shipping addresses for current user. |
| `POST` | `/api/auth/users/me/address` | ✅ Yes | Adds a new shipping address to the user profile. |
| `DELETE` | `/api/auth/users/me/address/:addressID` | ✅ Yes | Deletes an address by its MongoDB ObjectId. |

#### `POST /api/auth/users/me/address`
**Request Body:**
```json
{
  "street": "123 Market Street, Suite 400",
  "city": "San Francisco",
  "state": "California",
  "pincode": "94103",
  "phone": "9876543210",
  "country": "United States",
  "isDefault": true
}
```

---

### 3. Product Catalog Endpoints (`Products Service: 3001`)

All product endpoints are exposed under `/api/products`.

| Method | Endpoint | Auth Required | Allowed Roles | Content-Type | Description |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `POST` | `/api/products` | ✅ Yes | `admin`, `seller` | `application/json` or `multipart/form-data` | Creates a new product with optional image uploads. |

#### `POST /api/products`

**Headers:**
- `Authorization: Bearer <SELLER_OR_ADMIN_JWT_TOKEN>` *(or `token` cookie)*
- `Content-Type: multipart/form-data` (for image uploads) or `application/json`

**Parameters:**

| Field | Type | Required | Description |
| :--- | :---: | :---: | :--- |
| `title` | String | **Yes** | Product title (must not be empty or whitespace only). |
| `description` | String | No | Detailed description of the product. |
| `priceAmount` | Number | **Yes** | Positive product price. Also accepts `price.amount` or `price[amount]`. |
| `priceCurrency` | String | No | Currency (`INR` or `USD`, default: `INR`). Also accepts `price.currency` or `price[currency]`. |
| `images` | Files | No | Up to 5 image files (JPEG, PNG, WEBP, etc.). Max 5 MB each. |

**Example 1: JSON Request (Without Images)**
```bash
curl -X POST http://localhost:3001/api/products \
  -H "Authorization: Bearer <SELLER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Mechanical Keyboard",
    "description": "RGB mechanical keyboard with blue switches",
    "price": {
      "amount": 2999,
      "currency": "INR"
    }
  }'
```

**Example 2: Multipart Form-Data (With Images)**
```bash
curl -X POST http://localhost:3001/api/products \
  -H "Authorization: Bearer <SELLER_TOKEN>" \
  -F "title=Smart Watch Pro" \
  -F "description=AMOLED display with fitness tracking" \
  -F "price[amount]=4999" \
  -F "price[currency]=INR" \
  -F "images=@watch_front.jpg" \
  -F "images=@watch_side.png"
```

**Success Response (`201 Created`):**
```json
{
  "success": true,
  "message": "Product created successfully",
  "product": {
    "_id": "67471234abcd5678ef901234",
    "title": "Smart Watch Pro",
    "description": "AMOLED display with fitness tracking",
    "price": {
      "amount": 4999,
      "currency": "INR"
    },
    "seller": "67470000aaaa1111bbbb2222",
    "images": [
      {
        "url": "https://ik.imagekit.io/vendora/products/uuid-watch_front.jpg",
        "thumbnail": "https://ik.imagekit.io/vendora/products/tr:n-media_library_thumbnail/uuid-watch_front.jpg",
        "id": "67471234_file_id_1"
      },
      {
        "url": "https://ik.imagekit.io/vendora/products/uuid-watch_side.png",
        "thumbnail": "https://ik.imagekit.io/vendora/products/tr:n-media_library_thumbnail/uuid-watch_side.png",
        "id": "67471234_file_id_2"
      }
    ],
    "__v": 0
  }
}
```

**Common Error Responses:**
- `400 Bad Request`: Validation failure (missing title, non-positive price) or non-image file uploaded.
- `401 Unauthorized`: Missing authentication token, expired/invalid JWT, or forbidden user role (e.g. standard `user`).
- `500 Internal Server Error`: ImageKit upload failure or database write exception.

---

### 🗄️ Database Schemas

#### User & Address Schema (`Auth/`)
- **User**: `username` (unique, lowercase), `email` (unique, lowercase), `password` (hashed with bcrypt), `fullName` (`firstName`, `lastName`), `role` (`user`, `seller`), `addresses` (array of embedded Address documents).
- **Address**: `street`, `city`, `state`, `pincode`, `phone`, `country`, `isDefault` (boolean).

#### Product Schema (`Products/`)
```javascript
const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ""
  },
  price: {
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      enum: ["INR", "USD"],
      default: "INR"
    }
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  images: [
    {
      url: { type: String },
      thumbnail: { type: String },
      id: { type: String }
    }
  ]
});
```

---

## ⚙️ Getting Started

### Prerequisites

Ensure you have the following installed on your development machine:
- [Node.js](https://nodejs.org/) (`v18` or higher recommended)
- [npm](https://www.npmjs.com/) (`v9` or higher)
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas cluster)
- [Redis](https://redis.io/) (Local server or Cloud Redis instance for Auth service)
- [ImageKit Account](https://imagekit.io/) (API credentials for Products service)

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/itsam-13/Vendora.git
   cd Vendora
   ```

2. **Setup the Authentication Service:**
   ```bash
   cd Auth
   npm install
   ```
   Create an `Auth/.env` file:
   ```ini
   PORT=3000
   NODE_ENV=development
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/VendoraAuth?retryWrites=true&w=majority
   JWT_SECRET_KEY=your_shared_jwt_secret_key_here
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379
   REDIS_PASSWORD=
   ```
   Run Auth Service:
   ```bash
   npm run dev
   ```
   *The Auth service will listen on `http://localhost:3000`.*

3. **Setup the Products Service:**
   ```bash
   cd ../Products
   npm install
   ```
   Create a `Products/.env` file:
   ```ini
   PORT=3001
   NODE_ENV=development
   MONGO_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/VendoraProducts?retryWrites=true&w=majority
   JWT_SECRET_KEY=your_shared_jwt_secret_key_here
   IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
   IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
   IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_endpoint_id
   ```
   Run Products Service:
   ```bash
   npm run dev
   ```
   *The Products service will listen on `http://localhost:3001`.*

---

## 🧪 Testing & Code Quality

Both microservices include independent, isolated integration test suites using `Jest`, `Supertest`, and in-memory MongoDB (`mongodb-memory-server`). No live database, Redis cluster, or ImageKit account is needed to run the tests.

### Running Auth Service Tests
```bash
cd Auth
npm test
```
```text
PASS  tests/auth.address.test.js  (6 tests)
PASS  tests/auth.login.test.js    (11 tests)
PASS  tests/auth.logout.test.js   (10 tests)
PASS  tests/auth.register.test.js (4 tests)
PASS  tests/auth.me.test.js       (3 tests)

Test Suites: 5 passed, 5 total
Tests:       34 passed, 34 total
Snapshots:   0 total
Time:        5.405 s
```

### Running Products Service Tests
```bash
cd Products
npm test
```
```text
PASS  tests/product.test.js
  POST /api/products/ - Create Product API
    Authentication and Role Authorization (3 tests)
    Request Validation (express-validator) (4 tests)
    Product Creation with JSON Payload (3 tests)
    Product Creation with Multer & ImageKit Image Uploads (3 tests)

Test Suites: 1 passed, 1 total
Tests:       13 passed, 13 total
Snapshots:   0 total
Time:        1.356 s
```

### Combined Test Summary
- **Total Test Suites**: 6 passed, 6 total
- **Total Tests**: 47 passed, 47 total (100% pass rate)

---

## 🗺️ Roadmap & Next Milestones

Vendora is actively being expanded with the following planned services:

- [x] **Authentication & Identity Service** (Registration, Login, Redis revocation, Address book)
- [x] **Product Catalog Service — Phase 1** (Catalog creation, RBAC, express-validator schemas, Multer & ImageKit media pipeline)
- [ ] **Product Catalog Service — Phase 2** (Public browsing, pagination, search, category filters, product updates & deletion)
- [ ] **Cart & Wishlist Service** (Persistent Redis-cached customer shopping carts)
- [ ] **Order & Fulfillment Service** (State machine for order lifecycles and tracking)
- [ ] **Payment & Checkout Gateway** (Stripe / Razorpay webhooks and multi-vendor escrow disbursements)
- [ ] **API Gateway & Rate Limiting** (Unified reverse proxy, central authorization routing, request throttling)

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
