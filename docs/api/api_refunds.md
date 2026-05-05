# API DOCUMENTATION — REFUNDS MODULE
**Version:** 1.0
**Last updated:** 2026-04-26
**Base URL:** `http://localhost:8080`

---

## 1. OVERVIEW

The Refunds module lets admins record and process monetary refunds for paid orders (e.g., an order expired before delivery, or a customer dispute was resolved). Customers can view their own refund history.

| Actor | Capability |
|---|---|
| **Admin** | Create refund records, approve or reject them |
| **Customer** | View their own refund history (read-only) |

**Refund lifecycle:**

```
PENDING  →  PROCESSED   (admin approved, money returned)
         →  REJECTED    (admin denied the request)
```

---

## 2. ENUMS

### `RefundStatus`

| Value | Meaning |
|---|---|
| `PENDING` | Refund record created, awaiting admin action |
| `PROCESSED` | Admin approved — refund has been issued |
| `REJECTED` | Admin denied — refund will not be issued |

> **Frontend note:** Use this enum to drive status badge colour in your UI:
> - `PENDING` → yellow / warning
> - `PROCESSED` → green / success
> - `REJECTED` → red / error

---

## 3. ADMIN ENDPOINTS

All `/api/v1/admin/**` routes require an `Authorization: Bearer <token>` header where the token belongs to a user with role `ADMIN`. The backend derives `admin_id` automatically from the token — do **not** send it in the request body.

---

### 3.1 Create Refund

Creates a new refund record in `PENDING` status for a paid order. The backend automatically locates the `SUCCESS` payment for the given order. Only one `PENDING` refund may exist per order at a time — attempting to create a second will return `400 Bad Request`.

**`POST /api/v1/admin/refunds`**

#### Headers

| Key | Value |
|---|---|
| `Authorization` | `Bearer <admin_token>` |
| `Content-Type` | `application/json` |

#### Request Body

```json
{
  "order_id": 42,
  "amount": 250000.00,
  "reason": "Order expired before delivery; payment received from gateway."
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `order_id` | `number` | Yes | Must reference an existing order with a SUCCESS payment |
| `amount` | `number` | Yes | Must be > 0 |
| `reason` | `string` | Yes | Non-blank |

> **Note:** Jackson serialises Java `Long orderId` → `"orderId"` by default. The Spring Boot project uses the standard Jackson config, so the JSON key is **`orderId`** (camelCase), not `order_id`. Use the exact key names shown — these match the DTO field names.

#### Success Response — `201 Created`

```json
{
  "code": 201,
  "message": "Created successfully",
  "data": {
    "id": 7,
    "orderId": 42,
    "orderCode": "ORD-20260425-K3P9X1",
    "amount": 250000.00,
    "reason": "Order expired before delivery; payment received from gateway.",
    "status": "PENDING",
    "adminId": 1,
    "notes": null,
    "resolvedAt": null,
    "createdAt": "2026-04-26T10:15:00",
    "updatedAt": "2026-04-26T10:15:00"
  }
}
```

#### Error Responses

| HTTP | Scenario |
|---|---|
| `400` | No SUCCESS payment found for the order |
| `400` | A PENDING refund already exists for the order |
| `404` | Order not found |
| `401` | Missing or invalid JWT |
| `403` | JWT belongs to a CUSTOMER role |

---

### 3.2 Process Refund

Transitions a `PENDING` refund to `PROCESSED` or `REJECTED`. Calling this on an already-processed/rejected refund returns `400 Bad Request`.

**`PUT /api/v1/admin/refunds/{id}/process`**

#### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `number` | Refund ID |

#### Headers

| Key | Value |
|---|---|
| `Authorization` | `Bearer <admin_token>` |
| `Content-Type` | `application/json` |

#### Request Body — Approve

```json
{
  "status": "PROCESSED",
  "notes": "Refund transferred via bank transfer on 2026-04-26."
}
```

#### Request Body — Reject

```json
{
  "status": "REJECTED",
  "notes": "Order was delivered successfully — refund not applicable."
}
```

| Field | Type | Required | Allowed values |
|---|---|---|---|
| `status` | `string` | Yes | `PROCESSED` or `REJECTED` only — sending `PENDING` returns 400 |
| `notes` | `string` | No | Free text, max 512 chars |

#### Success Response — `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "id": 7,
    "orderId": 42,
    "orderCode": "ORD-20260425-K3P9X1",
    "amount": 250000.00,
    "reason": "Order expired before delivery; payment received from gateway.",
    "status": "PROCESSED",
    "adminId": 1,
    "notes": "Refund transferred via bank transfer on 2026-04-26.",
    "resolvedAt": "2026-04-26T14:30:00",
    "createdAt": "2026-04-26T10:15:00",
    "updatedAt": "2026-04-26T14:30:00"
  }
}
```

#### Error Responses

| HTTP | Scenario |
|---|---|
| `400` | Refund is not in PENDING status |
| `400` | `status` field is `PENDING` |
| `404` | Refund not found |
| `401` | Missing or invalid JWT |
| `403` | JWT belongs to a CUSTOMER role |

---

## 4. CUSTOMER ENDPOINT

Requires `Authorization: Bearer <token>` for any valid authenticated user (CUSTOMER or ADMIN role accepted). The backend identifies the caller from the token — no `user_id` field in the request.

---

### 4.1 Get My Refunds

Returns a paginated list of refunds linked to orders placed by the authenticated user, sorted by `created_at` descending (newest first).

**`GET /api/v1/refunds/my-refunds`**

#### Headers

| Key | Value |
|---|---|
| `Authorization` | `Bearer <customer_token>` |

#### Query Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | `number` | `0` | Zero-based page index |
| `size` | `number` | `20` | Items per page |

#### Success Response — `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "items": [
      {
        "id": 7,
        "orderId": 42,
        "orderCode": "ORD-20260425-K3P9X1",
        "amount": 250000.00,
        "reason": "Order expired before delivery; payment received from gateway.",
        "status": "PROCESSED",
        "adminId": 1,
        "notes": "Refund transferred via bank transfer on 2026-04-26.",
        "resolvedAt": "2026-04-26T14:30:00",
        "createdAt": "2026-04-26T10:15:00",
        "updatedAt": "2026-04-26T14:30:00"
      }
    ],
    "page_info": {
      "total_elements": 1,
      "total_pages": 1,
      "current_page": 0,
      "page_size": 20
    }
  }
}
```

#### Error Responses

| HTTP | Scenario |
|---|---|
| `401` | Missing or invalid JWT |

---

## 5. POSTMAN TESTING WORKFLOW

Complete lifecycle test — follow these steps in order.

### Step 1 — Authenticate as Admin

```
POST http://localhost:8080/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@augustdigital.com",
  "password": "your_admin_password"
}
```

Copy the `token` from the response. Set it as the Postman collection variable `{{admin_token}}`.

---

### Step 2 — Authenticate as Customer

```
POST http://localhost:8080/api/v1/auth/login
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "your_customer_password"
}
```

Copy the `token`. Set it as `{{customer_token}}`.

---

### Step 3 — Identify a Paid Order

Use an order that has an `orderCode` and a `SUCCESS` payment. Note the order's numeric `id` — you'll need it as `orderId` in Step 4.

---

### Step 4 — Create a Refund (Admin)

```
POST http://localhost:8080/api/v1/admin/refunds
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "orderId": 42,
  "amount": 250000.00,
  "reason": "Test refund — order expired before delivery."
}
```

Copy the `id` from the response (`data.id`). Set it as `{{refund_id}}`.

**Verify:** `data.status` is `"PENDING"`.

---

### Step 5 — Customer Views Their Refunds

```
GET http://localhost:8080/api/v1/refunds/my-refunds?page=0&size=20
Authorization: Bearer {{customer_token}}
```

**Verify:** The refund created in Step 4 appears with `status: "PENDING"`.

---

### Step 6 — Process the Refund (Admin — Approve)

```
PUT http://localhost:8080/api/v1/admin/refunds/{{refund_id}}/process
Authorization: Bearer {{admin_token}}
Content-Type: application/json

{
  "status": "PROCESSED",
  "notes": "Refund issued via bank transfer."
}
```

**Verify:** `data.status` is `"PROCESSED"`, `data.resolved_at` is populated.

---

### Step 7 — Attempt to Process Again (Error Case)

Repeat Step 6 with the same `{{refund_id}}`.

**Verify:** `400 Bad Request` — `"Refund is already PROCESSED"`.

---

### Step 8 — Test Reject Path (New Refund)

Create a second refund (Step 4 with a different order), then process it with `"status": "REJECTED"`.

**Verify:** `data.status` is `"REJECTED"`, `data.notes` contains your rejection message.

---

## 6. FRONTEND INTEGRATION NOTES (NEXT.JS)

### 6.1 TypeScript Types

```typescript
export type RefundStatus = 'PENDING' | 'PROCESSED' | 'REJECTED';
export type AppNotificationType = 'ORDER' | 'WARRANTY' | 'SYSTEM';

export interface RefundResponse {
  id: number;
  orderId: number;
  orderCode: string;
  amount: number;
  reason: string;
  status: RefundStatus;
  adminId: number | null;
  notes: string | null;
  resolvedAt: string | null;   // ISO-8601 datetime, null if still PENDING
  createdAt: string;
  updatedAt: string;
}
```

### 6.2 Pagination

The `data` wrapper for paginated endpoints is `PaginationResponse<T>`:

```typescript
interface PageInfo {
  total_elements: number;
  total_pages: number;
  current_page: number;   // zero-based
  page_size: number;
}

interface PaginationResponse<T> {
  items: T[];
  page_info: PageInfo;
}
```

Pass `page` (0-based) and `size` as query params:

```typescript
// Next.js example — fetch page 2 with 10 items
const res = await fetch(
  `/api/v1/refunds/my-refunds?page=1&size=10`,
  { headers: { Authorization: `Bearer ${token}` } }
);
const json = await res.json();
const refunds: RefundResponse[] = json.data.items;
const totalPages: number = json.data.page_info.total_pages;
```

### 6.3 Status Badge Helper

```typescript
export const refundStatusConfig: Record<RefundStatus, { label: string; color: string }> = {
  PENDING:   { label: 'Pending',   color: 'yellow' },
  PROCESSED: { label: 'Processed', color: 'green'  },
  REJECTED:  { label: 'Rejected',  color: 'red'    },
};
```

### 6.4 Amount Formatting

`amount` is returned as a plain JSON `number` (e.g. `250000.00`). Format it with:

```typescript
const formatted = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
}).format(refund.amount);
```

### 6.5 Null Fields

`adminId`, `notes`, and `resolvedAt` are `null` while the refund is `PENDING`. Guard before rendering:

```typescript
{refund.resolvedAt && <p>Resolved: {new Date(refund.resolvedAt).toLocaleDateString()}</p>}
```
