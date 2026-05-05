# API DOCUMENTATION — INVENTORY MODULE
**Version:** 1.0 (Production)
**Last updated:** 2026-04-12
**Base URL:** `http://localhost:8080`

---

## 1. MODULE OVERVIEW

The Inventory module manages the complete lifecycle of digital goods (keys and account
credentials) from the moment they are imported by an admin, through automatic allocation
after payment confirmation, to delivery to the customer.

### 1.1 What This Module Does

- **Bulk import:** Admins upload plaintext keys/credentials via API. Each item is
  AES-256-CBC encrypted before storage. Raw values are never written to the database.
- **Automatic allocation:** After a payment webhook confirms success, the system
  asynchronously assigns specific inventory items to each order line and records them
  in the `deliveries` table.
- **Partial fulfillment:** If stock is insufficient, the order is partially fulfilled.
  Items that could not be delivered leave the order in `PARTIALLY_COMPLETED` or
  `PAID_PENDING_STOCK` state — never silently dropped.
- **Recovery:** Two cron jobs run continuously to expire unpaid orders and recover
  orders stuck in `PAID` state due to app crashes.

### 1.2 Enum Values

**`InventoryItemType`** — the format of the stored digital credential:

| Value     | Description                                                             |
|-----------|-------------------------------------------------------------------------|
| `KEY`     | A single activation key (e.g., `XXXXX-XXXXX-XXXXX`)                    |
| `ACCOUNT` | A username:password credential (e.g., `user@email.com:password123`)    |

**`InventoryItemStatus`** — lifecycle state of a single inventory item:

| Value       | Description                                                          |
|-------------|----------------------------------------------------------------------|
| `AVAILABLE` | In stock, ready to be allocated to an order                         |
| `SOLD`      | Allocated to an order and delivered to the customer                 |
| `IN_USE`    | Reserved for the account-profiles slot model (future v1.1)          |
| `BANNED`    | Invalidated due to fraud or key revocation — cannot be re-issued    |
| `REVOKED`   | Recalled during a warranty replacement (old key exchanged for new)  |

### 1.3 Order Status Flow After Payment

```
                ┌─── COMPLETED            (all items delivered)
PAID → PROCESSING ─┤
                │─── PARTIALLY_COMPLETED  (some items delivered; some out of stock)
                └─── PAID_PENDING_STOCK   (payment received but zero items allocated)
```

The customer's money is always safe. Even if no stock is available, the order
reaches `PAID_PENDING_STOCK` — never left in a permanently broken state.

### 1.4 Encryption

All credentials are stored with **AES-256-CBC** encryption.
- Storage format: `Base64( IV[16 bytes] || AES_CBC_PKCS5(plaintext) )`
- Key: derived from env var `DATA_ENCRYPTION_KEY` via SHA-256 (supports any key length)
- Decryption happens only inside the `/api/v1/orders/lookup` response handler
- Raw credentials are **never** logged, returned in list APIs, or stored in plain text

---

## 2. ADMIN ENDPOINTS

All endpoints under `/api/v1/admin/**` require:
- A valid JWT token in the `Authorization` header
- The token must belong to a user with `role = ADMIN`

### 2.1 Bulk Import Keys / Accounts

**`POST /api/v1/admin/inventory`**

Imports a list of digital credentials for a specific product variant. Each key is
AES-256 encrypted before being written to `inventory_items` with `status = AVAILABLE`.

#### Request Headers

```
Content-Type:  application/json
Authorization: Bearer <admin_jwt_token>
```

#### Request Body

```json
{
  "variantId": 42,
  "type": "KEY",
  "keys": [
    "ABCDE-12345-FGHIJ-67890",
    "KLMNO-11111-PQRST-22222",
    "UVWXY-33333-ZABCD-44444"
  ]
}
```

| Field      | Type             | Required | Description                                                     |
|------------|------------------|----------|-----------------------------------------------------------------|
| `variantId`| Long             | Yes      | ID of the `product_variants` row these keys belong to           |
| `type`     | String (enum)    | Yes      | `KEY` or `ACCOUNT` — the credential format                      |
| `keys`     | Array of String  | Yes      | List of plaintext credentials. Must contain at least one item.  |

> **Security note:** Keys are transmitted in plaintext over HTTPS and encrypted
> server-side before storage. Ensure HTTPS is enforced in production.

#### Responses

**201 Created — import successful:**
```json
{
  "code": 201,
  "message": "Success",
  "data": "Imported 3 item(s) for variantId=42"
}
```

> Note: The controller returns HTTP 201 but `ApiResponse.code` is 200 (the
> `ApiResponse.success()` factory sets code=200). Use the HTTP status code for
> flow control in client code.

**400 Bad Request — validation failure (missing or empty fields):**
```json
{
  "code": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "variantId", "message": "variantId is required" },
    { "field": "keys",      "message": "At least one key must be provided" }
  ]
}
```

**400 Bad Request — invalid enum value for `type`:**
```json
{
  "code": 400,
  "message": "Malformed or unreadable request body"
}
```

**401 Unauthorized — missing or invalid JWT:**
```json
{
  "code": 401,
  "message": "Unauthorized: Full authentication is required to access this resource"
}
```

**403 Forbidden — token belongs to a CUSTOMER, not ADMIN:**
```json
{
  "code": 403,
  "message": "Forbidden: Access Denied"
}
```

**404 Not Found — variantId does not exist:**
```json
{
  "code": 404,
  "message": "Product variant not found: 42"
}
```

#### cURL Example

```bash
TOKEN="eyJhbGciOiJIUzI1NiJ9..."   # paste your admin JWT here

curl -s -X POST http://localhost:8080/api/v1/admin/inventory \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "variantId": 42,
    "type": "KEY",
    "keys": [
      "ABCDE-12345-FGHIJ-67890",
      "KLMNO-11111-PQRST-22222",
      "UVWXY-33333-ZABCD-44444"
    ]
  }' | jq
```

---

### 2.2 View Stock Statistics

**`GET /api/v1/admin/inventory/{variantId}`**

Returns live stock counts for a product variant: how many items are available,
sold, and the total ever imported.

#### Request Headers

```
Authorization: Bearer <admin_jwt_token>
```

#### Path Parameter

| Parameter   | Type | Description                                    |
|-------------|------|------------------------------------------------|
| `variantId` | Long | ID of the product variant to inspect           |

#### Responses

**200 OK — stock data returned:**
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "variantId": 42,
    "variantName": "1 Month Premium",
    "available": 47,
    "sold": 13,
    "total": 60
  }
}
```

| Field         | Type   | Description                                              |
|---------------|--------|----------------------------------------------------------|
| `variantId`   | Long   | The queried variant ID                                   |
| `variantName` | String | Human-readable name from `product_variants.name`         |
| `available`   | Long   | COUNT of items with `status = AVAILABLE`                 |
| `sold`        | Long   | COUNT of items with `status = SOLD`                      |
| `total`       | Long   | Total rows in `inventory_items` for this variant (all statuses) |

> **Stock source of truth:** Counts query the `inventory_items` table directly.
> There is no `stock` field on `product_variants`.

**401 Unauthorized:**
```json
{
  "code": 401,
  "message": "Unauthorized: Full authentication is required to access this resource"
}
```

**403 Forbidden:**
```json
{
  "code": 403,
  "message": "Forbidden: Access Denied"
}
```

**404 Not Found — variantId does not exist:**
```json
{
  "code": 404,
  "message": "Product variant not found: 42"
}
```

#### cURL Example

```bash
TOKEN="eyJhbGciOiJIUzI1NiJ9..."

curl -s http://localhost:8080/api/v1/admin/inventory/42 \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

### 2.3 Manual Stuck-Order Recovery

**`POST /api/v1/admin/orders/recover-stuck`**

Manually triggers the stuck-order recovery job. Finds all orders with
`status = PAID` and `updated_at` older than 10 minutes, then re-runs inventory
allocation for each synchronously.

Use this when:
- The application crashed after a payment was confirmed but before the async
  allocation task ran.
- An order has been in `PAID` state for longer than expected.

> **Performance note:** This endpoint is synchronous — it does not return until
> all stuck orders have been processed. Under heavy load with many stuck orders,
> the response may take several seconds.

#### Request Headers

```
Authorization: Bearer <admin_jwt_token>
```

#### Request Body

None.

#### Responses

**200 OK — recovery job completed:**
```json
{
  "code": 200,
  "message": "Success",
  "data": "Stuck order recovery triggered"
}
```

The `data` message is always `"Stuck order recovery triggered"` regardless of
how many orders were processed. Check application logs for per-order details.

**401 Unauthorized:**
```json
{
  "code": 401,
  "message": "Unauthorized: Full authentication is required to access this resource"
}
```

**403 Forbidden:**
```json
{
  "code": 403,
  "message": "Forbidden: Access Denied"
}
```

#### cURL Example

```bash
TOKEN="eyJhbGciOiJIUzI1NiJ9..."

curl -s -X POST http://localhost:8080/api/v1/admin/orders/recover-stuck \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## 3. AUTOMATIC BACKGROUND FLOWS

These flows have no API endpoints — they are internal services. Frontend developers
need to understand them to build correct UI state machines.

### 3.1 Automatic Allocation After Payment (Primary Flow)

**Trigger:** A valid payment webhook arrives at `POST /api/v1/payments/webhook`.

**Sequence:**
```
1. Webhook validates HMAC-SHA256 signature
2. Order status: PENDING → PAID  (inside webhook @Transactional)
3. Webhook returns 200 OK immediately
4. @Async InventoryAllocationFacade.allocateWithRetry(orderId) fires
   └─ Runs in background thread pool (corePool=5, maxPool=20)
   └─ @Retryable: up to 3 retries on PessimisticLockingFailureException (500ms backoff)
5. InventoryAllocationService.allocateInventory(orderId) runs:
   a. Order: PAID → PROCESSING
   b. Loads order items
   c. Idempotency check: skips items already in `deliveries` table
   d. Collects variant IDs, sorts ASC (deadlock prevention)
   e. Single batch SELECT FOR UPDATE (all variants locked in one query)
   f. Allocates items: sets inventory_items.status = SOLD,
      inserts rows into deliveries table
   g. Determines final status:
      → COMPLETED            (all items delivered)
      → PARTIALLY_COMPLETED  (some delivered, some out of stock)
      → PAID_PENDING_STOCK   (no items could be delivered)
   h. After commit: logs admin alert (if failures), logs delivery notification (if success)
```

**What FE should do:**

After the user completes payment on the gateway, poll `POST /api/v1/orders/lookup`
every 2–3 seconds (max 30 seconds total) to detect the status transition:

```
PAID         → allocation in progress, keep polling
PROCESSING   → allocation in progress, keep polling
COMPLETED    → success, show delivered credentials
PARTIALLY_COMPLETED → show delivered items + "some products awaiting restock"
PAID_PENDING_STOCK  → show "Order confirmed — awaiting stock replenishment"
```

Credentials are returned in the `POST /api/v1/orders/lookup` response.
See `docs/api/api-order.md` for the exact response shape.

> **Important:** Credentials (decrypted `data_encrypted`) are returned ONLY in the
> `/orders/lookup` endpoint. They do NOT appear in any list API or admin view.

---

### 3.2 Order Expiry Cron (Every 5 Minutes)

**Schedule:** `0 */5 * * * *` (every 5 minutes, on the minute)

**What it does:**
- Finds all orders with `status = PENDING` AND `created_at < NOW() - 15 minutes`
- For each candidate: `UPDATE orders SET status = 'EXPIRED' WHERE id = ? AND status = 'PENDING'`
- If the update affects 0 rows: a payment webhook arrived concurrently and set the
  order to `PAID` — the cron silently skips it (no race condition)

**What FE should do:**

Display a **15-minute countdown timer** on the payment page, starting from `order.created_at`.
When the timer reaches zero, show an expiry message and redirect the user away from
the payment page. Do NOT allow the user to attempt payment after expiry.

```
Order created_at        +0 min   countdown starts: 15:00
                        +14 min  countdown shows:   1:00  (user should hurry)
                        +15 min  order becomes EXPIRED on next cron run
```

> The cron runs every 5 minutes, not every second. An order may remain in `PENDING`
> state for up to 5 minutes after the 15-minute threshold before the cron transitions it.
> Design the FE timer to be informational — the server is the source of truth.

---

### 3.3 Stuck Order Recovery Cron (Every 10 Minutes)

**Schedule:** `0 */10 * * * *` (every 10 minutes, on the minute)

**Problem it solves:**
If the application crashes after `order.status = PAID` is committed but before the
`@Async allocateInventory()` task runs (e.g., server restart, OOM kill), the order
remains permanently in `PAID` state with no inventory allocated.

**What it does:**
- Finds orders with `status = PAID` AND `updated_at < NOW() - 10 minutes`
- Uses `FOR UPDATE SKIP LOCKED` — if a concurrent recovery job is already processing
  an order, it is skipped to prevent double-processing
- Calls `allocateInventory(orderId)` synchronously for each stuck order
- `allocateInventory()` is idempotent: safe to call multiple times

**What FE should do:**

Nothing special. The recovery is transparent. If a user reports that their paid order
is stuck displaying status `PAID` or `PROCESSING` for more than 10–15 minutes, advise
them to wait. The recovery cron will pick it up automatically.

An admin can also trigger recovery immediately via
`POST /api/v1/admin/orders/recover-stuck` (see §2.3).

---

## 4. TESTING GUIDE

Full end-to-end flow from import to credential delivery.

### Prerequisites

- Application running on `http://localhost:8080`
- PostgreSQL running with the schema applied
- At least one product and product variant exist in the database
- `DATA_ENCRYPTION_KEY` env var set (or use the dev default)

---

### Step 1 — Login as Admin and Get Token

```bash
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin_password"
  }' | jq

# Copy the token from the response:
# { "code": 200, "data": { "token": "eyJ..." } }
TOKEN="eyJ..."
```

---

### Step 2 — Import Inventory Keys for a Variant

Replace `variantId` with the ID of a product variant you want to test with.
This example imports 3 game activation keys.

```bash
curl -s -X POST http://localhost:8080/api/v1/admin/inventory \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "variantId": 1,
    "type": "KEY",
    "keys": [
      "STEAM-ABCDE-12345-FGHIJ",
      "STEAM-KLMNO-67890-PQRST",
      "STEAM-UVWXY-11111-ZABCD"
    ]
  }' | jq

# Expected: HTTP 201
# { "code": 200, "message": "Success", "data": "Imported 3 item(s) for variantId=1" }
```

For account-type credentials (username:password format):

```bash
curl -s -X POST http://localhost:8080/api/v1/admin/inventory \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "variantId": 2,
    "type": "ACCOUNT",
    "keys": [
      "user1@netflix.com:P@ssw0rd#1",
      "user2@netflix.com:S3cur3P@ss!2"
    ]
  }' | jq
```

---

### Step 3 — Verify Stock Statistics

```bash
curl -s http://localhost:8080/api/v1/admin/inventory/1 \
  -H "Authorization: Bearer $TOKEN" | jq

# Expected:
# {
#   "code": 200,
#   "message": "Success",
#   "data": {
#     "variantId": 1,
#     "variantName": "1 Month Premium",
#     "available": 3,
#     "sold": 0,
#     "total": 3
#   }
# }
```

---

### Step 4 — Create an Order

This uses the cart-based order flow. Add a cart item first, then create the order.

```bash
# Add item to cart (as a guest — no JWT needed)
SESSION="test-session-$(date +%s)"

curl -s -X POST http://localhost:8080/api/v1/cart \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: $SESSION" \
  -d '{
    "variantId": 1,
    "quantity": 1
  }' | jq

# Create the order
curl -s -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: $SESSION" \
  -d '{
    "email": "customer@example.com",
    "phone": "0901234567"
  }' | jq

# Copy the order_code from the response:
# { "data": { "orderCode": "ORD-20260412-X7K9P2", ... } }
ORDER_CODE="ORD-20260412-X7K9P2"
```

---

### Step 5 — Create Payment and Trigger Webhook

```bash
# Create payment URL
curl -s -X POST http://localhost:8080/api/v1/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "order_code": "'"$ORDER_CODE"'",
    "method": "VNPAY"
  }' | jq

# Simulate webhook SUCCESS
# The webhook requires a valid HMAC-SHA256 signature.
# See docs/api/api-payment.md §3 for signature generation.
# Quick example using the dev secret "dev-webhook-secret-change-in-production":

ORDER_CODE_VAL="$ORDER_CODE"
TXN_CODE="TXN-$(date +%s)"
AMOUNT="100000.00"   # must match order total_amount exactly
STATUS="SUCCESS"
SECRET="dev-webhook-secret-change-in-production"
MESSAGE="${TXN_CODE}|${ORDER_CODE_VAL}|${AMOUNT}|${STATUS}"
SIG=$(echo -n "$MESSAGE" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')

curl -s -X POST http://localhost:8080/api/v1/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "transactionCode": "'"$TXN_CODE"'",
    "orderCode": "'"$ORDER_CODE_VAL"'",
    "amount": '"$AMOUNT"',
    "paymentStatus": "SUCCESS",
    "method": "VNPAY",
    "signature": "'"$SIG"'"
  }' | jq

# Expected: HTTP 200 (webhook always returns 200)
```

---

### Step 6 — Verify Database State (Optional)

Connect to PostgreSQL and run:

```sql
-- Check order status (should be COMPLETED)
SELECT id, order_code, status FROM orders WHERE order_code = 'ORD-20260412-X7K9P2';

-- Check inventory items (should be SOLD)
SELECT ii.id, ii.status, ii.type
FROM inventory_items ii
JOIN order_items oi ON oi.product_variant_id = ii.product_variant_id
JOIN orders o ON o.id = oi.order_id
WHERE o.order_code = 'ORD-20260412-X7K9P2';

-- Check delivery records
SELECT d.id, d.delivered_at, d.order_item_id, d.inventory_item_id
FROM deliveries d
JOIN order_items oi ON oi.id = d.order_item_id
JOIN orders o ON o.id = oi.order_id
WHERE o.order_code = 'ORD-20260412-X7K9P2';
```

---

### Step 7 — Retrieve Delivered Credentials

Poll order lookup after webhook to get decrypted credentials.

```bash
curl -s -X POST http://localhost:8080/api/v1/orders/lookup \
  -H "Content-Type: application/json" \
  -d '{
    "order_code": "ORD-20260412-X7K9P2",
    "email": "customer@example.com"
  }' | jq

# When status = COMPLETED, the response includes decrypted credentials
# See docs/api/api-order.md for the full response shape.
```

---

### Scenario A — Partial Fulfillment (PARTIALLY_COMPLETED)

Import fewer keys than the order quantity requires.

```bash
# Import only 1 key for variant 1
curl -s -X POST http://localhost:8080/api/v1/admin/inventory \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "variantId": 1,
    "type": "KEY",
    "keys": ["ONLY-ONE-KEY-ABCDE"]
  }' | jq

# Create order with 2 items of variant 1 (e.g., quantity: 2 via cart)
# ... create order + trigger webhook SUCCESS ...

# Expected order status after webhook: PARTIALLY_COMPLETED
# 1 delivery record created (for the 1 available key)
# inventory_items: 1 row SOLD, remaining 0 AVAILABLE
```

---

### Scenario B — No Stock (PAID_PENDING_STOCK)

```bash
# Check stock — ensure variant has 0 AVAILABLE items
curl -s http://localhost:8080/api/v1/admin/inventory/1 \
  -H "Authorization: Bearer $TOKEN" | jq
# "available": 0

# Create order for variant 1 (note: stock check happens at order creation,
# but the cart module checks stock at add-to-cart time too)
# If the cart was added when stock existed but stock was depleted before
# the webhook fires, the order ends up PAID_PENDING_STOCK.

# Alternatively: import 0 keys, attempt order via DB direct insert for testing.
```

---

### Scenario C — Manual Recovery Trigger

```bash
# Simulate a stuck PAID order by modifying DB directly:
# UPDATE orders SET status = 'PAID', updated_at = NOW() - INTERVAL '15 minutes'
# WHERE order_code = 'ORD-20260412-STUCK1';

# Trigger recovery via admin endpoint
curl -s -X POST http://localhost:8080/api/v1/admin/orders/recover-stuck \
  -H "Authorization: Bearer $TOKEN" | jq

# Expected:
# { "code": 200, "message": "Success", "data": "Stuck order recovery triggered" }
# The stuck order will be allocated synchronously before the response returns.
# Check application logs for: "Recovering stuck order: id=X code=ORD-..."
```

---

### Scenario D — Order Expiry

```bash
# Create an order but do NOT pay for it
# ... create order as in Step 4 ...

# Simulate 15+ minutes elapsed by updating DB directly:
# UPDATE orders SET created_at = NOW() - INTERVAL '20 minutes'
# WHERE order_code = 'ORD-20260412-EXPIRY1';

# Wait for the expiry cron to run (every 5 minutes), or observe logs:
# "Expiry cron: expired order id=X code=ORD-20260412-EXPIRY1"

# Verify:
# SELECT status FROM orders WHERE order_code = 'ORD-20260412-EXPIRY1';
# → EXPIRED
```

---

## 5. STATUS FLOW TABLE

### Order Status Flow (Full Inventory Lifecycle)

```
[Order Created]
      │
      ▼
   PENDING ──── (15 min) ──────────────────────────► EXPIRED
      │                                               (expiry cron)
      │ (payment webhook SUCCESS)
      ▼
    PAID ──── (10 min, app crash) ─────────────────► PAID (recovered by cron/admin)
      │
      │ (@Async allocateInventory — PAID → PROCESSING)
      ▼
  PROCESSING
      │
      ├── all items delivered ───────────────────────► COMPLETED
      │
      ├── some delivered, some out of stock ──────────► PARTIALLY_COMPLETED
      │
      └── zero items delivered (no stock at all) ─────► PAID_PENDING_STOCK

[Payment explicitly failed]
   PENDING ──────────────────────────────────────────► FAILED
```

### InventoryItem Status Flow

```
   AVAILABLE ──── (allocated to order) ──────────────► SOLD

      SOLD ──────── (warranty replacement) ──────────► REVOKED
                        (new item: AVAILABLE → SOLD)
```

| Status      | Meaning                                   | Can be re-issued? |
|-------------|-------------------------------------------|-------------------|
| `AVAILABLE` | Ready for allocation                      | N/A               |
| `SOLD`      | Delivered to customer                     | No (via warranty replace only) |
| `IN_USE`    | Slot model — account partially shared     | Depends on slot   |
| `BANNED`    | Revoked due to fraud / invalid key        | No                |
| `REVOKED`   | Replaced via warranty — no longer valid   | No                |

---

## 6. FRONTEND GUIDANCE

### 6.1 Post-Payment Polling Strategy

After the user completes payment on the gateway, the backend processes the webhook
asynchronously. The FE must poll to detect completion.

**Recommended polling implementation:**

```javascript
async function pollOrderStatus(orderCode, email, maxAttempts = 15) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 2000)); // wait 2 seconds

    const res = await fetch('/api/v1/orders/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_code: orderCode, email })
    });
    const json = await res.json();
    const status = json.data?.status;

    if (status === 'COMPLETED') {
      showDeliveredCredentials(json.data.items);
      return;
    }
    if (status === 'PARTIALLY_COMPLETED') {
      showPartialDelivery(json.data.items);
      return;
    }
    if (status === 'PAID_PENDING_STOCK') {
      showPendingStockMessage();
      return;
    }
    if (status === 'FAILED' || status === 'EXPIRED') {
      showPaymentFailedMessage();
      return;
    }
    // status = PAID or PROCESSING → keep polling
  }

  // Timed out after 30 seconds
  showProcessingMessage('Your payment is being processed. Check back shortly.');
}
```

### 6.2 Status Message Copy

| Order Status          | Recommended UI Message                                                   |
|-----------------------|--------------------------------------------------------------------------|
| `PAID`                | "Payment confirmed. Preparing your order..."                             |
| `PROCESSING`          | "Allocating your items..."                                               |
| `COMPLETED`           | "Your order is ready! Credentials are shown below."                      |
| `PARTIALLY_COMPLETED` | "Some items delivered. The following products are awaiting restock: ..." |
| `PAID_PENDING_STOCK`  | "Payment received. Your order is awaiting stock replenishment. We will notify you by email." |
| `EXPIRED`             | "This order has expired. Please create a new order to continue."         |
| `FAILED`              | "Payment was not successful. Please try again."                          |

### 6.3 Checkout Timer (15-Minute Countdown)

Display a visible countdown timer on the payment page. The timer should start from
`order.created_at` (returned in the create-order response).

```javascript
function startCheckoutTimer(createdAt, onExpiry) {
  const EXPIRY_MS = 15 * 60 * 1000; // 15 minutes
  const expiresAt = new Date(createdAt).getTime() + EXPIRY_MS;

  const interval = setInterval(() => {
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      clearInterval(interval);
      onExpiry(); // navigate away, show expiry message
    } else {
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      updateTimerDisplay(`${mins}:${secs.toString().padStart(2, '0')}`);
    }
  }, 1000);
}
```

> **Note:** The server processes expiry on a 5-minute cron cycle. An order may
> technically still be `PENDING` for a few minutes after the 15-minute window
> depending on when the cron last ran. The FE timer is for user experience only —
> the server enforces expiry independently.

### 6.4 Do NOT Retry Admin Endpoints Without Logging

`POST /api/v1/admin/orders/recover-stuck` is idempotent but can be slow under load.
Do not auto-retry it from the FE. If an admin triggers recovery and sees no immediate
change, advise them to wait for the cron (every 10 minutes) or check server logs.

### 6.5 Credential Display Security

- Display decrypted credentials only after the user authenticates via the order lookup
  (requires correct `order_code` + `email`)
- Do not cache or store credentials in `localStorage` — they should be fetched from
  `/orders/lookup` on demand
- Mask credentials by default (e.g., blur or `***`) and reveal on user action
- For `ACCOUNT` type items, show username and password in a format that allows
  copy-paste without exposing the password in page source

---

## 7. QUICK REFERENCE

### Endpoint Summary

| Method | Path                                  | Auth         | Description                        |
|--------|---------------------------------------|--------------|------------------------------------|
| POST   | `/api/v1/admin/inventory`             | JWT + ADMIN  | Bulk import keys/accounts (JSON)   |
| POST   | `/api/v1/admin/inventory/import`      | JWT + ADMIN  | Bulk import via file upload        |
| GET    | `/api/v1/admin/inventory/{variantId}` | JWT + ADMIN  | Stock statistics for a variant     |
| POST   | `/api/v1/admin/orders/recover-stuck`  | JWT + ADMIN  | Manual stuck-order recovery        |

### Background Job Summary

| Job                    | Schedule       | Threshold  | Action                              |
|------------------------|----------------|------------|-------------------------------------|
| OrderExpiryCron        | Every 5 min    | 15 minutes | PENDING → EXPIRED (conditional)     |
| StuckOrderRecoveryCron | Every 10 min   | 10 minutes | Re-run allocation for stuck PAID    |

### Key Configuration

| Property                              | Env Var / Default | Description                                    |
|---------------------------------------|-------------------|------------------------------------------------|
| `data.encryption.key`                 | `DATA_ENCRYPTION_KEY` | AES-256 key for credential encryption      |
| `payment.webhook.secret`              | `PAYMENT_WEBHOOK_SECRET` | HMAC-SHA256 secret for webhook signing  |
| `spring.servlet.multipart.max-file-size` | `5MB`          | Maximum upload file size for file import       |

---

## 8. FILE IMPORT ENDPOINT

### `POST /api/v1/admin/inventory/import`

**Auth:** JWT Bearer token + role `ADMIN`
**Content-Type:** `multipart/form-data`

#### Request Parameters

| Parameter   | Type            | Required | Description                                          |
|-------------|-----------------|----------|------------------------------------------------------|
| `file`      | MultipartFile   | Yes      | The file to import. Accepted: `.csv`, `.xlsx`, `.xls` |
| `variantId` | Long            | Yes      | The product variant ID to assign keys to             |
| `type`      | InventoryItemType | Yes    | `KEY` or `ACCOUNT`                                   |

#### File Format Rules

**CSV (`.csv`)**
- UTF-8 encoding
- One key or credential per line
- Blank lines are automatically skipped (counted in `skipped`)
- Leading/trailing whitespace is trimmed

Example:
```
XXXXX-XXXXX-XXXXX-XXXXX
YYYYY-YYYYY-YYYYY-YYYYY

ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ
```

**Excel (`.xlsx` / `.xls`)**
- Only **Column A** is read; all other columns are ignored
- Each row with a value in Column A becomes one key
- Blank rows (no cell value in Column A) are skipped
- Cell values are formatted as strings (numeric cells use default formatting)
- Only the **first sheet** is processed

#### Validation

| Rule                   | HTTP Status | Error message                                              |
|------------------------|-------------|-------------------------------------------------------------|
| File is empty          | 400         | `File must not be empty`                                   |
| File > 5 MB            | 400         | `File size exceeds the 5 MB limit`                         |
| Wrong extension        | 400         | `Unsupported file format '<ext>'. Accepted: .csv, .xlsx, .xls` |
| variantId not found    | 404         | `Product variant not found: <id>`                          |
| 0 valid keys in file   | 400         | `File contains no valid keys after skipping N blank line(s)` |

#### Response `201 Created`

```json
{
  "code": 201,
  "message": "Created",
  "data": {
    "imported":   150,
    "skipped":      3,
    "total_rows":  153
  }
}
```

| Field        | Description                                           |
|--------------|-------------------------------------------------------|
| `imported`   | Number of keys successfully encrypted and saved       |
| `skipped`    | Number of blank lines/rows ignored                    |
| `total_rows` | `imported + skipped` — total rows read from the file  |

#### Example `curl`

```bash
curl -X POST http://localhost:8080/api/v1/admin/inventory/import \
  -H "Authorization: Bearer <admin-token>" \
  -F "file=@/path/to/keys.csv" \
  -F "variantId=4" \
  -F "type=KEY"
```

#### Security Notes

- Keys are AES-256-CBC encrypted immediately upon receipt. Plaintext is never persisted.
- The encryption key is derived from the `DATA_ENCRYPTION_KEY` environment variable.
- Import is atomic within a single `@Transactional` — if encryption or DB write fails, no items are saved.
