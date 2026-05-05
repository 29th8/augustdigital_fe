# ORDER MODULE — API Testing Guide

**Target audience:** Frontend developers & QA testers
**Module version:** FINAL v2 (cart-based order creation — items are read from cart_items table)
**Last updated:** 2026-04-12

---

## SECTION 1 — OVERVIEW

### 1.1 Base URL

```
http://localhost:8080
```

All endpoints are prefixed with `/api/v1`.

---

### 1.2 Common Request Headers

| Header | Required | Value | Notes |
|---|---|---|---|
| `Content-Type` | Yes (POST) | `application/json` | Required on all POST requests with a body |
| `Authorization` | Conditional | `Bearer <jwt_token>` | Required for protected routes; optional for order creation |
| `X-Session-ID` | Conditional | Any UUID string | Required for guest cart/order flows when no JWT is present |

---

### 1.3 ApiResponse Wrapper

Every response from this API is wrapped in the `ApiResponse<T>` envelope.

**Success response structure:**
```json
{
  "code": 200,
  "message": "Success",
  "data": { ... }
}
```

**Created response structure (HTTP 201):**
```json
{
  "code": 201,
  "message": "Created",
  "data": { ... }
}
```

**Error response structure:**
```json
{
  "code": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email must be a valid email address"
    }
  ]
}
```

**Single-message error (no field errors):**
```json
{
  "code": 400,
  "message": "Cart is empty"
}
```

> The `errors` array is only present when there are per-field validation failures.
> The `data` field is absent (omitted via `@JsonInclude(NON_NULL)`) in error responses.

---

### 1.4 Full Endpoint List

| # | Method | Path | Auth Required | Description |
|---|---|---|---|---|
| 1 | `POST` | `/api/v1/orders` | No (JWT optional) | Create a new order from the caller's cart |
| 2 | `POST` | `/api/v1/orders/lookup` | No | Look up order by order_code + email |
| 3 | `GET` | `/api/v1/admin/orders` | Yes (ADMIN role) | Paginated admin order list with filters |

---

### 1.5 Cart-First Order Flow

> **IMPORTANT CHANGE:** Items are no longer sent in the `POST /api/v1/orders` request body.
> The backend reads them directly from the `cart_items` table.

```
1. Client adds items to cart  →  POST /api/v1/cart
2. Client sends email + phone →  POST /api/v1/orders
3. Backend reads cart_items   →  WHERE user_id = ? OR session_id = ?
4. Backend creates the order  →  ORDER + ORDER_ITEMS + clears cart (atomic)
5. Backend returns order_code
```

The caller's cart is cleared automatically inside the same `@Transactional` as the order creation.
If the order fails for any reason, the cart is **NOT** cleared (transaction rollback).

---

## SECTION 2 — TEST DATA PREREQUISITES

The following data must exist in the PostgreSQL database before running any test.

### 2.1 User Accounts

```sql
-- Admin account
INSERT INTO users (email, password, role, created_at, updated_at)
VALUES (
  'admin@augustdigital.com',
  '$2a$10$HASHED_PASSWORD_FOR_Admin@123',   -- BCrypt hash of: Admin@123
  'ADMIN',
  NOW(),
  NOW()
);

-- Customer account
INSERT INTO users (email, password, role, created_at, updated_at)
VALUES (
  'customer@example.com',
  '$2a$10$HASHED_PASSWORD_FOR_Customer@123',  -- BCrypt hash of: Customer@123
  'CUSTOMER',
  NOW(),
  NOW()
);
```

**Credentials summary:**

| Account | Email | Password | Role |
|---|---|---|---|
| Admin | `admin@augustdigital.com` | `Admin@123` | ADMIN |
| Customer | `customer@example.com` | `Customer@123` | CUSTOMER |

---

### 2.2 Category + Products + Variants

```sql
-- Category
INSERT INTO categories (name, created_at) VALUES ('Software', NOW());

-- Product
INSERT INTO products (name, category_id, description, is_active, is_deleted, created_at)
VALUES ('Microsoft Office 365', 1, 'Productivity suite', true, false, NOW());

-- Variant 1: 1-month plan — price 150,000 VND
INSERT INTO product_variants (product_id, name, price, created_at)
VALUES (1, '1 Month Plan', 150000.00, NOW());

-- Variant 2: 12-month plan — price 1,200,000 VND
INSERT INTO product_variants (product_id, name, price, created_at)
VALUES (1, '12 Month Plan', 1200000.00, NOW());
```

**Variant reference:**

| variant_id | name | price |
|---|---|---|
| `1` | 1 Month Plan | 150,000.00 |
| `2` | 12 Month Plan | 1,200,000.00 |

---

### 2.3 Inventory Items (stock)

> Stock source of truth is `inventory_items` table. There is **no** `stock` field on `product_variants`.

```sql
-- 5 available keys for Variant 1
INSERT INTO inventory_items (product_variant_id, type, data_encrypted, status, created_at)
VALUES
  (1, 'KEY', 'ENCRYPTED_KEY_1A', 'AVAILABLE', NOW()),
  (1, 'KEY', 'ENCRYPTED_KEY_1B', 'AVAILABLE', NOW()),
  (1, 'KEY', 'ENCRYPTED_KEY_1C', 'AVAILABLE', NOW()),
  (1, 'KEY', 'ENCRYPTED_KEY_1D', 'AVAILABLE', NOW()),
  (1, 'KEY', 'ENCRYPTED_KEY_1E', 'AVAILABLE', NOW());

-- 3 available keys for Variant 2
INSERT INTO inventory_items (product_variant_id, type, data_encrypted, status, created_at)
VALUES
  (2, 'KEY', 'ENCRYPTED_KEY_2A', 'AVAILABLE', NOW()),
  (2, 'KEY', 'ENCRYPTED_KEY_2B', 'AVAILABLE', NOW()),
  (2, 'KEY', 'ENCRYPTED_KEY_2C', 'AVAILABLE', NOW());
```

---

### 2.4 Discount Codes

```sql
-- Valid discount: 10% off, 100 uses allowed, expires 2027-12-31
INSERT INTO discount_codes (code, type, value, usage_limit, used_count, is_active, expired_at, created_at)
VALUES ('SAVE10', 'PERCENT', 10.00, 100, 0, true, '2027-12-31 23:59:59', NOW());

-- Valid fixed discount: 50,000 VND off, 5 uses, expires 2027-12-31
INSERT INTO discount_codes (code, type, value, usage_limit, used_count, is_active, expired_at, created_at)
VALUES ('FLAT50K', 'FIXED', 50000.00, 5, 0, true, '2027-12-31 23:59:59', NOW());

-- Expired discount code
INSERT INTO discount_codes (code, type, value, usage_limit, used_count, is_active, expired_at, created_at)
VALUES ('EXPIRED20', 'PERCENT', 20.00, 50, 0, true, '2020-01-01 00:00:00', NOW());

-- Exhausted discount code (used_count = usage_limit)
INSERT INTO discount_codes (code, type, value, usage_limit, used_count, is_active, expired_at, created_at)
VALUES ('USED100', 'PERCENT', 15.00, 10, 10, true, '2027-12-31 23:59:59', NOW());
```

**Discount code reference:**

| code | type | value | status | Notes |
|---|---|---|---|---|
| `SAVE10` | PERCENT | 10% | Valid | Use in happy-path tests |
| `FLAT50K` | FIXED | 50,000 | Valid | Fixed amount discount |
| `EXPIRED20` | PERCENT | 20% | Invalid | expired_at is in the past |
| `USED100` | PERCENT | 15% | Invalid | used_count = usage_limit |

---

### 2.5 Cart Items for Test Setup

> Each test that calls `POST /api/v1/orders` requires cart items to already exist.
> The tests below assume the following cart state. Add items via `POST /api/v1/cart` or via SQL.

```sql
-- Cart for authenticated customer (user_id = 2): 2 × Variant 1 + 1 × Variant 2
INSERT INTO cart_items (user_id, session_id, product_variant_id, quantity, created_at)
VALUES (2, NULL, 1, 2, NOW());

INSERT INTO cart_items (user_id, session_id, product_variant_id, quantity, created_at)
VALUES (2, NULL, 2, 1, NOW());

-- Cart for guest session: 1 × Variant 2
INSERT INTO cart_items (user_id, session_id, product_variant_id, quantity, created_at)
VALUES (NULL, 'test-session-uuid-1234', 2, 1, NOW());
```

> ⚠️ **Cart items are deleted** when an order is successfully created. Re-insert them between test runs
> that consume the cart (TC-ORD-001, TC-ORD-002, Scenario 1, Scenario 2).

---

## SECTION 3 — ENDPOINT-BY-ENDPOINT TEST GUIDE

---

### 3.1 POST /api/v1/orders — Create Order

**Description:** Creates a new order by reading the caller's current cart items from the database.
Supports both authenticated users (with JWT) and guests (with `X-Session-ID`).
Returns `201 Created` with the full `OrderResponse` on success.
Atomically inserts the order, order items, increments the discount code usage count, and clears the caller's cart.

**Request headers:**

| Header | Required | Notes |
|---|---|---|
| `Content-Type` | Yes | `application/json` |
| `Authorization` | Optional | `Bearer <token>` — if present, order is linked to the user and cart is read by user_id |
| `X-Session-ID` | Conditional | Required for guests — cart is read and cleared by session_id |

**Request body schema:**

```json
{
  "email": "string (required, valid email format)",
  "phone": "string (required)",
  "discountCode": "string (optional)"
}
```

> **No `items` field.** Items are read from `cart_items` WHERE `user_id = ?` (authenticated)
> or `session_id = ?` (guest). The client must add items to the cart before calling this endpoint.
> There is also no `price` field — prices are always fetched from `product_variants.price`.

---

#### [TC-ORD-001] Happy path — authenticated user with discount code

**Prerequisite:** Cart for `user_id = 2` has 2 × Variant 1 and 1 × Variant 2 (see §2.5).

**Condition:** Valid JWT for `customer@example.com`, non-empty cart, valid discount code `SAVE10`

```bash
curl -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <customer_jwt_token>" \
  -d '{
    "email": "customer@example.com",
    "phone": "0901234567",
    "discountCode": "SAVE10"
  }'
```

**Expected status:** `201 Created`

**Expected response body:**
```json
{
  "code": 201,
  "message": "Created",
  "data": {
    "order_code": "ORD-20260412-X7K9P2",
    "status": "PENDING",
    "total_amount": 1350000.00,
    "email": "customer@example.com",
    "phone": "0901234567",
    "created_at": "2026-04-12T10:30:00",
    "items": [
      {
        "variant_id": 1,
        "variant_name": "1 Month Plan",
        "product_name": "Microsoft Office 365",
        "quantity": 2,
        "price": 150000.00,
        "subtotal": 300000.00
      },
      {
        "variant_id": 2,
        "variant_name": "12 Month Plan",
        "product_name": "Microsoft Office 365",
        "quantity": 1,
        "price": 1200000.00,
        "subtotal": 1200000.00
      }
    ]
  }
}
```

> Subtotal before discount = 300,000 + 1,200,000 = 1,500,000
> SAVE10 = 10% off → discount = 150,000
> `total_amount` = 1,350,000

**Post-condition to verify:**
- `orders` table: new row with `status = PENDING`, `email = customer@example.com` (lowercase)
- `order_items` table: 2 new rows with snapshotted prices from `product_variants`
- `discount_codes` table: `SAVE10.used_count` incremented by 1
- `cart_items` table: all rows for `user_id = 2` deleted

---

#### [TC-ORD-002] Happy path — guest order (no JWT, with X-Session-ID)

**Prerequisite:** Cart for `session_id = test-session-uuid-1234` has 1 × Variant 2 (see §2.5).

**Condition:** No Authorization header, `X-Session-ID: test-session-uuid-1234`

```bash
curl -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: test-session-uuid-1234" \
  -d '{
    "email": "guest@example.com",
    "phone": "0987654321"
  }'
```

**Expected status:** `201 Created`

**Expected response body:**
```json
{
  "code": 201,
  "message": "Created",
  "data": {
    "order_code": "ORD-20260412-AB3DE1",
    "status": "PENDING",
    "total_amount": 1200000.00,
    "email": "guest@example.com",
    "phone": "0987654321",
    "created_at": "2026-04-12T10:31:00",
    "items": [
      {
        "variant_id": 2,
        "variant_name": "12 Month Plan",
        "product_name": "Microsoft Office 365",
        "quantity": 1,
        "price": 1200000.00,
        "subtotal": 1200000.00
      }
    ]
  }
}
```

**Post-condition to verify:**
- `orders.user_id` is `null` (guest order — no FK to users)
- `cart_items` for `session_id = test-session-uuid-1234` deleted

---

#### [TC-ORD-003] Missing email

```bash
curl -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <customer_jwt_token>" \
  -d '{
    "phone": "0901234567"
  }'
```

**Expected status:** `400 Bad Request`

**Expected response body:**
```json
{
  "code": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

---

#### [TC-ORD-004] Invalid email format

```bash
curl -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <customer_jwt_token>" \
  -d '{
    "email": "not-an-email",
    "phone": "0901234567"
  }'
```

**Expected status:** `400 Bad Request`

**Expected response body:**
```json
{
  "code": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email must be a valid email address"
    }
  ]
}
```

---

#### [TC-ORD-005] Empty cart — no items to order

**Condition:** Call the endpoint with a valid JWT but the user's cart is empty (no rows in `cart_items` for this `user_id`). The validation check runs after field validation passes.

**Prerequisite:** Ensure no `cart_items` rows exist for the test user:
```sql
DELETE FROM cart_items WHERE user_id = 2;
```

```bash
curl -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <customer_jwt_token>" \
  -d '{
    "email": "customer@example.com",
    "phone": "0901234567"
  }'
```

**Expected status:** `400 Bad Request`

**Expected response body:**
```json
{
  "code": 400,
  "message": "Cart is empty"
}
```

---

#### [TC-ORD-006] No identity — neither JWT nor X-Session-ID

**Condition:** No `Authorization` header and no `X-Session-ID` header. The backend has no way to look up a cart → cart is effectively empty → 400.

```bash
curl -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "phone": "0901234567"
  }'
```

**Expected status:** `400 Bad Request`

**Expected response body:**
```json
{
  "code": 400,
  "message": "Cart is empty"
}
```

---

#### [TC-ORD-007] Cart contains a non-existent variant

**Condition:** The `cart_items` table has a row pointing to a `product_variant_id` that no longer exists (e.g. hard-deleted variant). Insert a stale cart item manually:

```sql
INSERT INTO cart_items (user_id, session_id, product_variant_id, quantity, created_at)
VALUES (2, NULL, 99999, 1, NOW());
```

```bash
curl -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <customer_jwt_token>" \
  -d '{
    "email": "customer@example.com",
    "phone": "0901234567"
  }'
```

**Expected status:** `404 Not Found`

**Expected response body:**
```json
{
  "code": 404,
  "message": "Product variant not found: 99999"
}
```

> **Clean up** after this test: `DELETE FROM cart_items WHERE product_variant_id = 99999;`

---

#### [TC-ORD-008] Discount code does not exist

**Prerequisite:** Cart for the user has items.

```bash
curl -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <customer_jwt_token>" \
  -d '{
    "email": "customer@example.com",
    "phone": "0901234567",
    "discountCode": "FAKECODE"
  }'
```

**Expected status:** `400 Bad Request`

**Expected response body:**
```json
{
  "code": 400,
  "message": "Discount code not found or inactive"
}
```

---

#### [TC-ORD-009] Expired discount code

> ⚠️ **Critical rule:** Backend validates `expired_at > NOW()`. If expired → reject with 400.

**Prerequisite:** Cart for the user has items.

```bash
curl -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <customer_jwt_token>" \
  -d '{
    "email": "customer@example.com",
    "phone": "0901234567",
    "discountCode": "EXPIRED20"
  }'
```

**Expected status:** `400 Bad Request`

**Expected response body:**
```json
{
  "code": 400,
  "message": "Discount code has expired"
}
```

---

#### [TC-ORD-010] Discount code usage limit reached

> ⚠️ **Critical rule:** `USED100` has `used_count = usage_limit = 10`. Backend validates `used_count < usage_limit`.

**Prerequisite:** Cart for the user has items.

```bash
curl -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <customer_jwt_token>" \
  -d '{
    "email": "customer@example.com",
    "phone": "0901234567",
    "discountCode": "USED100"
  }'
```

**Expected status:** `400 Bad Request`

**Expected response body:**
```json
{
  "code": 400,
  "message": "Discount code usage limit has been reached"
}
```

---

#### [TC-ORD-011] Guest with missing phone

**Prerequisite:** Cart for the guest session has items.

```bash
curl -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: test-session-uuid-1234" \
  -d '{
    "email": "guest@example.com"
  }'
```

**Expected status:** `400 Bad Request`

**Expected response body:**
```json
{
  "code": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "phone",
      "message": "Phone is required"
    }
  ]
}
```

---

### 3.2 POST /api/v1/orders/lookup — Order Lookup

**Description:** Looks up an existing order by `order_code` + `email`. The email gate prevents unauthorized access to orders — even if a third party knows the `order_code`, they cannot view the order without the exact email used at checkout. No JWT required.

> ⚠️ **Security rule:** The service compares `email.toLowerCase()` against the stored email (which was normalized to lowercase at write time). This means `USER@GMAIL.COM` and `user@gmail.com` both resolve correctly. The comparison uses strict `=` equality, NOT `ILIKE`.

**Request headers:**

| Header | Required | Value |
|---|---|---|
| `Content-Type` | Yes | `application/json` |

**Request body schema:**
```json
{
  "order_code": "string (required)",
  "email": "string (required)"
}
```

---

#### [TC-LKP-001] Correct order_code + email

**Prerequisite:** Create an order first (e.g. from TC-ORD-001), note the `order_code` from the response.

```bash
curl -X POST http://localhost:8080/api/v1/orders/lookup \
  -H "Content-Type: application/json" \
  -d '{
    "order_code": "ORD-20260412-X7K9P2",
    "email": "customer@example.com"
  }'
```

**Expected status:** `200 OK`

**Expected response body:**
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "order_code": "ORD-20260412-X7K9P2",
    "status": "PENDING",
    "total_amount": 1350000.00,
    "email": "customer@example.com",
    "phone": "0901234567",
    "created_at": "2026-04-12T10:30:00",
    "items": [
      {
        "variant_id": 1,
        "variant_name": "1 Month Plan",
        "product_name": "Microsoft Office 365",
        "quantity": 2,
        "price": 150000.00,
        "subtotal": 300000.00
      },
      {
        "variant_id": 2,
        "variant_name": "12 Month Plan",
        "product_name": "Microsoft Office 365",
        "quantity": 1,
        "price": 1200000.00,
        "subtotal": 1200000.00
      }
    ]
  }
}
```

---

#### [TC-LKP-002] Non-existent order_code

```bash
curl -X POST http://localhost:8080/api/v1/orders/lookup \
  -H "Content-Type: application/json" \
  -d '{
    "order_code": "ORD-99999999-ZZZZZZ",
    "email": "customer@example.com"
  }'
```

**Expected status:** `404 Not Found`

**Expected response body:**
```json
{
  "code": 404,
  "message": "Order not found"
}
```

---

#### [TC-LKP-003] Correct order_code but wrong email

> ⚠️ **Security critical:** Returns `403 Forbidden` — not `404`. This is intentional: the server confirms the order exists but denies access. Returning 404 here would require the caller to probe two fields independently; 403 with no extra detail is the correct security posture.

```bash
curl -X POST http://localhost:8080/api/v1/orders/lookup \
  -H "Content-Type: application/json" \
  -d '{
    "order_code": "ORD-20260412-X7K9P2",
    "email": "wrongemail@example.com"
  }'
```

**Expected status:** `403 Forbidden`

**Expected response body:**
```json
{
  "code": 403,
  "message": "Access denied"
}
```

---

#### [TC-LKP-004] Email in different case — case-insensitive lookup

> ⚠️ **Normalization rule:** Orders are always stored with lowercase email. The lookup normalizes the input to lowercase before comparison. So `CUSTOMER@EXAMPLE.COM` resolves identically to `customer@example.com`.

```bash
curl -X POST http://localhost:8080/api/v1/orders/lookup \
  -H "Content-Type: application/json" \
  -d '{
    "order_code": "ORD-20260412-X7K9P2",
    "email": "CUSTOMER@EXAMPLE.COM"
  }'
```

**Expected status:** `200 OK`

**Expected response body:** (same as TC-LKP-001)

---

### 3.3 GET /api/v1/admin/orders — Admin Order List

**Description:** Returns a paginated list of all orders. Supports optional filtering by `status` and date range (`from`, `to`). Results are sorted by `created_at DESC`. Requires a valid JWT with `ADMIN` role.

**Request headers:**

| Header | Required | Value |
|---|---|---|
| `Authorization` | Yes | `Bearer <admin_jwt_token>` |

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | integer | `0` | Zero-based page index |
| `size` | integer | `20` | Number of records per page |
| `status` | string | *(none)* | Filter by order status (e.g. `PENDING`, `PAID`, `COMPLETED`) |
| `from` | date (`YYYY-MM-DD`) | *(none)* | Filter orders created on or after this date |
| `to` | date (`YYYY-MM-DD`) | *(none)* | Filter orders created on or before this date |

---

#### [TC-ADM-001] Get all orders — no filters

```bash
curl -X GET "http://localhost:8080/api/v1/admin/orders" \
  -H "Authorization: Bearer <admin_jwt_token>"
```

**Expected status:** `200 OK`

**Expected response body:**
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "items": [
      {
        "id": 2,
        "order_code": "ORD-20260412-AB3DE1",
        "email": "guest@example.com",
        "phone": "0987654321",
        "total_amount": 1200000.00,
        "status": "PENDING",
        "created_at": "2026-04-12T10:31:00",
        "updated_at": "2026-04-12T10:31:00"
      },
      {
        "id": 1,
        "order_code": "ORD-20260412-X7K9P2",
        "email": "customer@example.com",
        "phone": "0901234567",
        "total_amount": 1350000.00,
        "status": "PENDING",
        "created_at": "2026-04-12T10:30:00",
        "updated_at": "2026-04-12T10:30:00"
      }
    ],
    "page_info": {
      "total_elements": 2,
      "total_pages": 1,
      "current_page": 0,
      "page_size": 20
    }
  }
}
```

> Note: results are sorted `created_at DESC` — newest first.

---

#### [TC-ADM-002] Filter by status=PENDING

```bash
curl -X GET "http://localhost:8080/api/v1/admin/orders?status=PENDING" \
  -H "Authorization: Bearer <admin_jwt_token>"
```

**Expected status:** `200 OK`

**Expected response body:** All orders in the `items` array will have `"status": "PENDING"`.

---

#### [TC-ADM-003] Filter by date range

```bash
curl -X GET "http://localhost:8080/api/v1/admin/orders?from=2026-04-12&to=2026-04-12" \
  -H "Authorization: Bearer <admin_jwt_token>"
```

**Expected status:** `200 OK`

**Verification:** All returned orders must have `created_at` between `2026-04-12T00:00:00` and `2026-04-12T23:59:59`.

---

#### [TC-ADM-004] Pagination — page=0, size=1

```bash
curl -X GET "http://localhost:8080/api/v1/admin/orders?page=0&size=1" \
  -H "Authorization: Bearer <admin_jwt_token>"
```

**Expected status:** `200 OK`

**Expected response body:**
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "items": [
      {
        "id": 2,
        "order_code": "ORD-20260412-AB3DE1",
        "email": "guest@example.com",
        "phone": "0987654321",
        "total_amount": 1200000.00,
        "status": "PENDING",
        "created_at": "2026-04-12T10:31:00",
        "updated_at": "2026-04-12T10:31:00"
      }
    ],
    "page_info": {
      "total_elements": 2,
      "total_pages": 2,
      "current_page": 0,
      "page_size": 1
    }
  }
}
```

---

#### [TC-ADM-005] Call without token — 401

```bash
curl -X GET "http://localhost:8080/api/v1/admin/orders"
```

**Expected status:** `401 Unauthorized`

**Expected response body:**
```json
{
  "code": 401,
  "message": "Unauthorized: Full authentication is required to access this resource"
}
```

---

#### [TC-ADM-006] Call with CUSTOMER token — 403

```bash
curl -X GET "http://localhost:8080/api/v1/admin/orders" \
  -H "Authorization: Bearer <customer_jwt_token>"
```

**Expected status:** `403 Forbidden`

**Expected response body:**
```json
{
  "code": 403,
  "message": "Forbidden: Access Denied"
}
```

---

## SECTION 4 — INTEGRATION TEST SCENARIOS (End-to-End)

---

### Scenario 1 — Full flow for authenticated user

**Goal:** Verify the complete happy path: login → add to cart → create order → look up order → confirm cart cleared.

#### Step 1: Login to get JWT

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "password": "Customer@123"
  }'
```

Save the token from `data.token`.

---

#### Step 2: Add item to cart

```bash
curl -X POST http://localhost:8080/api/v1/cart \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <customer_jwt_token>" \
  -d '{
    "variantId": 1,
    "quantity": 2
  }'
```

**Expected:** `200 OK`

---

#### Step 3: Create order (no items in body — reads from cart)

```bash
curl -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <customer_jwt_token>" \
  -d '{
    "email": "customer@example.com",
    "phone": "0901234567",
    "discountCode": "SAVE10"
  }'
```

**Expected:** `201 Created`
**Save:** `data.order_code` (e.g. `ORD-20260412-X7K9P2`)

> ⚠️ Verify `data.total_amount = 270000.00`:
> Subtotal = 150,000 × 2 = 300,000
> SAVE10 = 10% → discount = 30,000
> Total = 270,000

---

#### Step 4: Look up order

```bash
curl -X POST http://localhost:8080/api/v1/orders/lookup \
  -H "Content-Type: application/json" \
  -d '{
    "order_code": "ORD-20260412-X7K9P2",
    "email": "customer@example.com"
  }'
```

**Expected:** `200 OK` with full order details matching what was created.

---

#### Step 5: Verify cart was cleared

```bash
curl -X GET http://localhost:8080/api/v1/cart \
  -H "Authorization: Bearer <customer_jwt_token>"
```

**Expected:** Cart `items` array is empty.

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "items": [],
    "total_amount": 0
  }
}
```

---

### Scenario 2 — Guest order flow

**Goal:** Verify a guest can place an order and have their session cart cleared.

#### Step 1: Add item to guest cart

```bash
curl -X POST http://localhost:8080/api/v1/cart \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: guest-session-abc123" \
  -d '{
    "variantId": 2,
    "quantity": 1
  }'
```

**Expected:** `200 OK`

---

#### Step 2: Create order as guest (no items in body — reads from cart by session_id)

```bash
curl -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: guest-session-abc123" \
  -d '{
    "email": "guest@example.com",
    "phone": "0987654321"
  }'
```

**Expected:** `201 Created`
**Verify:** `data.total_amount = 1200000.00`, no discount applied.

---

#### Step 3: Look up order

```bash
curl -X POST http://localhost:8080/api/v1/orders/lookup \
  -H "Content-Type: application/json" \
  -d '{
    "order_code": "<order_code_from_step_2>",
    "email": "guest@example.com"
  }'
```

**Expected:** `200 OK`

---

#### Step 4: Verify guest session cart was cleared

```bash
curl -X GET http://localhost:8080/api/v1/cart \
  -H "X-Session-ID: guest-session-abc123"
```

**Expected:** Cart `items` is empty.

---

### Scenario 3 — Price Snapshot security verification

**Goal:** Prove the backend always uses `product_variants.price` — the client has no way to influence pricing.

#### Step 1: Record the current DB price

```sql
SELECT id, name, price FROM product_variants WHERE id = 1;
-- Expected: id=1, name="1 Month Plan", price=150000.00
```

---

#### Step 2: Add item to cart and create order (no price field anywhere)

```bash
# Add to cart
curl -X POST http://localhost:8080/api/v1/cart \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <customer_jwt_token>" \
  -d '{ "variantId": 1, "quantity": 1 }'

# Create order — note: no price field in request body or cart item
curl -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <customer_jwt_token>" \
  -d '{
    "email": "security@example.com",
    "phone": "0901234567"
  }'
```

> ⚠️ Neither `OrderCreateRequest` nor `CartItem` has a `price` field. The backend always queries
> `product_variants.price` from the DB. There is no client-controlled price field anywhere in the flow.

**Expected:** `201 Created` with `items[0].price = 150000.00`

---

#### Step 3: Look up the order and verify price

```bash
curl -X POST http://localhost:8080/api/v1/orders/lookup \
  -H "Content-Type: application/json" \
  -d '{
    "order_code": "<order_code_from_step_2>",
    "email": "security@example.com"
  }'
```

**Verify in response:**
```json
"items": [
  {
    "variant_id": 1,
    "variant_name": "1 Month Plan",
    "product_name": "Microsoft Office 365",
    "quantity": 1,
    "price": 150000.00,
    "subtotal": 150000.00
  }
]
```

**Conclusion:** `price` = 150,000 — matches `product_variants.price` exactly. Price snapshot is working correctly.

---

## SECTION 5 — TEST CASE SUMMARY TABLE

| Test Case ID | Endpoint | Description | Condition | Expected Status |
|---|---|---|---|---|
| TC-ORD-001 | `POST /api/v1/orders` | Happy path — auth user + discount | Valid JWT, non-empty cart, valid `SAVE10` code | `201` |
| TC-ORD-002 | `POST /api/v1/orders` | Happy path — guest with session | No JWT, `X-Session-ID` present, non-empty session cart | `201` |
| TC-ORD-003 | `POST /api/v1/orders` | Missing email | No `email` field in body | `400` |
| TC-ORD-004 | `POST /api/v1/orders` | Invalid email format | `email: "not-an-email"` | `400` |
| TC-ORD-005 | `POST /api/v1/orders` | Cart is empty | Cart has no items for this user/session | `400` |
| TC-ORD-006 | `POST /api/v1/orders` | No identity provided | No JWT and no `X-Session-ID` | `400` |
| TC-ORD-007 | `POST /api/v1/orders` | Cart contains non-existent variant | `cart_items` references a deleted variant | `404` |
| TC-ORD-008 | `POST /api/v1/orders` | Discount code not found | `discountCode: "FAKECODE"` | `400` |
| TC-ORD-009 | `POST /api/v1/orders` | Expired discount code | `discountCode: "EXPIRED20"` | `400` |
| TC-ORD-010 | `POST /api/v1/orders` | Discount usage limit reached | `discountCode: "USED100"` | `400` |
| TC-ORD-011 | `POST /api/v1/orders` | Missing phone | No `phone` field | `400` |
| TC-LKP-001 | `POST /api/v1/orders/lookup` | Correct code + email | Valid `order_code`, matching `email` | `200` |
| TC-LKP-002 | `POST /api/v1/orders/lookup` | Order not found | Non-existent `order_code` | `404` |
| TC-LKP-003 | `POST /api/v1/orders/lookup` | Wrong email | Valid `order_code`, mismatched email | `403` |
| TC-LKP-004 | `POST /api/v1/orders/lookup` | Email case-insensitive | Email in uppercase | `200` |
| TC-ADM-001 | `GET /api/v1/admin/orders` | Get all orders | Admin token, no filters | `200` |
| TC-ADM-002 | `GET /api/v1/admin/orders` | Filter by status | `?status=PENDING`, admin token | `200` |
| TC-ADM-003 | `GET /api/v1/admin/orders` | Filter by date range | `?from=2026-04-12&to=2026-04-12` | `200` |
| TC-ADM-004 | `GET /api/v1/admin/orders` | Pagination | `?page=0&size=1` | `200` |
| TC-ADM-005 | `GET /api/v1/admin/orders` | No token | No `Authorization` header | `401` |
| TC-ADM-006 | `GET /api/v1/admin/orders` | Wrong role | Customer JWT (not ADMIN) | `403` |

---

## SECTION 6 — NOTES FOR FRONTEND DEVELOPERS

### 6.1 Token Management

- After a successful login (`POST /api/v1/auth/login`), save the token from `data.token`.
- Send it in every protected request as: `Authorization: Bearer <token>`
- Recommended storage: `localStorage` or `sessionStorage`. Do NOT store in cookies unless you implement CSRF protection.
- Token expiry is 24 hours (`86400000 ms`). Redirect to login when a `401` is received on a protected route.
- For the order creation endpoint (`POST /api/v1/orders`), the `Authorization` header is **optional**. Send it if the user is logged in; omit it for guest checkout.

### 6.2 Guest Session Management (X-Session-ID)

- For guest users, generate a UUID on first visit and store it in `localStorage`:
  ```javascript
  let sessionId = localStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('sessionId', sessionId);
  }
  ```
- Pass this as `X-Session-ID: <uuid>` on all cart and order requests for the guest.
- The session cart is cleared automatically when the guest places an order — you do not need to call the cart clear API manually after checkout.
- If the user later logs in, their guest session cart is NOT automatically merged (confirm with backend team when implementing cart merge).

### 6.3 Cart-First Checkout Flow

The checkout flow is now strictly **cart-first**:

```
Add to cart  →  Review cart  →  POST /orders (email + phone only)
```

The frontend must ensure items are in the cart before the order creation call.
If the cart is empty, the backend returns `400 "Cart is empty"`.

**Typical frontend checkout sequence:**
```javascript
// 1. Ensure items are in cart (via POST /cart)
// 2. Show checkout form (collect email, phone, optional discount code)
// 3. Submit order
const response = await fetch('/api/v1/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,  // omit if guest
    'X-Session-ID': sessionId,           // omit if authenticated
  },
  body: JSON.stringify({
    email: formEmail,
    phone: formPhone,
    discountCode: formDiscountCode || undefined,
  }),
});
```

### 6.4 Error Handling — User-Facing Messages

Map these error responses to user-friendly UI messages:

| API message | Suggested UI message |
|---|---|
| `"Email is required"` | "Please enter your email address." |
| `"Email must be a valid email address"` | "Please enter a valid email address." |
| `"Phone is required"` | "Please enter your phone number." |
| `"Cart is empty"` | "Your cart is empty. Please add items before placing an order." |
| `"Product variant not found: {id}"` | "One of the items in your cart is no longer available. Please refresh your cart." |
| `"Insufficient stock for variant ..."` | "Not enough stock available. Please reduce the quantity in your cart." |
| `"Product is no longer available for variant: ..."` | "One of the items in your cart has been discontinued." |
| `"Discount code not found or inactive"` | "This discount code is invalid." |
| `"Discount code has expired"` | "This discount code has expired." |
| `"Discount code usage limit has been reached"` | "This discount code is no longer available." |
| `"Order not found"` (404) | "We couldn't find that order. Please check the order code." |
| `"Access denied"` (403) | "The email address doesn't match this order." |

### 6.5 Price Security

There is **no price field** anywhere in the order creation flow — not in the cart item, not in the order request. Prices are always read directly from `product_variants.price` in the database at the moment the order is created. This cannot be bypassed by modifying request bodies.

### 6.6 PaginationResponse Structure (Admin Order List)

The admin list endpoint returns data inside a `PaginationResponse<OrderListResponse>` object:

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "items": [ ... ],
    "page_info": {
      "total_elements": 100,
      "total_pages": 5,
      "current_page": 0,
      "page_size": 20
    }
  }
}
```

| Field | Type | Description |
|---|---|---|
| `items` | `OrderListResponse[]` | Orders for the current page |
| `page_info.total_elements` | `number` | Total matching orders across all pages |
| `page_info.total_pages` | `number` | Total number of pages |
| `page_info.current_page` | `number` | Zero-based index of the current page |
| `page_info.page_size` | `number` | Number of items per page |

**Pagination query params:** `?page=0&size=20` (default). `page` is zero-based.

### 6.7 OrderStatus Values

The `status` field in `OrderResponse` and `OrderListResponse` can hold these values:

| Value | Meaning |
|---|---|
| `PENDING` | Order created, awaiting payment |
| `PAID` | Payment confirmed by gateway webhook |
| `PROCESSING` | Inventory allocation in progress |
| `COMPLETED` | All items delivered successfully |
| `PARTIALLY_COMPLETED` | Some items delivered; some out of stock |
| `PAID_PENDING_STOCK` | Payment received but all items are out of stock |
| `FAILED` | Payment explicitly failed |
| `EXPIRED` | Order not paid within 15 minutes (set by cron) |

**Frontend recommendation:** Poll or refresh the order lookup for `PENDING` and `PROCESSING` statuses until a terminal state (`COMPLETED`, `PARTIALLY_COMPLETED`, `PAID_PENDING_STOCK`, `FAILED`, `EXPIRED`) is reached.

### 6.8 Order Code Format

Order codes follow the format `ORD-{YYYYMMDD}-{6CHARS}` (e.g. `ORD-20260412-X7K9P2`). They are always unique. Display them prominently in the order confirmation UI and use them as the primary identifier for the order lookup form.

### 6.9 Email Normalization

Emails are stored in lowercase. When building the order lookup form, it is safe to send the email in any case — the backend normalizes to lowercase before comparison. However, for a consistent UX, consider normalizing the email input to lowercase on the frontend as well.
