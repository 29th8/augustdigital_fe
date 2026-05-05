# API Documentation — Payment Module

**Base URL:** `http://localhost:8080`
**Updated:** 2026-05-03

---

## Known Gotchas

| # | Gotcha | Detail |
|---|--------|--------|
| 1 | **Webhook returns plain `"OK"`, NOT JSON** | `POST /api/v1/payments/webhook` returns `Content-Type: text/plain` with body `OK`. Never attempt to parse it as `ApiResponse`. This endpoint is called by the payment gateway, not your frontend. |
| 2 | **Webhook is permit-all (no JWT)** | The webhook endpoint bypasses JWT authentication. Do NOT send an `Authorization` header — the gateway doesn't know your token anyway. |
| 3 | **`order_code` in request body has underscore** | `PaymentCreateRequest.order_code` is a raw Java field with an underscore in its name (not camelCase + `@JsonProperty`). Send `"order_code"` in the request body — NOT `"orderCode"`. |
| 4 | **Response fields are snake_case** | `PaymentUrlResponse` uses `@JsonProperty`. You receive `payment_url`, `order_code`, `expired_at` — NOT camelCase. |
| 5 | **Order must be PENDING before creating payment** | `POST /payments/create` requires the order to have `status = PENDING`. Any other status → `400 Bad Request`. |
| 6 | **Payment status is asynchronous** | After redirecting to `payment_url`, the backend learns the outcome only when the gateway calls the webhook. The frontend MUST poll `POST /orders/lookup` to check order status — there is no push notification. |
| 7 | **Frontend never calls the webhook** | `/payments/webhook` is called by VNPAY/MoMo servers, not by your frontend. Do not build UI logic against it. |
| 8 | **Webhook always returns 200** | Even on processing errors (bad signature, not found, etc.), the webhook returns `200 OK`. This is intentional — gateways retry on non-2xx responses, which would cause double-processing. |

---

## Raw API Types (exact JSON shape from backend)

```typescript
// POST /api/v1/payments/create request
// IMPORTANT: order_code is a raw field name with underscore — NOT camelCase
interface PaymentCreateRequestApi {
  order_code: string;  // literal key "order_code" — NOT "orderCode"
  method: PaymentMethod;
}

// POST /api/v1/payments/create response — 200 OK
interface PaymentUrlResponseApi {
  payment_url: string;   // full gateway URL to redirect user to
  order_code: string;
  amount: number;        // BigDecimal as number
  method: string;        // "VNPAY" | "MOMO"
  expired_at: string;    // ISO 8601 datetime string
}

// POST /api/v1/payments/webhook request body (sent BY the gateway)
// Your frontend never sends this — gateway sends it to your backend.
interface WebhookRequestApi {
  order_code: string;
  transaction_code: string;  // gateway-assigned unique ID
  amount: number;
  payment_status: string;    // "SUCCESS" | "FAILED"
  method: string;            // "VNPAY" | "MOMO"
  signature: string;         // HMAC-SHA256 — validated server-side
}

// POST /api/v1/payments/webhook response
// Plain string "OK" — not JSON, not ApiResponse
type WebhookResponse = "OK";
```

---

## Payment Method Enum

```typescript
type PaymentMethod = "VNPAY" | "MOMO";
```

---

## Frontend Types (camelCase, normalized)

```typescript
interface PaymentUrl {
  paymentUrl: string;
  orderCode: string;
  amount: number;
  method: PaymentMethod;
  expiredAt: string;
}
```

---

## Normalizer

```typescript
function normalizePaymentUrl(raw: PaymentUrlResponseApi): PaymentUrl {
  return {
    paymentUrl: raw.payment_url,
    orderCode: raw.order_code,
    amount: raw.amount,
    method: raw.method as PaymentMethod,
    expiredAt: raw.expired_at,
  };
}
```

---

## Zod Schemas

```typescript
import { z } from "zod";

const PaymentMethodEnum = z.enum(["VNPAY", "MOMO"]);

// Request schema
export const PaymentCreateSchema = z.object({
  order_code: z.string().min(1, "Order code is required"),
  method: PaymentMethodEnum,
});

// Response schema (normalized)
export const PaymentUrlSchema = z.object({
  paymentUrl: z.string().url(),
  orderCode: z.string(),
  amount: z.number().positive(),
  method: PaymentMethodEnum,
  expiredAt: z.string(),
});

export type PaymentCreateInput = z.infer<typeof PaymentCreateSchema>;
export type PaymentUrl = z.infer<typeof PaymentUrlSchema>;
```

---

## POST /api/v1/payments/create

Creates a payment session for a PENDING order. Returns a URL to redirect the user to the payment gateway.

**Authentication:** None required (order is identified by `order_code`)
**HTTP Status on success:** `200 OK`

### Request Body

```json
{
  "order_code": "ORD-20260503-X7K9P2",
  "method": "VNPAY"
}
```

> `order_code` is literally `"order_code"` in the JSON — the Java field is named with an underscore.
> `method` must be exactly `"VNPAY"` or `"MOMO"`.

### Full Response Snapshot — `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "payment_url": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=19700000&vnp_OrderInfo=ORD-20260503-X7K9P2&vnp_TxnRef=TXN-20260503-A1B2C3&...",
    "order_code": "ORD-20260503-X7K9P2",
    "amount": 197000,
    "method": "VNPAY",
    "expired_at": "2026-05-03T14:45:00"
  }
}
```

### Error Responses

| Code | Condition |
|------|-----------|
| `400` | `order_code` blank or missing |
| `400` | `method` blank or missing |
| `400` | Order is not in `PENDING` status |
| `404` | Order not found |

```json
{ "code": 400, "message": "Order is not in PENDING status" }
```

```json
{ "code": 404, "message": "Order not found" }
```

### Frontend Usage

```typescript
const createPayment = async (
  orderCode: string,
  method: PaymentMethod
): Promise<PaymentUrl> => {
  const res = await api.post<ApiResponse<PaymentUrlResponseApi>>(
    "/api/v1/payments/create",
    {
      order_code: orderCode,  // must be snake_case key
      method,
    }
  );
  return normalizePaymentUrl(res.data.data);
};

// Redirect user to gateway
const initiateCheckout = async (orderCode: string, method: PaymentMethod) => {
  const { paymentUrl } = await createPayment(orderCode, method);
  window.location.href = paymentUrl;
};
```

---

## POST /api/v1/payments/webhook

Receives the IPN (Instant Payment Notification) callback from the payment gateway after a payment attempt.

**Authentication:** None (permit-all — JWT filter is bypassed for this endpoint)
**Caller:** Payment gateway (VNPAY/MoMo), not your frontend
**HTTP Status:** Always `200 OK`

> **CRITICAL:** This endpoint is NOT called by the frontend. It is called by the payment gateway server. Do not include it in your frontend API client.

### Response

```
HTTP 200 OK
Content-Type: text/plain
Body: OK
```

This is a **plain text string**, not JSON. The gateway only cares that it receives `200`. The backend processes the payment internally and always returns `200` — even on errors — to prevent gateway retries.

### What happens inside the webhook

1. Gateway sends `transaction_code`, `order_code`, `amount`, `payment_status`, `signature`
2. Backend validates HMAC-SHA256 `signature` — rejects invalid signatures (but still returns 200)
3. Backend inserts/resumes payment record with idempotency check (duplicate `transaction_code` → ignored)
4. If `payment_status = "SUCCESS"`: order transitions `PENDING → PAID`, then inventory allocation runs asynchronously
5. If `payment_status = "FAILED"`: payment record marked `FAILED`, order remains `PENDING` until expiry

### Webhook Request Shape (for reference — gateway sends this)

```json
{
  "order_code": "ORD-20260503-X7K9P2",
  "transaction_code": "VNP-2026050314300001",
  "amount": 197000,
  "payment_status": "SUCCESS",
  "method": "VNPAY",
  "signature": "a3f9c2d1e8b7a4f0c5d2e9b6a1f8c3d7e0b4a9f2c6d3e8b5a2f9c4d1e7b3a0"
}
```

---

## Frontend Payment Flow

```
1. Create order     → POST /api/v1/orders               → save order_code + email
2. Create payment   → POST /api/v1/payments/create       → get payment_url
3. Redirect user    → window.location.href = payment_url
4. [User on gateway site — completes payment]
5. Gateway redirects back to your site (e.g. /orders/result?order_code=...)
6. Your result page → POST /api/v1/orders/lookup         → check order status
7. Poll until status ≠ PENDING (5s interval, max 60s)
```

### Result Page Implementation

```typescript
// pages/orders/result.tsx (or app/orders/result/page.tsx)

const OrderResultPage = () => {
  const searchParams = useSearchParams();
  const orderCode = searchParams.get("order_code");
  const email = /* stored in sessionStorage during checkout */ "";

  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderCode || !email) return;

    let attempts = 0;
    const MAX_ATTEMPTS = 12;

    const poll = async () => {
      try {
        const result = await lookupOrder(orderCode, email);
        setOrder(result);

        if (result.status === "PENDING" && attempts < MAX_ATTEMPTS) {
          attempts++;
          setTimeout(poll, 5000);
        }
      } catch (err) {
        setError("Could not retrieve order. Please contact support.");
      }
    };

    poll();
  }, [orderCode, email]);

  if (!order) return <p>Checking payment status...</p>;

  switch (order.status) {
    case "COMPLETED":
    case "PARTIALLY_COMPLETED":
      return <CredentialsDisplay order={order} />;
    case "PAID":
    case "PROCESSING":
    case "PAID_PENDING_STOCK":
      return <p>Payment received — preparing your items...</p>;
    case "FAILED":
      return <p>Payment failed. Please try again.</p>;
    case "EXPIRED":
      return <p>Order expired. Please return to the store.</p>;
    default:
      return <p>Awaiting payment confirmation...</p>;
  }
};
```

---

## Displaying Credentials

After looking up a `COMPLETED` order:

```typescript
const CredentialsDisplay = ({ order }: { order: Order }) => (
  <div>
    <h2>Your Order — {order.orderCode}</h2>
    {order.items.map((item) => (
      <div key={item.variantId}>
        <h3>{item.productName} — {item.variantName} × {item.quantity}</h3>
        {item.profileName && <p>Profile: {item.profileName}</p>}
        {item.credentials?.map((key, i) => (
          <code key={i}>{key}</code>
        ))}
      </div>
    ))}
  </div>
);
```

> `credentials` is an array — one entry per unit purchased. For `quantity=2`, expect 2 keys.
> `profileName` is only present for shared-account (INSTANT_SHARED) products.

---

## Security Notes

- The webhook signature is validated **server-side** using HMAC-SHA256. No frontend action required.
- Never expose `transaction_code` or `signature` in frontend logs.
- The webhook endpoint must NOT be called from the frontend. It is exclusively for the payment gateway.
- After payment, always use `POST /orders/lookup` (with `order_code` + `email`) to retrieve credentials — never cache or predict delivery data client-side.
