# API Documentation — Warranty Module

**Version:** 1.0
**Base URL:** `http://localhost:8080`
**Base Path:** `/api/v1`

---

## Overview

The Warranty Module allows customers to submit claims for defective digital goods they have purchased, and allows admins to review and resolve those claims by automatically issuing a replacement inventory item.

### Key Behaviours

- **Non-blocking submit:** `POST /api/v1/warranty` saves the claim to the database and returns `201 Created` immediately. No background processing is triggered at this stage.
- **Non-blocking resolve:** `PUT /api/v1/admin/warranty/{id}/resolve` sets the status to `IN_PROGRESS`, records a log entry, and fires an `@Async` replacement allocation. The HTTP response returns `200 OK` before the allocation completes.
- **Automatic replacement:** The async allocation finds a new `AVAILABLE` inventory item for the same variant, marks the old item `REVOKED`, updates the delivery record in-place, and sets the warranty to `RESOLVED`. If stock is unavailable it transitions to `PENDING_STOCK`.
- **Full audit trail:** Every status change writes a `WarrantyLog` entry. Customer-triggered logs have `admin_id: null`; admin-triggered logs carry the admin's user ID; system-generated logs (async flow) also have `admin_id: null`.

---

## Enum Reference (Frontend)

### `WarrantyRequestStatus`

| Value | Meaning | UI Label suggestion |
|---|---|---|
| `OPEN` | Claim submitted, awaiting admin review | Pending Review |
| `IN_PROGRESS` | Admin has initiated resolution | Processing |
| `RESOLVED` | Replacement item issued successfully | Resolved |
| `PENDING_STOCK` | No stock available at resolution time; will retry when restocked | Awaiting Restock |

> **FE note:** Poll or display a status badge using the `status` field on `WarrantyResponse`. The `PENDING_STOCK` state does **not** auto-resolve — a second admin resolve call (or a restock hook in a future version) is required.

---

## Response Envelope

All endpoints return the standard `ApiResponse<T>` wrapper:

```json
{
  "code": 200,
  "message": "Success",
  "data": { }
}
```

Paginated endpoints wrap data in a `PaginationResponse<T>`:

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "items": [ ],
    "page_info": {
      "total_elements": 42,
      "total_pages": 3,
      "current_page": 0,
      "page_size": 20
    }
  }
}
```

Error responses:

```json
{
  "code": 400,
  "message": "An active warranty claim already exists for this order item",
  "errors": [
    { "field": "order_item_id", "message": "Duplicate active claim" }
  ]
}
```

---

## Customer APIs

### 1. Submit a Warranty Claim

**`POST /api/v1/warranty`**

Submits a new warranty claim for a purchased order item.

Accepts both authenticated users (JWT) and guest users (email in body).

When the caller is authenticated, `user_email` in the request body is **ignored** — the server derives the email from the JWT principal. For guest callers, `user_email` is **required**.

#### Headers

| Header | Required | Description |
|---|---|---|
| `Authorization` | No (optional) | `Bearer <token>` — omit for guest claim |
| `Content-Type` | Yes | `application/json` |

#### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `order_item_id` | `Long` | **Yes** | ID of the purchased order item under warranty |
| `user_email` | `String` | **Guest only** | Contact email — required when no JWT is provided |
| `description` | `String` | **Yes** | Detailed description of the defect or issue |

**Authenticated user example:**

```json
{
  "order_item_id": 17,
  "description": "The activation key was already used and cannot be redeemed."
}
```

**Guest user example:**

```json
{
  "order_item_id": 17,
  "user_email": "john.doe@example.com",
  "description": "The activation key was already used and cannot be redeemed."
}
```

#### Success Response — `201 Created`

```json
{
  "code": 201,
  "message": "Created",
  "data": {
    "id": 5,
    "order_item_id": 17,
    "product_name": "Netflix Premium",
    "variant_name": "1 Month",
    "order_code": "ORD-20260425-K3P9X1",
    "user_id": 42,
    "user_email": "john.doe@example.com",
    "description": "The activation key was already used and cannot be redeemed.",
    "status": "OPEN",
    "logs": [
      {
        "id": 1,
        "admin_id": null,
        "action": "Customer submitted warranty claim: The activation key was already used and cannot be redeemed.",
        "created_at": "2026-04-25T14:30:00"
      }
    ],
    "created_at": "2026-04-25T14:30:00",
    "updated_at": "2026-04-25T14:30:00"
  }
}
```

#### Error Responses

| HTTP | `code` | Scenario |
|---|---|---|
| `400` | 400 | `order_item_id` missing or invalid |
| `400` | 400 | `description` is blank |
| `400` | 400 | `user_email` missing for guest caller |
| `400` | 400 | Active claim already exists for this order item |
| `403` | 403 | Authenticated user does not own the order item |
| `403` | 403 | Guest email does not match the order's email |
| `404` | 404 | `order_item_id` does not exist |

---

### 2. List My Warranty Claims

**`GET /api/v1/warranty`**

Returns a paginated list of all warranty claims belonging to the authenticated user, sorted by `created_at` descending.

#### Headers

| Header | Required | Description |
|---|---|---|
| `Authorization` | **Yes** | `Bearer <token>` — JWT required |

#### Query Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | `int` | `0` | Zero-based page index |
| `size` | `int` | `20` | Number of items per page |

#### Example Request

```
GET /api/v1/warranty?page=0&size=10
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

#### Success Response — `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "items": [
      {
        "id": 5,
        "order_item_id": 17,
        "product_name": "Netflix Premium",
        "variant_name": "1 Month",
        "order_code": "ORD-20260425-K3P9X1",
        "user_id": 42,
        "user_email": "john.doe@example.com",
        "description": "The activation key was already used and cannot be redeemed.",
        "status": "OPEN",
        "logs": [
          {
            "id": 1,
            "admin_id": null,
            "action": "Customer submitted warranty claim: The activation key was already used and cannot be redeemed.",
            "created_at": "2026-04-25T14:30:00"
          }
        ],
        "created_at": "2026-04-25T14:30:00",
        "updated_at": "2026-04-25T14:30:00"
      }
    ],
    "page_info": {
      "total_elements": 1,
      "total_pages": 1,
      "current_page": 0,
      "page_size": 10
    }
  }
}
```

#### Error Responses

| HTTP | `code` | Scenario |
|---|---|---|
| `400` | 400 | No JWT provided (Authorization header missing) |
| `401` | 401 | Invalid or expired JWT |

---

## Admin APIs

> All `/api/v1/admin/warranty` endpoints require:
> - `Authorization: Bearer <admin-token>`
> - The authenticated user must have role `ADMIN`
>
> Requests from non-admin users are rejected with `403 Forbidden`.

---

### 3. List All Warranty Tickets (Admin)

**`GET /api/v1/admin/warranty`**

Returns a paginated list of all warranty requests across all customers. Optionally filtered by status.

#### Headers

| Header | Required | Description |
|---|---|---|
| `Authorization` | **Yes** | `Bearer <admin-token>` |

#### Query Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | `int` | `0` | Zero-based page index |
| `size` | `int` | `20` | Number of items per page |
| `status` | `String` | *(none — all statuses)* | Filter by `WarrantyRequestStatus` value |

Valid `status` filter values: `OPEN`, `IN_PROGRESS`, `RESOLVED`, `PENDING_STOCK`

#### Example Requests

```
GET /api/v1/admin/warranty?page=0&size=20
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

```
GET /api/v1/admin/warranty?status=OPEN&page=0&size=50
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

#### Success Response — `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "items": [
      {
        "id": 5,
        "order_item_id": 17,
        "product_name": "Netflix Premium",
        "variant_name": "1 Month",
        "order_code": "ORD-20260425-K3P9X1",
        "user_id": 42,
        "user_email": "john.doe@example.com",
        "description": "The activation key was already used and cannot be redeemed.",
        "status": "OPEN",
        "logs": [
          {
            "id": 1,
            "admin_id": null,
            "action": "Customer submitted warranty claim: The activation key was already used and cannot be redeemed.",
            "created_at": "2026-04-25T14:30:00"
          }
        ],
        "created_at": "2026-04-25T14:30:00",
        "updated_at": "2026-04-25T14:30:00"
      },
      {
        "id": 3,
        "order_item_id": 9,
        "product_name": "Spotify Premium",
        "variant_name": "3 Months",
        "order_code": "ORD-20260420-R8T2L5",
        "user_id": null,
        "user_email": "guest@example.com",
        "description": "Account credentials are invalid.",
        "status": "PENDING_STOCK",
        "logs": [
          {
            "id": 4,
            "admin_id": null,
            "action": "Customer submitted warranty claim: Account credentials are invalid.",
            "created_at": "2026-04-20T09:15:00"
          },
          {
            "id": 5,
            "admin_id": 1,
            "action": "Admin initiated resolution",
            "created_at": "2026-04-21T11:00:00"
          },
          {
            "id": 6,
            "admin_id": null,
            "action": "System: out of stock — pending restock",
            "created_at": "2026-04-21T11:00:02"
          }
        ],
        "created_at": "2026-04-20T09:15:00",
        "updated_at": "2026-04-21T11:00:02"
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

#### Error Responses

| HTTP | `code` | Scenario |
|---|---|---|
| `400` | 400 | Invalid `status` filter value |
| `401` | 401 | Missing or invalid JWT |
| `403` | 403 | Caller is not an ADMIN |

---

### 4. Resolve a Warranty Claim (Admin)

**`PUT /api/v1/admin/warranty/{id}/resolve`**

Triggers the warranty resolution workflow for the given warranty request.

**This endpoint is non-blocking.** It returns `200 OK` immediately after:
1. Setting the warranty status to `IN_PROGRESS`
2. Writing an admin log entry

The actual inventory replacement runs asynchronously:
- If stock is available → status transitions to `RESOLVED`, delivery record is updated with the new item
- If no stock → status transitions to `PENDING_STOCK`, admin is notified

Call `GET /api/v1/admin/warranty?status=RESOLVED` a moment later to confirm completion.

#### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `Long` | ID of the warranty request to resolve |

#### Headers

| Header | Required | Description |
|---|---|---|
| `Authorization` | **Yes** | `Bearer <admin-token>` |
| `Content-Type` | No | `application/json` — required only if sending a body |

#### Request Body

The request body is **entirely optional**. If omitted, the endpoint still triggers resolution with no admin note.

| Field | Type | Required | Description |
|---|---|---|---|
| `notes` | `String` | No | Optional admin commentary appended to the warranty log |

**With notes:**

```json
{
  "notes": "Verified the key was already redeemed. Approved for replacement."
}
```

**Without body** — send an empty body or omit `Content-Type`:

```json
{}
```

#### Success Response — `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": "Warranty resolution initiated"
}
```

> The warranty status at this point is `IN_PROGRESS`. Poll `GET /api/v1/admin/warranty` to observe the final transition to `RESOLVED` or `PENDING_STOCK`.

#### Error Responses

| HTTP | `code` | Scenario |
|---|---|---|
| `400` | 400 | Warranty is already in `RESOLVED` status |
| `401` | 401 | Missing or invalid JWT |
| `403` | 403 | Caller is not an ADMIN |
| `404` | 404 | Warranty request with given `id` not found |

---

## Async Resolution — State Transitions

```
[Customer]
  POST /api/v1/warranty
    → status: OPEN
    → log: "Customer submitted warranty claim: ..."

[Admin]
  PUT /api/v1/admin/warranty/{id}/resolve
    → status: IN_PROGRESS               (synchronous — committed before 200 OK)
    → log: "Admin initiated resolution — Notes: ..."

[System — async, after resolve returns]
  CASE: Stock available
    → old inventory_item.status = REVOKED
    → new inventory_item.status = SOLD
    → delivery.inventory_item_id      = new item  (credential updated in-place)
    → status: RESOLVED
    → log: "System: replacement key allocated successfully. New inventory item id=..."

  CASE: Out of stock
    → status: PENDING_STOCK
    → log: "System: out of stock — pending restock"
```

> **FE note:** After calling resolve, do not assume the status is `RESOLVED` immediately. Display `IN_PROGRESS` and poll or refresh until the final status arrives.

---

## Field Reference

### `WarrantyResponse`

| JSON Field | Type | Nullable | Description |
|---|---|---|---|
| `id` | `Long` | No | Warranty request ID |
| `order_item_id` | `Long` | No | The order line under warranty |
| `product_name` | `String` | Yes | Product name (denormalised for display) |
| `variant_name` | `String` | Yes | Variant name (e.g. "1 Month") |
| `order_code` | `String` | Yes | Human-readable order code (e.g. `ORD-20260425-K3P9X1`) |
| `user_id` | `Long` | Yes | Null for guest-originated warranty claims |
| `user_email` | `String` | No | Lowercase email. Plain `=` comparison used internally |
| `description` | `String` | No | Customer-provided problem description |
| `status` | `WarrantyRequestStatus` | No | Current status — see Enum Reference above |
| `logs` | `List<WarrantyLogResponse>` | No | Full ordered audit trail (oldest first) |
| `created_at` | `LocalDateTime` | No | ISO-8601 timestamp of claim submission |
| `updated_at` | `LocalDateTime` | No | ISO-8601 timestamp of last status change |

### `WarrantyLogResponse`

| JSON Field | Type | Nullable | Description |
|---|---|---|---|
| `id` | `Long` | No | Log entry ID |
| `admin_id` | `Long` | Yes | ID of admin who acted. `null` = customer or system action |
| `action` | `String` | No | Human-readable action description |
| `created_at` | `LocalDateTime` | No | ISO-8601 timestamp of log entry |

---

## Postman Testing Workflow

The following steps reproduce a complete warranty cycle end-to-end.

### Prerequisites

Before running this flow you need:
- A completed order with at least one delivered item (order status `COMPLETED`)
- The `order_item_id` from that order (visible in the order lookup response)
- A customer account JWT and an admin account JWT

---

### Step 1 — Login as Customer

**Request:**

```
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "secret123"
}
```

**Extract:** `data.token` → save as Postman variable `{{customer_token}}`

---

### Step 2 — Lookup Order to Find `order_item_id`

**Request:**

```
POST /api/v1/orders/lookup
Content-Type: application/json

{
  "order_code": "ORD-20260425-K3P9X1",
  "email": "customer@example.com"
}
```

**Extract:** `data.items[0].id` → save as Postman variable `{{order_item_id}}`

---

### Step 3 — Submit Warranty Claim

**Request:**

```
POST /api/v1/warranty
Authorization: Bearer {{customer_token}}
Content-Type: application/json

{
  "order_item_id": {{order_item_id}},
  "description": "The activation key was already used and cannot be redeemed."
}
```

**Expected:** `201 Created`, `data.status = "OPEN"`

**Extract:** `data.id` → save as Postman variable `{{warranty_id}}`

---

### Step 4 — Verify Claim Appears in Customer List

**Request:**

```
GET /api/v1/warranty?page=0&size=10
Authorization: Bearer {{customer_token}}
```

**Expected:** `data.items[0].status = "OPEN"`, `data.items[0].id = {{warranty_id}}`

---

### Step 5 — Login as Admin

**Request:**

```
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@augustdigital.com",
  "password": "adminSecret"
}
```

**Extract:** `data.token` → save as Postman variable `{{admin_token}}`

---

### Step 6 — Admin: View All Open Tickets

**Request:**

```
GET /api/v1/admin/warranty?status=OPEN&page=0&size=20
Authorization: Bearer {{admin_token}}
```

**Expected:** The claim from Step 3 appears with `status = "OPEN"`

---

### Step 7 — Admin: Resolve the Warranty Claim

**Request:**

```
PUT /api/v1/admin/warranty/{{warranty_id}}/resolve
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "notes": "Verified the key was already redeemed. Approved for replacement."
}
```

**Expected:** `200 OK`, `data = "Warranty resolution initiated"`

> The server returns immediately. The async replacement runs in the background.

---

### Step 8 — Poll Until Status Is Final

Wait ~1–2 seconds, then check:

**Request:**

```
GET /api/v1/admin/warranty?status=RESOLVED&page=0&size=20
Authorization: Bearer {{admin_token}}
```

**Expected (stock available):**

```json
{
  "data": {
    "items": [
      {
        "id": 5,
        "status": "RESOLVED",
        "logs": [
          { "admin_id": null,  "action": "Customer submitted warranty claim: ..." },
          { "admin_id": 1,     "action": "Admin initiated resolution — Notes: Verified the key was already redeemed. Approved for replacement." },
          { "admin_id": null,  "action": "System: replacement key allocated successfully. New inventory item id=88" }
        ]
      }
    ]
  }
}
```

**Expected (no stock):** `status = "PENDING_STOCK"` with the last log entry reading `"System: out of stock — pending restock"`

---

### Step 9 — Verify Replacement via Order Lookup

The delivery record is updated in-place — the `inventory_item_id` FK now points to the new item. Calling the order lookup endpoint returns the **new** credential automatically, without any change to the API call.

**Request:**

```
POST /api/v1/orders/lookup
Content-Type: application/json

{
  "order_code": "ORD-20260425-K3P9X1",
  "email": "customer@example.com"
}
```

**Expected:** The decrypted credential in the response belongs to the **newly allocated** inventory item.

---

## Security Notes

| Concern | Implementation |
|---|---|
| Ownership check | Authenticated: `user_id` from JWT must match `orders.user_id`. Guest: email (lowercase) must match `orders.email` using plain `=` |
| Guest email | Stored and compared lowercase — no `ILIKE` or `LOWER()` needed |
| Duplicate claim guard | `existsActiveClaimForOrderItem()` prevents two open claims for the same order item |
| Admin endpoint access | `@PreAuthorize("hasRole('ADMIN')")` on `AdminWarrantyController` — enforced by Spring Security before the method is called |
| Delivered credential | Never duplicated in `deliveries` table. Always read via `inventory_item_id → inventory_items.data_encrypted` at query time. Replacement only requires updating the FK. |
