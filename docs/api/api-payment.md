# Payment Module — API Documentation

**Base URL:** `http://localhost:8080`
**API prefix:** `/api/v1/payments`
**Authentication:** Both endpoints are **public** (no JWT required). The webhook uses HMAC-SHA256 signature validation instead of JWT.

---

## 1. Module Overview

The Payment module handles two responsibilities:

1. **Create Payment URL** — accepts an existing PENDING order and returns a URL the customer opens to complete payment at the gateway (or mock gateway in development).
2. **Webhook / IPN** — receives the payment result callback from the gateway after the customer completes (or abandons) payment.

### Enums

**PaymentMethod**
| Value | Description |
|-------|-------------|
| `VNPAY` | VNPAY gateway |
| `MOMO` | MoMo e-wallet gateway |

**PaymentStatus** (stored in `payments.status`)
| Value | Description |
|-------|-------------|
| `PENDING` | Payment record created, awaiting gateway confirmation |
| `SUCCESS` | Gateway confirmed successful payment |
| `FAILED` | Gateway reported failure, amount mismatch, or order expired before payment arrived |

**RefundStatus** (stored in `refunds.status`)
| Value | Description |
|-------|-------------|
| `PENDING` | Refund record created, awaiting manual processing |
| `PROCESSED` | Refund has been issued to customer |
| `FAILED` | Refund attempt failed |

> Refund records are created automatically when money arrives from the gateway **after** the order has already expired. They require manual admin action.

---

## 2. Endpoints

---

### POST /api/v1/payments/create

**Description:** Creates a payment record for a PENDING order and returns the URL (or QR code URL) the customer should be redirected to at the payment gateway. In development this is a mock sandbox URL.

**Authentication:** None (public endpoint).

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "order_code": "ORD-20260411-X7K9P2",
  "method": "VNPAY"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `order_code` | string | Yes | The order code returned when the order was created. |
| `method` | string | Yes | Payment method. Must be `VNPAY` or `MOMO` (case-insensitive). |

**Success Response — 200 OK:**
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "payment_url": "http://localhost:8080/sandbox/pay?order_code=ORD-20260411-X7K9P2&amount=150000.00&method=VNPAY&ref=1",
    "order_code": "ORD-20260411-X7K9P2",
    "amount": 150000.00,
    "method": "VNPAY",
    "expired_at": "2026-04-11 09:30:00"
  }
}
```

| Response Field | Type | Description |
|----------------|------|-------------|
| `payment_url` | string | URL to open in the customer's browser. In dev: mock sandbox URL with query params. |
| `order_code` | string | The order code. |
| `amount` | number | Amount to be charged, from `orders.total_amount`. |
| `method` | string | The payment method that was selected. |
| `expired_at` | string | Formatted as `yyyy-MM-dd HH:mm:ss`. Payment link is valid for 15 minutes from this call. |

**Error Responses:**

| HTTP | Condition | Response body |
|------|-----------|---------------|
| 400 | `method` is blank or missing | `{"code":400,"message":"Payment method is required"}` |
| 400 | `method` is not `VNPAY` or `MOMO` | `{"code":400,"message":"Invalid payment method: xyz. Supported: VNPAY, MOMO"}` |
| 400 | `order_code` is blank or missing | `{"code":400,"message":"Order code is required"}` |
| 404 | Order with that code does not exist | `{"code":404,"message":"Order not found: ORD-..."}` |
| 400 | Order status is not `PENDING` | `{"code":400,"message":"Cannot create payment for order in status: PAID"}` |

**cURL Example:**
```bash
curl -s -X POST http://localhost:8080/api/v1/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "order_code": "ORD-20260411-X7K9P2",
    "method": "VNPAY"
  }' | jq .
```

---

### POST /api/v1/payments/webhook

**Description:** Receives the Instant Payment Notification (IPN) / webhook callback from the payment gateway after the customer completes payment. Implements full idempotency — safe to receive the same webhook multiple times.

**Authentication:** None (public endpoint). Uses HMAC-SHA256 signature validation instead of JWT.

**Critical design contract:**
- This endpoint **always returns `200 OK`** regardless of any error. Gateways will retry on any non-2xx response, which would cause duplicate processing.
- Inventory allocation is triggered **after** the payment transaction commits so the `PAID` status is visible to the async thread.
- All transient DB errors are retried up to 3 times automatically (`PaymentWebhookFacade`).

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "order_code": "ORD-20260411-X7K9P2",
  "transaction_code": "VNP-20260411-1234567890",
  "amount": 150000.00,
  "payment_status": "SUCCESS",
  "method": "VNPAY",
  "signature": "a3f2e1..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `order_code` | string | Yes | Our internal order code. Used to look up the order when no existing payment record is found. |
| `transaction_code` | string | Yes | Gateway-assigned unique transaction reference. This is the idempotency key — the UNIQUE constraint in the `payments` table prevents duplicate processing. |
| `amount` | number | Yes | Amount actually charged by the gateway. Must equal `orders.total_amount` exactly (BigDecimal comparison). |
| `payment_status` | string | Yes | Gateway-reported outcome. Use `SUCCESS` or `FAILED`. |
| `method` | string | Yes | Payment method. `VNPAY` or `MOMO`. |
| `signature` | string | Yes | HMAC-SHA256 signature. See signature generation below. |

**Signature Algorithm:**

The signature is computed as:
```
HMAC-SHA256(secret, "<transaction_code>|<order_code>|<amount>|<payment_status>")
```

- Secret key: value of environment variable `PAYMENT_WEBHOOK_SECRET`
  (default in dev: `dev-webhook-secret-change-in-production`)
- The amount must be formatted with full decimal notation (e.g. `150000.00`, not `150000`)
- Fields joined with `|`, no spaces
- Result encoded as lowercase hex string

**Generate signature in bash:**
```bash
SECRET="dev-webhook-secret-change-in-production"
TXN="VNP-20260411-1234567890"
ORDER="ORD-20260411-X7K9P2"
AMOUNT="150000.00"
STATUS="SUCCESS"

echo -n "${TXN}|${ORDER}|${AMOUNT}|${STATUS}" \
  | openssl dgst -sha256 -hmac "$SECRET" \
  | awk '{print $2}'
```

**Generate signature in Python:**
```python
import hmac, hashlib

secret = b"dev-webhook-secret-change-in-production"
message = "VNP-20260411-1234567890|ORD-20260411-X7K9P2|150000.00|SUCCESS"
sig = hmac.new(secret, message.encode(), hashlib.sha256).hexdigest()
print(sig)
```

**Response — Always 200 OK:**
```
OK
```

> **Note:** The response body is the plain string `OK`, not a JSON object. This is intentional — gateways only check the HTTP status code.

**Internal behavior by scenario (all return 200):**

| Scenario | What happens internally |
|----------|------------------------|
| Valid SUCCESS webhook (first time) | Payment → SUCCESS, Order → PAID, async inventory allocation triggered |
| Same webhook received again | Detects existing SUCCESS payment, exits immediately (idempotent) |
| PENDING payment exists (crash recovery) | Resumes from amount check, completes normally |
| `payment_status = FAILED` | Payment set to FAILED, order unchanged |
| Amount does not match order total | Payment set to FAILED, order unchanged |
| Missing or invalid signature | Logged as warning, error suppressed, returns 200 |
| Order not found | Logged as warning, error suppressed, returns 200 |
| Order already EXPIRED when webhook arrives | Payment set to FAILED, **Refund record created** with status PENDING |
| Duplicate `transaction_code` DB constraint hit | Logged and suppressed, returns 200 |

---

## 3. Testing Guide

### Prerequisites

1. The application is running on `http://localhost:8080`
2. PostgreSQL is running with the `augustdigital` database
3. You have `curl` and `jq` installed
4. You have `openssl` available (for signature generation)

Define these shell variables once at the start:

```bash
BASE="http://localhost:8080/api/v1"
SECRET="dev-webhook-secret-change-in-production"
```

---

### Step 1 — Get an existing PENDING order code

If you already have a PENDING order code skip to Step 2. Otherwise create one:

```bash
# Register a user (if not done yet)
curl -s -X POST $BASE/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' | jq .

# Login and capture the JWT
TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  | jq -r '.data.token')

echo "Token: $TOKEN"

# Add an item to cart (replace variantId with a real one from your DB)
curl -s -X POST $BASE/cart \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"variantId": 1, "quantity": 1}' | jq .

# Create the order
ORDER_RESPONSE=$(curl -s -X POST $BASE/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "email": "test@example.com",
    "phone": "0901234567"
  }')

echo $ORDER_RESPONSE | jq .

# Extract the order_code
ORDER_CODE=$(echo $ORDER_RESPONSE | jq -r '.data.order_code')
echo "Order code: $ORDER_CODE"
```

---

### Step 2 — Create the payment URL

```bash
PAYMENT_RESPONSE=$(curl -s -X POST $BASE/payments/create \
  -H "Content-Type: application/json" \
  -d "{
    \"order_code\": \"$ORDER_CODE\",
    \"method\": \"VNPAY\"
  }")

echo $PAYMENT_RESPONSE | jq .

# Extract the payment URL and ref (payment ID)
PAYMENT_URL=$(echo $PAYMENT_RESPONSE | jq -r '.data.payment_url')
AMOUNT=$(echo $PAYMENT_RESPONSE | jq -r '.data.amount')
echo "Payment URL: $PAYMENT_URL"
echo "Amount: $AMOUNT"

# Extract the payment ref (id) from the URL
PAYMENT_REF=$(echo $PAYMENT_URL | grep -oP 'ref=\K[0-9]+')
echo "Payment ref: $PAYMENT_REF"
```

Expected response:
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "payment_url": "http://localhost:8080/sandbox/pay?order_code=ORD-20260411-X7K9P2&amount=150000.00&method=VNPAY&ref=1",
    "order_code": "ORD-20260411-X7K9P2",
    "amount": 150000.00,
    "method": "VNPAY",
    "expired_at": "2026-04-11 09:45:00"
  }
}
```

> In production the `payment_url` would be a redirect to the real VNPAY/MoMo payment page.
> In development you simulate the gateway callback manually in Step 3.

---

### Step 3 — Simulate the webhook callback

Generate the signature, then call the webhook endpoint to simulate the gateway calling back after a successful payment.

```bash
# Values to sign — use exact amount from the payment URL (e.g. "150000.00")
TXN="VNP-$(date +%Y%m%d)-$(shuf -i 1000000000-9999999999 -n 1)"
STATUS="SUCCESS"
FORMATTED_AMOUNT=$(printf "%.2f" $AMOUNT)

# Generate HMAC-SHA256 signature
SIG=$(echo -n "${TXN}|${ORDER_CODE}|${FORMATTED_AMOUNT}|${STATUS}" \
  | openssl dgst -sha256 -hmac "$SECRET" \
  | awk '{print $2}')

echo "Transaction code: $TXN"
echo "Signature: $SIG"

# Call the webhook
curl -s -X POST $BASE/payments/webhook \
  -H "Content-Type: application/json" \
  -d "{
    \"order_code\": \"$ORDER_CODE\",
    \"transaction_code\": \"$TXN\",
    \"amount\": $FORMATTED_AMOUNT,
    \"payment_status\": \"$STATUS\",
    \"method\": \"VNPAY\",
    \"signature\": \"$SIG\"
  }"
```

Expected response:
```
OK
```

---

### Step 4 — Verify the results in the database

```sql
-- 1. Check order status changed to PAID
SELECT id, order_code, status, total_amount, updated_at
FROM orders
WHERE order_code = 'ORD-20260411-X7K9P2';

-- Expected: status = 'PAID'

-- 2. Check payment record created with status SUCCESS
SELECT id, order_id, method, transaction_code, amount, status, created_at
FROM payments
WHERE order_id = (SELECT id FROM orders WHERE order_code = 'ORD-20260411-X7K9P2');

-- Expected: one row with status = 'SUCCESS', one row with status = 'PENDING' (from Step 2)

-- 3. Check no refund was created (happy path)
SELECT *
FROM refunds
WHERE order_id = (SELECT id FROM orders WHERE order_code = 'ORD-20260411-X7K9P2');

-- Expected: 0 rows
```

---

## 4. Test Scenarios

---

### Scenario A — Successful payment (SUCCESS)

This is the happy path covered in Steps 1–4 above.

**What to verify:**
- `orders.status` changes from `PENDING` → `PAID`
- `payments` table has a row with `status = 'SUCCESS'` and `transaction_code` set
- No row in `refunds`

---

### Scenario B — Failed payment (FAILED)

The gateway reports the payment failed (e.g. customer cancelled).

```bash
TXN_FAILED="VNP-FAIL-$(date +%s)"
STATUS_FAILED="FAILED"
FORMATTED_AMOUNT=$(printf "%.2f" $AMOUNT)

SIG_FAILED=$(echo -n "${TXN_FAILED}|${ORDER_CODE}|${FORMATTED_AMOUNT}|${STATUS_FAILED}" \
  | openssl dgst -sha256 -hmac "$SECRET" \
  | awk '{print $2}')

curl -s -X POST $BASE/payments/webhook \
  -H "Content-Type: application/json" \
  -d "{
    \"order_code\": \"$ORDER_CODE\",
    \"transaction_code\": \"$TXN_FAILED\",
    \"amount\": $FORMATTED_AMOUNT,
    \"payment_status\": \"$STATUS_FAILED\",
    \"method\": \"VNPAY\",
    \"signature\": \"$SIG_FAILED\"
  }"
```

**Verify in DB:**
```sql
SELECT id, transaction_code, status
FROM payments
WHERE order_id = (SELECT id FROM orders WHERE order_code = 'ORD-20260411-X7K9P2');

-- Expected: row with status = 'FAILED'
-- Order status remains 'PENDING' (the customer can retry)
```

---

### Scenario C — Duplicate webhook (idempotency)

Call the exact same webhook twice with the same `transaction_code`.

```bash
# Use the same TXN and SIG from Scenario A (or generate a new SUCCESS webhook first)
# Call it a second time:
curl -s -X POST $BASE/payments/webhook \
  -H "Content-Type: application/json" \
  -d "{
    \"order_code\": \"$ORDER_CODE\",
    \"transaction_code\": \"$TXN\",
    \"amount\": $FORMATTED_AMOUNT,
    \"payment_status\": \"SUCCESS\",
    \"method\": \"VNPAY\",
    \"signature\": \"$SIG\"
  }"
```

**Expected:** `OK` — the endpoint is idempotent.

**Verify in DB:**
```sql
SELECT id, transaction_code, status
FROM payments
WHERE transaction_code = '<your TXN value>';

-- Expected: exactly ONE row with status = 'SUCCESS'
-- The second call detected the existing SUCCESS row and exited without changes.
```

---

### Scenario D — Wrong amount

The gateway reports an amount that does not match `orders.total_amount` exactly.

```bash
WRONG_AMOUNT="1.00"   # Not the real order total
TXN_WRONG="VNP-WRONG-$(date +%s)"

SIG_WRONG=$(echo -n "${TXN_WRONG}|${ORDER_CODE}|${WRONG_AMOUNT}|SUCCESS" \
  | openssl dgst -sha256 -hmac "$SECRET" \
  | awk '{print $2}')

curl -s -X POST $BASE/payments/webhook \
  -H "Content-Type: application/json" \
  -d "{
    \"order_code\": \"$ORDER_CODE\",
    \"transaction_code\": \"$TXN_WRONG\",
    \"amount\": $WRONG_AMOUNT,
    \"payment_status\": \"SUCCESS\",
    \"method\": \"VNPAY\",
    \"signature\": \"$SIG_WRONG\"
  }"
```

**Expected:** `OK`

**Verify in DB:**
```sql
SELECT id, transaction_code, amount, status
FROM payments
WHERE transaction_code = '<TXN_WRONG value>';

-- Expected: row with status = 'FAILED'
-- Order status remains unchanged ('PENDING')
```

---

### Scenario E — Invalid signature

```bash
curl -s -X POST $BASE/payments/webhook \
  -H "Content-Type: application/json" \
  -d "{
    \"order_code\": \"$ORDER_CODE\",
    \"transaction_code\": \"VNP-FAKE-001\",
    \"amount\": $FORMATTED_AMOUNT,
    \"payment_status\": \"SUCCESS\",
    \"method\": \"VNPAY\",
    \"signature\": \"0000000000000000000000000000000000000000000000000000000000000000\"
  }"
```

**Expected:** `OK` — the endpoint always returns 200. Internally the webhook is rejected and logged as a warning. No payment record is created.

**Verify:** No new row in `payments` for `transaction_code = 'VNP-FAKE-001'`.

---

## 5. Status Flow

### Payment status flow

```
POST /payments/create
        │
        ▼
  [PENDING]  ◄── Payment record created (gateway not yet called)
        │
        ▼  (webhook arrives)
   ┌────┴────┐
[SUCCESS]  [FAILED]

SUCCESS conditions: amount matches + order was PENDING + gateway reports SUCCESS
FAILED conditions:  amount mismatch OR gateway reports FAILED OR order was EXPIRED
```

### Order status flow (payment-relevant portion)

```
[PENDING]
    │
    │  Webhook SUCCESS + order still PENDING
    ▼
 [PAID]
    │
    │  Async inventory allocation completes
    ▼
[PROCESSING]
    │
    ├──► [COMPLETED]
    ├──► [PARTIALLY_COMPLETED]
    └──► [PAID_PENDING_STOCK]   (out of stock)


Alternative paths from PENDING:
    │
    ├──► [EXPIRED]   (cron job runs after 15 minutes with no payment)
    └──► [FAILED]    (payment explicitly failed, not retried)
```

### Refund status flow

```
Auto-created when:
  webhook SUCCESS arrives BUT order is already EXPIRED

        [PENDING]   ◄── Created automatically by PaymentServiceImpl
            │
            │  Manual admin action
            ▼
    ┌───────┴───────┐
[PROCESSED]     [FAILED]
```

Refund records are visible in the `refunds` table:
```sql
SELECT r.id, r.amount, r.reason, r.status, r.created_at,
       o.order_code, p.transaction_code
FROM refunds r
JOIN orders  o ON o.id = r.order_id
JOIN payments p ON p.id = r.payment_id
ORDER BY r.created_at DESC;
```

---

## 6. Common Mistakes

| Mistake | Error | Fix |
|---------|-------|-----|
| Calling `/create` on a non-PENDING order | `400 Cannot create payment for order in status: PAID` | Only call `/create` once per PENDING order |
| Using wrong amount in signature calculation | Webhook rejected, payment FAILED | Use `toPlainString()` format: `150000.00`, not `1.5E+5` |
| Not including `signature` field | Webhook rejected silently (200 OK but no processing) | Always compute and include the signature |
| Calling `/create` twice for same order | Second call creates a second PENDING payment row | This is allowed but only one can ever reach SUCCESS (enforced by DB partial unique index) |
| Case sensitivity in `payment_status` | `FAILED` check is case-insensitive; `SUCCESS` check uses `equalsIgnoreCase` | Safe to use any case, but prefer uppercase to match enum names |
