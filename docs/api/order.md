# API Documentation — Order Module

**Base URL:** `http://localhost:8080`
**Updated:** 2026-05-03

---

## Known Gotchas

| # | Gotcha | Detail |
|---|--------|--------|
| 1 | **Request body is camelCase, response is snake_case** | `OrderCreateRequest` and `BuyNowRequest` have NO `@JsonProperty` — send camelCase (`email`, `phone`, `discountCode`, `variantId`). `OrderResponse` and `OrderItemResponse` USE `@JsonProperty` — you receive snake_case (`order_code`, `total_amount`, `created_at`). |
| 2 | **Lookup body uses raw `order_code` key** | `POST /orders/lookup` accepts `Map<String, String>` — the JSON body keys are literal strings `"order_code"` and `"email"`. Both are required. |
| 3 | **`credentials` absent except on lookup** | `OrderItemResponse.credentials` is `@JsonInclude(NON_NULL)`. It appears ONLY in `/orders/lookup` responses — never in create or admin list responses. |
| 4 | **`profile_name` absent for INSTANT_DIRECT** | `OrderItemResponse.profile_name` is `@JsonInclude(NON_NULL)`. Present only for `INSTANT_SHARED` deliveries (shared account profiles). Absent for key-based (`INSTANT_DIRECT`) deliveries. |
| 5 | **Admin page param is 0-based** | `GET /api/v1/admin/orders?page=0` = first page. This is the OPPOSITE of `GET /api/v1/products?page=1` (1-based). |
| 6 | **POST create returns `201`, lookup returns `200`** | `POST /orders` and `POST /orders/buy-now` → `201 Created`. `POST /orders/lookup` → `200 OK`. |
| 7 | **Order code format** | `ORD-YYYYMMDD-XXXXXX` (e.g. `ORD-20260503-X7K9P2`). Treat as opaque string. Do NOT parse the date from it. |
| 8 | **Discount code is camelCase** | Send `discountCode` in the request body — not `discount_code`. |
| 9 | **Identity required for cart-based order creation** | `POST /orders` loads the cart via JWT email OR `X-Session-ID` header. If neither resolves a valid cart → `400 Bad Request`. |

---

## Raw API Types (exact JSON shape from backend)

```typescript
// OrderResponse — returned by POST /orders, POST /orders/buy-now, POST /orders/lookup
interface OrderResponseApi {
  order_code: string;         // e.g. "ORD-20260503-X7K9P2"
  status: OrderStatus;        // see enum below
  total_amount: number;       // BigDecimal as number
  email: string;
  phone: string;
  created_at: string;         // ISO 8601 — no timezone suffix e.g. "2026-05-03T14:30:00"
  items: OrderItemResponseApi[];
}

interface OrderItemResponseApi {
  variant_id: number;
  variant_name: string;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
  credentials?: string[];     // absent unless from /orders/lookup; one entry per unit
  profile_name?: string;      // absent unless INSTANT_SHARED delivery
}

// OrderListResponse — returned by GET /api/v1/admin/orders (admin only)
interface OrderListResponseApi {
  id: number;
  order_code: string;
  email: string;
  phone: string;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
}

// PaginatedOrderListApi — wraps OrderListResponseApi in admin endpoint
interface PaginatedOrderApi {
  items: OrderListResponseApi[];
  page_info: {
    total_elements: number;
    total_pages: number;
    current_page: number;  // 0-based (Spring Data)
    page_size: number;
  };
}

// Request bodies (sent TO the API)

// POST /api/v1/orders — all camelCase, no @JsonProperty
interface OrderCreateRequestApi {
  email: string;          // required, valid email
  phone: string;          // required
  discountCode?: string;  // optional
}

// POST /api/v1/orders/buy-now — all camelCase, no @JsonProperty
interface BuyNowRequestApi {
  variantId: number;      // required
  quantity: number;       // required, min 1
  email: string;          // required, valid email
  phone: string;          // required
  discountCode?: string;  // optional
}

// POST /api/v1/orders/lookup — plain Map body
interface OrderLookupRequestApi {
  order_code: string;     // exact literal key name
  email: string;
}
```

---

## Order Status Enum

```typescript
type OrderStatus =
  | "PENDING"              // order created, awaiting payment
  | "PAID"                 // payment confirmed, inventory allocation in progress
  | "PROCESSING"           // inventory being allocated
  | "COMPLETED"            // all items delivered successfully
  | "PARTIALLY_COMPLETED"  // some items delivered; some could not be allocated
  | "PAID_PENDING_STOCK"   // paid but out of stock — waiting for restock
  | "FAILED"               // payment explicitly failed
  | "EXPIRED";             // PENDING for >15 minutes with no payment (set by cron)
```

### Status Flow

```
PENDING ──► PAID ──► PROCESSING ──► COMPLETED
                                 ──► PARTIALLY_COMPLETED
                                 ──► PAID_PENDING_STOCK
        ──► FAILED   (payment explicitly failed)
        ──► EXPIRED  (cron, 15 min timeout)
```

**Frontend display rules:**

| Status | User-visible label | Action |
|--------|--------------------|--------|
| `PENDING` | "Awaiting payment" | Show payment button or "waiting..." |
| `PAID` | "Payment received" | Show loading / "preparing your items" |
| `PROCESSING` | "Processing" | Show loading |
| `COMPLETED` | "Delivered" | Show credentials (via lookup) |
| `PARTIALLY_COMPLETED` | "Partially delivered" | Show partial credentials |
| `PAID_PENDING_STOCK` | "Out of stock — will deliver when restocked" | Show waiting message |
| `FAILED` | "Payment failed" | Offer retry or contact support |
| `EXPIRED` | "Order expired" | Redirect to cart; create new order |

---

## Frontend Types (camelCase, normalized)

```typescript
interface OrderItem {
  variantId: number;
  variantName: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
  credentials: string[] | null;   // null unless from /orders/lookup
  profileName: string | null;     // null unless INSTANT_SHARED delivery
}

interface Order {
  orderCode: string;
  status: OrderStatus;
  totalAmount: number;
  email: string;
  phone: string;
  createdAt: string;
  items: OrderItem[];
}

interface OrderListItem {
  id: number;
  orderCode: string;
  email: string;
  phone: string;
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

interface PageInfo {
  totalElements: number;
  totalPages: number;
  currentPage: number;  // normalized: current_page + 1 (1-based for display)
  pageSize: number;
}

interface PaginatedOrders {
  items: OrderListItem[];
  pageInfo: PageInfo;
}
```

---

## Normalizer Functions

```typescript
function normalizeOrderItem(item: OrderItemResponseApi): OrderItem {
  return {
    variantId: item.variant_id,
    variantName: item.variant_name,
    productName: item.product_name,
    quantity: item.quantity,
    price: item.price,
    subtotal: item.subtotal,
    credentials: item.credentials ?? null,
    profileName: item.profile_name ?? null,
  };
}

function normalizeOrder(o: OrderResponseApi): Order {
  return {
    orderCode: o.order_code,
    status: o.status,
    totalAmount: o.total_amount,
    email: o.email,
    phone: o.phone,
    createdAt: o.created_at,
    items: o.items.map(normalizeOrderItem),
  };
}

function normalizeOrderListItem(o: OrderListResponseApi): OrderListItem {
  return {
    id: o.id,
    orderCode: o.order_code,
    email: o.email,
    phone: o.phone,
    totalAmount: o.total_amount,
    status: o.status,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
  };
}

function normalizeAdminOrders(data: PaginatedOrderApi): PaginatedOrders {
  return {
    items: data.items.map(normalizeOrderListItem),
    pageInfo: {
      totalElements: data.page_info.total_elements,
      totalPages: data.page_info.total_pages,
      currentPage: data.page_info.current_page + 1,  // 0-based → 1-based
      pageSize: data.page_info.page_size,
    },
  };
}
```

---

## Zod Schemas

```typescript
import { z } from "zod";

const OrderStatusEnum = z.enum([
  "PENDING", "PAID", "PROCESSING", "COMPLETED",
  "PARTIALLY_COMPLETED", "PAID_PENDING_STOCK", "FAILED", "EXPIRED",
]);

// Request schemas
export const OrderCreateSchema = z.object({
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone is required"),
  discountCode: z.string().optional(),
});

export const BuyNowSchema = z.object({
  variantId: z.number().int().positive(),
  quantity: z.number().int().min(1),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone is required"),
  discountCode: z.string().optional(),
});

export const OrderLookupSchema = z.object({
  order_code: z.string().min(1, "Order code is required"),
  email: z.string().email("Invalid email address"),
});

// Response schemas
export const OrderItemSchema = z.object({
  variantId: z.number(),
  variantName: z.string(),
  productName: z.string(),
  quantity: z.number(),
  price: z.number(),
  subtotal: z.number(),
  credentials: z.array(z.string()).nullable(),
  profileName: z.string().nullable(),
});

export const OrderSchema = z.object({
  orderCode: z.string(),
  status: OrderStatusEnum,
  totalAmount: z.number(),
  email: z.string(),
  phone: z.string(),
  createdAt: z.string(),
  items: z.array(OrderItemSchema),
});

export type OrderCreateInput = z.infer<typeof OrderCreateSchema>;
export type BuyNowInput = z.infer<typeof BuyNowSchema>;
export type Order = z.infer<typeof OrderSchema>;
```

---

## POST /api/v1/orders

Creates an order from the current cart.

**Authentication:** JWT (`Authorization: Bearer <token>`) OR `X-Session-ID` header
**HTTP Status on success:** `201 Created`

### Request Body

```json
{
  "email": "customer@example.com",
  "phone": "0901234567",
  "discountCode": "SAVE10"
}
```

> All fields are **camelCase** — no `@JsonProperty` on `OrderCreateRequest`.
> `discountCode` is optional — omit entirely if not used.

### Full Response Snapshot — `201 Created`

```json
{
  "code": 201,
  "message": "Created",
  "data": {
    "order_code": "ORD-20260503-X7K9P2",
    "status": "PENDING",
    "total_amount": 197000,
    "email": "customer@example.com",
    "phone": "0901234567",
    "created_at": "2026-05-03T14:30:00",
    "items": [
      {
        "variant_id": 5,
        "variant_name": "1 Month",
        "product_name": "Spotify Premium",
        "quantity": 2,
        "price": 59000,
        "subtotal": 118000
      },
      {
        "variant_id": 11,
        "variant_name": "1 Month",
        "product_name": "YouTube Premium",
        "quantity": 1,
        "price": 79000,
        "subtotal": 79000
      }
    ]
  }
}
```

> `credentials` and `profile_name` are absent from all items — only present in `/orders/lookup` response.

### Error Responses

| Code | Condition |
|------|-----------|
| `400` | Blank or invalid `email` |
| `400` | Blank `phone` |
| `400` | Cart is empty |
| `400` | Insufficient stock for one or more items |
| `400` | Invalid `discountCode` |

```json
{ "code": 400, "message": "Insufficient stock. Available: 3" }
```

```json
{
  "code": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Email must be a valid email address" },
    { "field": "phone", "message": "Phone is required" }
  ]
}
```

> Validation `errors[].field` values: `email`, `phone`, `discountCode` (Java camelCase field names).

### Frontend Usage

```typescript
const createOrder = async (
  form: OrderCreateInput,
  sessionId?: string
): Promise<Order> => {
  const headers: Record<string, string> = {};
  if (sessionId) headers["X-Session-ID"] = sessionId;

  const res = await api.post<ApiResponse<OrderResponseApi>>(
    "/api/v1/orders",
    form,
    { headers }
  );
  return normalizeOrder(res.data.data);
};
```

---

## POST /api/v1/orders/buy-now

Creates an order directly from a single variant — bypasses the cart entirely.

**Authentication:** JWT optional (used for account association only; not required)
**HTTP Status on success:** `201 Created`

### Request Body

```json
{
  "variantId": 5,
  "quantity": 1,
  "email": "customer@example.com",
  "phone": "0901234567",
  "discountCode": "SAVE10"
}
```

> All fields are **camelCase** — no `@JsonProperty` on `BuyNowRequest`.
> `discountCode` is optional.

### Full Response Snapshot — `201 Created`

Same shape as `POST /api/v1/orders` response (single item in `items` array).

```json
{
  "code": 201,
  "message": "Created",
  "data": {
    "order_code": "ORD-20260503-A3M7N1",
    "status": "PENDING",
    "total_amount": 59000,
    "email": "customer@example.com",
    "phone": "0901234567",
    "created_at": "2026-05-03T15:00:00",
    "items": [
      {
        "variant_id": 5,
        "variant_name": "1 Month",
        "product_name": "Spotify Premium",
        "quantity": 1,
        "price": 59000,
        "subtotal": 59000
      }
    ]
  }
}
```

### Error Responses

| Code | Condition |
|------|-----------|
| `400` | Any required field missing or invalid |
| `400` | `quantity` < 1 |
| `400` | Insufficient stock |
| `404` | Variant does not exist |

### Frontend Usage

```typescript
const buyNow = async (input: BuyNowInput): Promise<Order> => {
  const res = await api.post<ApiResponse<OrderResponseApi>>(
    "/api/v1/orders/buy-now",
    input
  );
  return normalizeOrder(res.data.data);
};
```

---

## POST /api/v1/orders/lookup

Retrieves full order details including **decrypted digital credentials**.

**Authentication:** None — public endpoint (secured by `order_code` + `email` pair)
**HTTP Status on success:** `200 OK`

> This is a `POST`, not a `GET`. The body contains `order_code` and `email`.

### Request Body

```json
{
  "order_code": "ORD-20260503-X7K9P2",
  "email": "customer@example.com"
}
```

> Body keys are **literal strings** `"order_code"` and `"email"`. The backend reads them from a `Map<String, String>`. Do not camelCase these keys.

### Full Response Snapshot — `200 OK` (order COMPLETED)

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "order_code": "ORD-20260503-X7K9P2",
    "status": "COMPLETED",
    "total_amount": 197000,
    "email": "customer@example.com",
    "phone": "0901234567",
    "created_at": "2026-05-03T14:30:00",
    "items": [
      {
        "variant_id": 5,
        "variant_name": "1 Month",
        "product_name": "Spotify Premium",
        "quantity": 2,
        "price": 59000,
        "subtotal": 118000,
        "credentials": ["ABCD-1234-EFGH-5678", "WXYZ-9876-MNOP-4321"]
      },
      {
        "variant_id": 11,
        "variant_name": "1 Month",
        "product_name": "YouTube Premium",
        "quantity": 1,
        "price": 79000,
        "subtotal": 79000,
        "credentials": ["YT-PREMIUM-KEY-001"],
        "profile_name": "Profile 2"
      }
    ]
  }
}
```

> `credentials`: array of decrypted digital keys/accounts — one entry per unit purchased.
> `profile_name`: present only for shared-account (INSTANT_SHARED) deliveries.

### Lookup on PENDING order

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "order_code": "ORD-20260503-X7K9P2",
    "status": "PENDING",
    "total_amount": 197000,
    "email": "customer@example.com",
    "phone": "0901234567",
    "created_at": "2026-05-03T14:30:00",
    "items": [
      {
        "variant_id": 5,
        "variant_name": "1 Month",
        "product_name": "Spotify Premium",
        "quantity": 2,
        "price": 59000,
        "subtotal": 118000
      }
    ]
  }
}
```

> No `credentials` on a PENDING/PAID order — allocation has not completed yet.

### Error Responses

| Code | Condition |
|------|-----------|
| `400` | `order_code` missing or blank |
| `400` | `email` missing or blank |
| `404` | Order not found OR email does not match |

```json
{ "code": 404, "message": "Order not found" }
```

> The 404 message is intentionally ambiguous — do not reveal whether the order_code is valid but the email is wrong (security: enumeration prevention).

### Frontend Usage

```typescript
const lookupOrder = async (orderCode: string, email: string): Promise<Order> => {
  const res = await api.post<ApiResponse<OrderResponseApi>>("/api/v1/orders/lookup", {
    order_code: orderCode,  // literal snake_case key
    email,
  });
  return normalizeOrder(res.data.data);
};
```

---

## GET /api/v1/admin/orders

Returns a paginated, filterable list of all orders.

**Authentication:** ADMIN role required
**HTTP Status on success:** `200 OK`

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | `number` | No | `0` | **0-based.** First page = `0`. (Different from products — that endpoint uses 1-based.) |
| `size` | `number` | No | `20` | Items per page |
| `status` | `string` | No | — | Filter by `OrderStatus` value (e.g. `PENDING`, `PAID`) |
| `from` | `date` | No | — | Filter from date (ISO: `2026-05-01`) |
| `to` | `date` | No | — | Filter to date (ISO: `2026-05-31`) |

### Full Response Snapshot — `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "items": [
      {
        "id": 42,
        "order_code": "ORD-20260503-X7K9P2",
        "email": "customer@example.com",
        "phone": "0901234567",
        "total_amount": 197000,
        "status": "COMPLETED",
        "created_at": "2026-05-03T14:30:00",
        "updated_at": "2026-05-03T14:35:00"
      },
      {
        "id": 41,
        "order_code": "ORD-20260503-B2L5Q8",
        "email": "other@example.com",
        "phone": "0912345678",
        "total_amount": 80000,
        "status": "PENDING",
        "created_at": "2026-05-03T14:00:00",
        "updated_at": "2026-05-03T14:00:00"
      }
    ],
    "page_info": {
      "total_elements": 128,
      "total_pages": 7,
      "current_page": 0,
      "page_size": 20
    }
  }
}
```

### Frontend Usage

```typescript
const getAdminOrders = async (params: {
  page?: number;
  size?: number;
  status?: OrderStatus;
  from?: string;
  to?: string;
}): Promise<PaginatedOrders> => {
  const res = await api.get<ApiResponse<PaginatedOrderApi>>("/api/v1/admin/orders", {
    params: {
      page: params.page ?? 0,     // 0-based!
      size: params.size ?? 20,
      status: params.status,
      from: params.from,
      to: params.to,
    },
  });
  return normalizeAdminOrders(res.data.data);
};
```

---

## POST /api/v1/admin/orders/recover-stuck

Manually triggers the stuck-order recovery process. Equivalent to the scheduled cron that runs every 10 minutes automatically.

**Authentication:** ADMIN role required
**HTTP Status on success:** `200 OK`

### Full Response Snapshot — `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": "Stuck order recovery triggered"
}
```

> `data` is a plain string message.

### Frontend Usage

```typescript
const recoverStuckOrders = async (): Promise<void> => {
  await api.post("/api/v1/admin/orders/recover-stuck");
};
```
