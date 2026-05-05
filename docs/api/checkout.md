# API Documentation — Checkout Flow

**Base URL:** `http://localhost:8080`
**Updated:** 2026-05-03

---

## Overview

There is **no dedicated `/api/v1/checkout` endpoint**. Checkout is a client-side flow that spans three backend endpoints:

```
1. Cart is ready               → GET  /api/v1/cart
2. Customer submits order form → POST /api/v1/orders        (creates order, returns order_code)
3. Customer initiates payment  → POST /api/v1/payments/create (returns payment_url)
4. Customer is redirected      → payment gateway handles payment
5. Gateway calls webhook       → POST /api/v1/payments/webhook (backend processes result)
6. Frontend polls order status → POST /api/v1/orders/lookup
```

For the full API contract of each step, see the dedicated docs:
- **Order creation:** `order.md` — `POST /api/v1/orders`
- **Buy Now (skip cart):** `order.md` — `POST /api/v1/orders/buy-now`
- **Payment initiation:** `payment.md` — `POST /api/v1/payments/create`
- **Cart:** `cart.md`

---

## Known Gotchas

| # | Gotcha | Detail |
|---|--------|--------|
| 1 | **Order creation requires identity** | `POST /api/v1/orders` accepts a JWT `Authorization` header OR an `X-Session-ID` header to load the cart. If neither is present and the cart is empty → `400 Bad Request`. |
| 2 | **Order fields are camelCase** | `OrderCreateRequest` has NO `@JsonProperty`. Send `email`, `phone`, `discountCode` — NOT `discount_code`. |
| 3 | **Order response is snake_case** | `OrderResponse` uses `@JsonProperty`. You receive `order_code`, `total_amount`, `created_at` — NOT camelCase. |
| 4 | **Payment is async** | After redirecting to `payment_url`, the backend learns the result via webhook. The frontend must poll `POST /api/v1/orders/lookup` to read the final order status — there is no push notification to the browser. |
| 5 | **Cart is cleared on order creation** | The backend empties the cart after a successful order. Do not call `DELETE /api/v1/cart/clear` from the frontend on success — it is a no-op at that point. |
| 6 | **Order must be PENDING to initiate payment** | `POST /api/v1/payments/create` only works on orders with `status = PENDING`. Calling it on PAID, EXPIRED, or any other status returns `400 Bad Request`. |
| 7 | **Discount code is optional** | Pass `discountCode` only if the user has one. Omit the field (or send `null`) to skip discount processing. |

---

## Full Checkout Flow

### Step 1 — Verify cart is not empty

```typescript
const cart = await getCart();  // GET /api/v1/cart

if (cart.items.length === 0) {
  // Block checkout — cart is empty
  throw new Error("Cart is empty");
}
```

### Step 2 — Collect customer info

The checkout form must collect:

| Field | Required | Validation |
|-------|----------|-----------|
| `email` | Yes | Valid email format |
| `phone` | Yes | Non-blank string |
| `discountCode` | No | Optional discount code |

```typescript
// Form state
interface CheckoutForm {
  email: string;
  phone: string;
  discountCode?: string;
}
```

### Step 3 — Create order

```typescript
// POST /api/v1/orders
const createOrder = async (form: CheckoutForm): Promise<OrderResponse> => {
  const res = await api.post<ApiResponse<OrderResponseApi>>("/api/v1/orders", {
    email: form.email,
    phone: form.phone,
    discountCode: form.discountCode ?? undefined,
  });
  // res.data.code === 201
  return normalizeOrder(res.data.data);
};
```

Successful response includes `order_code` — save it for subsequent steps.

### Step 4 — Initiate payment

```typescript
// POST /api/v1/payments/create
const initiatePayment = async (
  orderCode: string,
  method: "VNPAY" | "MOMO"
): Promise<PaymentUrlResponse> => {
  const res = await api.post<ApiResponse<PaymentUrlResponseApi>>("/api/v1/payments/create", {
    order_code: orderCode,  // NOTE: field name is order_code (with underscore)
    method,
  });
  // res.data.code === 200
  return normalizePaymentUrl(res.data.data);
};
```

> See `payment.md` for full request/response types.

### Step 5 — Redirect to payment gateway

```typescript
const { paymentUrl } = await initiatePayment(order.orderCode, selectedMethod);
window.location.href = paymentUrl;
// User leaves your site and completes payment on VNPAY or MoMo
```

### Step 6 — Poll order status after redirect

When the gateway redirects the user back to your site (e.g. `/orders/result?order_code=ORD-...`):

```typescript
// POST /api/v1/orders/lookup
const pollOrderStatus = async (
  orderCode: string,
  email: string
): Promise<OrderResponse> => {
  const res = await api.post<ApiResponse<OrderResponseApi>>("/api/v1/orders/lookup", {
    order_code: orderCode,  // note: raw snake_case key
    email,
  });
  return normalizeOrder(res.data.data);
};

// Poll until order is no longer PENDING
const waitForPayment = async (orderCode: string, email: string) => {
  const MAX_POLLS = 12;   // 12 × 5s = 60s timeout
  const INTERVAL_MS = 5000;

  for (let i = 0; i < MAX_POLLS; i++) {
    const order = await pollOrderStatus(orderCode, email);

    if (order.status !== "PENDING") {
      return order;  // PAID, EXPIRED, FAILED — stop polling
    }

    await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));
  }

  throw new Error("Payment confirmation timeout — check your email");
};
```

---

## Checkout Form Validation (Zod)

```typescript
import { z } from "zod";

export const CheckoutFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone is required"),
  discountCode: z.string().optional(),
  paymentMethod: z.enum(["VNPAY", "MOMO"]),
});

export type CheckoutFormInput = z.infer<typeof CheckoutFormSchema>;
```

---

## Error Handling During Checkout

```typescript
try {
  const order = await createOrder(form);
  const payment = await initiatePayment(order.orderCode, form.paymentMethod);
  window.location.href = payment.paymentUrl;
} catch (err) {
  if (!axios.isAxiosError(err)) throw err;

  const data: ApiResponse = err.response?.data;
  const status = err.response?.status;

  if (status === 400 && data.errors?.length) {
    // Validation error (missing email, phone, etc.)
    setFieldErrors(toFieldErrors(data.errors));
  } else if (status === 400) {
    // Business rule (empty cart, invalid discount code, etc.)
    setGlobalError(data.message);
  } else if (status === 404) {
    // Order not found (stale order_code) — redirect to cart
    router.push("/cart");
  }
}
```

---

## Buy Now Flow (Skip Cart)

For single-item direct purchase without adding to cart:

```typescript
// POST /api/v1/orders/buy-now
const buyNow = async (params: {
  variantId: number;
  quantity: number;
  email: string;
  phone: string;
  discountCode?: string;
}): Promise<OrderResponse> => {
  const res = await api.post<ApiResponse<OrderResponseApi>>("/api/v1/orders/buy-now", {
    variantId: params.variantId,    // camelCase — no @JsonProperty on BuyNowRequest
    quantity: params.quantity,
    email: params.email,
    phone: params.phone,
    discountCode: params.discountCode,
  });
  return normalizeOrder(res.data.data);
};
```

Then proceed with Steps 4–6 identically. The Buy Now endpoint also returns `201 Created` with the same `OrderResponse` shape.

---

## Complete Page Flow Diagram

```
[Cart Page]
    │
    ▼ User clicks "Checkout"
[Checkout Form] ──── Validate form (Zod) ─────────────────►[Show field errors]
    │ valid
    ▼
POST /api/v1/orders  ────────────────────────────────────►[400 / 404 error handling]
    │ 201 Created → save order_code + email in state/URL
    ▼
POST /api/v1/payments/create ────────────────────────────►[400 error handling]
    │ 200 OK → payment_url
    ▼
window.location.href = payment_url
    │
    ▼ [User on gateway site — completes or cancels]
    │
    ▼ Gateway redirects to /orders/result?order_code=...
[Result Page]
    │
    ▼ POST /api/v1/orders/lookup (poll with backoff)
    │
    ├── status = PAID / PROCESSING / COMPLETED → [Success page + show credentials]
    ├── status = FAILED    → [Payment failed — retry?]
    └── status = EXPIRED   → [Order expired — back to cart]
```
