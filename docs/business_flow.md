# BUSINESS FLOW SPECIFICATION
**Version:** 2.1 (FINAL PRODUCTION AUDIT — ALL REMAINING RACE CONDITIONS AND SECURITY GAPS RESOLVED)
Digital Goods E-commerce Platform

---

## 1. ASYNC STRATEGY

- Use @Async (Spring Boot) with ThreadPoolTaskExecutor
- No RabbitMQ / Kafka (by design)
- ThreadPoolTaskExecutor must be configured with explicit parameters:
  - corePoolSize: 5
  - maxPoolSize: 20
  - queueCapacity: 100
  - threadNamePrefix: "async-pool-"

Flow:
  Webhook → validate → update DB → @Async allocateInventory(orderId) → return 200 OK

---

## 2. CRITICAL DESIGN PRINCIPLES

1. Lock in fixed order (ANTI-DEADLOCK): always product_variant_id ASC
2. Keep transactions short — no heavy logic inside @Transactional
3. Use conditional WHERE on every status update — never assume current state
4. Never block the webhook thread — fire-and-forget @Async
5. Every flow must have a fallback for the failure case
6. allocateInventory() must be idempotent — safe to call multiple times

---

## 3. DEADLOCK PREVENTION

Deadlock root cause:
  Order A locks Variant 1 → waits for Variant 2
  Order B locks Variant 2 → waits for Variant 1
  → DB kills one transaction

Solution — always lock in the same order:

  1. Collect all product_variant_ids needed for the order
  2. SORT variant IDs ASC
  3. Issue a SINGLE batch lock query (preferred over per-item loop):

     SELECT * FROM inventory_items
     WHERE product_variant_id IN (?, ?, ...)
     AND status = 'AVAILABLE'
     ORDER BY product_variant_id ASC
     FOR UPDATE

  This locks all rows in the same global order across all concurrent transactions.
  No two transactions can deadlock because they always acquire locks in the same sequence.

---

## 4. @RETRYABLE + @TRANSACTIONAL SEPARATION (CRITICAL)

WRONG (will silently fail on retry):
  @Retryable
  @Transactional
  public void allocateInventory(Long orderId) { ... }
  // Retry runs in the already-aborted PostgreSQL transaction. Always fails.

CORRECT — two separate classes:

  Class: InventoryAllocationFacade  (@Service)
    @Async
    @Retryable(retryFor = PessimisticLockingFailureException.class, maxAttempts = 3, backoff = @Backoff(delay = 500))
    public void allocateWithRetry(Long orderId) {
        inventoryAllocationService.allocateInventory(orderId);
    }

  Class: InventoryAllocationService  (@Service)
    @Transactional
    public void allocateInventory(Long orderId) {
        // all DB work here
    }

Each retry starts a fresh transaction. Deadlock exception causes rollback, then
@Retryable starts a new call → new @Transactional → new transaction.

---

## 5. PAYMENT FLOW (WEBHOOK — FULLY IDEMPOTENT)

Entry point: POST /api/v1/payments/webhook

```
Step 1: VALIDATE SIGNATURE
  → Verify HMAC-SHA256 signature from request
  → If invalid → return 400 BAD REQUEST immediately
  → NEVER skip this step

Step 2: EXTRACT transaction_code from payload

Step 3: CHECK EXISTING PAYMENT — WITH ROW LOCK
  SELECT * FROM payments WHERE transaction_code = ? FOR UPDATE
  ← FOR UPDATE is MANDATORY.
    Serializes concurrent threads arriving with the same transaction_code.
    Without this, two concurrent Case B resumptions race through Steps 5-7 simultaneously,
    causing the second thread to find rows_updated=0 on the order update and incorrectly
    mark the payment as FAILED while the order is actually PAID.

  CASE A — payment found AND status = 'SUCCESS':
    → Already fully processed
    → Return 200 OK

  CASE B — payment found AND status = 'PENDING':
    → Previous call inserted the row but crashed before completing
    → Resume from Step 5 (DO NOT re-insert)
    → The FOR UPDATE lock ensures only one thread resumes at a time

  CASE C — payment not found:
    → Proceed to Step 4

Step 4: INSERT PAYMENT (status = PENDING)
  INSERT INTO payments (order_id, method, transaction_code, amount, status)
  VALUES (?, ?, ?, ?, 'PENDING')

  If DataIntegrityViolationException (race condition — another thread just inserted):
    → Return 200 OK

Step 5: VALIDATE AMOUNT
  SELECT * FROM orders WHERE id = order_id
  IF order.total_amount != payment.amount → UPDATE payment SET status='FAILED', return 200 OK

Step 6: CONDITIONAL ORDER UPDATE (ANTI-RACE-CONDITION — CRITICAL)
  UPDATE orders
  SET status = 'PAID', updated_at = NOW()
  WHERE id = ? AND status = 'PENDING'
  ← Mandatory conditional WHERE. Guards against concurrent cron EXPIRED transition.

  IF rows_updated = 0:
    Re-read current order status (SELECT orders WHERE id = ?):

    IF order.status = 'PAID':
      → A concurrent thread already set this order to PAID and marked payment SUCCESS
      → Do NOT touch payment status — it is already correct
      → Return 200 OK

    IF order.status = 'EXPIRED':
      → Cron beat us. Money received, order expired. Manual refund required.
      → UPDATE payment SET status = 'FAILED'
      → Log WARNING: order_code, transaction_code, amount
      → Return 200 OK

    IF order.status IN ('PROCESSING', 'COMPLETED', 'PARTIALLY_COMPLETED', 'PAID_PENDING_STOCK'):
      → Order already delivered (very late duplicate webhook)
      → Do NOT touch payment status
      → Return 200 OK

  IF rows_updated = 1:
    → Continue

Step 7: UPDATE PAYMENT STATUS
  UPDATE payments SET status = 'SUCCESS' WHERE id = ?
  ← The partial unique index ON payments(order_id) WHERE status='SUCCESS'
     provides a final DB-level guard against duplicate SUCCESS rows.

Step 8: TRIGGER ASYNC ALLOCATION (NON-BLOCKING)
  inventoryAllocationFacade.allocateWithRetry(orderId)
  ← Must be called OUTSIDE @Transactional scope (after commit).
    If called inside, the async thread starts before PAID status is committed
    and reads stale data.

Step 9: RETURN 200 OK IMMEDIATELY
```

Steps 3–7 inside a single @Transactional in PaymentService.
Step 8 called from PaymentController or a non-transactional wrapper after the service method returns.

---

## 6. INVENTORY ALLOCATION FLOW (IDEMPOTENT + DEADLOCK-SAFE)

Trigger: called by InventoryAllocationFacade.allocateWithRetry() (async, retryable)
Implemented in: InventoryAllocationService.allocateInventory() (@Transactional)

```
Step 1: SET ORDER STATUS = 'PROCESSING'
  UPDATE orders SET status = 'PROCESSING', updated_at = NOW()
  WHERE id = ? AND status = 'PAID'
  ← Conditional WHERE prevents double-processing in recovery scenarios

Step 2: LOAD ORDER ITEMS
  SELECT * FROM order_items WHERE order_id = ?

Step 3: IDEMPOTENCY CHECK PER ITEM
  For each order_item:
    IF EXISTS (SELECT 1 FROM deliveries WHERE order_item_id = ?)
    → Skip this item (already delivered — idempotent recovery)
    → Add to success_items

Step 4: COLLECT VARIANTS NEEDING ALLOCATION
  items_to_allocate = order_items WHERE no existing delivery

Step 5: EXTRACT AND SORT VARIANT IDs
  variant_ids = [item.product_variant_id for item in items_to_allocate]
  variant_ids.sort() ASC
  ← MANDATORY sort for deadlock prevention

Step 6: BATCH LOCK (single query)
  SELECT * FROM inventory_items
  WHERE product_variant_id IN (variant_ids)
  AND status = 'AVAILABLE'
  ORDER BY product_variant_id ASC
  FOR UPDATE
  ← All rows locked in a single round-trip, in sorted order

Step 7: ALLOCATE PER ITEM
  For each item in items_to_allocate (iterate in product_variant_id ASC order):
    available = locked rows WHERE product_variant_id = item.product_variant_id
                                LIMIT item.quantity

    IF len(available) >= item.quantity:
      → UPDATE inventory_items SET status = 'SOLD' WHERE id IN (available ids)
      → INSERT INTO deliveries (order_item_id, inventory_item_id, delivered_at)
         ← No delivered_data field. The credential is read at response time via
           inventory_items.data_encrypted through the inventory_item_id FK.
      → Add to success_items

    ELSE:
      → Add to failed_items (partial stock is acceptable only if none available;
        if 0 available → failed; do NOT partially fulfill a single line item)

Step 8: DETERMINE FINAL ORDER STATUS
  IF failed_items is empty:
    → UPDATE orders SET status = 'COMPLETED', updated_at = NOW()

  ELSE IF success_items is not empty AND failed_items is not empty:
    → UPDATE orders SET status = 'PARTIALLY_COMPLETED', updated_at = NOW()

  ELSE (success_items is empty):
    → UPDATE orders SET status = 'PAID_PENDING_STOCK', updated_at = NOW()

Step 9: COMMIT TRANSACTION

Step 10: POST-COMMIT SIDE EFFECTS (outside @Transactional)
  IF failed_items is not empty:
    → Send notification to admin (async, non-blocking)
    → entity_type = 'ORDER', entity_id = order.id

  IF success_items is not empty:
    → Send delivery email to customer (async, non-blocking)
    → Email contains decrypted delivered_data items
```

IMPORTANT: NEVER throw an exception that propagates out of allocateInventory().
Even on out-of-stock, update order status and exit cleanly. The customer's money
has been received. Crashing the async job without updating order status creates
a permanently stuck PAID order.

---

## 7. ORDER EXPIRY CRON

Schedule: @Scheduled(cron = "0 */5 * * * *")  — every 5 minutes

```
Query expired candidates:
  SELECT id FROM orders
  WHERE status = 'PENDING'
  AND created_at < NOW() - INTERVAL '15 minutes'

For each candidate:
  UPDATE orders
  SET status = 'EXPIRED', updated_at = NOW()
  WHERE id = ? AND status = 'PENDING'
  ← MANDATORY conditional WHERE

  IF rows_updated = 0:
    → A webhook arrived concurrently and set status = 'PAID'
    → Log INFO "Order {id} was paid concurrently — skip expiry"
    → Continue to next candidate (do not treat as error)
```

This conditional update is the only safe way to resolve the cron vs webhook race.
The last writer wins at the DB level, and the correct writer (webhook = PAID) beats
the cron (EXPIRED) because of this guard.

---

## 8. STUCK ORDER RECOVERY CRON

Problem: App crash between PAID commit and @Async task start leaves order in PAID state.

Schedule: @Scheduled(cron = "0 */10 * * * *")  — every 10 minutes

```
Query stuck orders WITH row lock:
  SELECT id FROM orders
  WHERE status = 'PAID'
  AND updated_at < NOW() - INTERVAL '10 minutes'
  FOR UPDATE SKIP LOCKED
  ← SKIP LOCKED is MANDATORY. If the scheduled cron and a manual admin trigger run
    simultaneously, SKIP LOCKED ensures each order is processed by exactly one job.
    Any order already locked by a concurrent recovery thread is silently skipped.

For each stuck order:
  → Log WARNING: "Recovering stuck order {order_code}"
  → Call inventoryAllocationService.allocateInventory(orderId) SYNCHRONOUSLY
     (not async — this IS the recovery path)
  → allocateInventory() is idempotent — safe if called multiple times
```

Manual trigger (admin emergency):
  POST /api/v1/admin/orders/recover-stuck
  → Runs the same query and recovery logic on demand

---

## 9. DISCOUNT CODE — CONCURRENT USAGE PROTECTION

Problem: Multiple concurrent orders using the same discount code can all pass
`used_count < usage_limit` before any commit, allowing over-use.

Solution — lock the discount code row before reading:

```
Inside createOrder() @Transactional:

  Step 1: SELECT * FROM discount_codes
          WHERE code = ? AND is_active = true
          FOR UPDATE
          ← This serializes concurrent order creation for this code

  Step 2: Validate:
    - code exists
    - expired_at > NOW()
    - used_count < usage_limit
    - is_active = true

  Step 3: If all valid → calculate discounted total
          (result must be >= 0; never negative)

  Step 4: Apply discount to order total_amount

  Step 5: UPDATE discount_codes SET used_count = used_count + 1 WHERE id = ?
          ← Inside the same transaction, after order and order_items are inserted

  Step 6: COMMIT
```

If the transaction rolls back for any reason, used_count is not incremented.
The SELECT FOR UPDATE ensures only one transaction at a time can modify this code.

---

## 10. ORDER CREATION FLOW

Entry: POST /api/v1/orders
Request body: { "email": "...", "phone": "...", "discountCode": "..." (optional) }
Note: No `items` field in the request. Items are read from the cart_items table.

```
Step 1: IDENTIFY CALLER
  IF Authorization header present AND JWT valid:
    user_id = extracted from JWT
  ELSE:
    user_id = null (guest order)
    session_id = from X-Session-ID header

Step 2: LOAD CART ITEMS FROM DB
  IF user_id is not null:
    cart_items = SELECT * FROM cart_items WHERE user_id = ?
  ELSE IF session_id is not null:
    cart_items = SELECT * FROM cart_items WHERE session_id = ?
  ELSE:
    cart_items = [] (empty)

  IF cart_items is empty → 400 BAD REQUEST: "Cart is empty"

Step 3: VALIDATE CART ITEMS
  - email: required, valid format
  - phone: required
  - For each cart_item:
    → product_variant must exist (is_deleted = false on parent product)
    → stock check:
      COUNT(inventory_items WHERE product_variant_id = ? AND status = 'AVAILABLE') >= cart_item.quantity
      IF insufficient → 400 BAD REQUEST

Step 4: PRICE SNAPSHOT (CRITICAL — never trust client prices)
  For each cart_item: fetch price from product_variants.price
  Store in order_items.price

Step 5: CALCULATE TOTAL
  subtotal = SUM(cart_item.quantity * variant.price)

Step 6: APPLY DISCOUNT (if discount_code provided)
  → Lock and validate discount code (see §9)
  → Calculate final total_amount (min 0)

Step 7: GENERATE ORDER CODE
  Format: ORD-{YYYYMMDD}-{6-char random alphanumeric uppercase}
  Example: ORD-20260404-X7K9P2
  Must be unique — retry generation on collision (rare)

Step 8: ATOMIC DB WRITE (single @Transactional)
  INSERT orders (status = PENDING)
  INSERT order_items (with price snapshot from product_variants.price)
  UPDATE discount_codes.used_count += 1  (if applicable)
  DELETE cart_items WHERE user_id = ? OR session_id = ?
  ← Cart deletion is inside the same @Transactional — if the order fails to save,
     the cart is NOT cleared (rollback keeps cart intact for retry).

Step 9: RETURN order_code and order details
```

---

## 11. ORDER LOOKUP FLOW

Entry: POST /api/v1/orders/lookup  (Public — no JWT required)
Request body: { "order_code": "ORD-20260404-X7K9P2", "email": "user@example.com" }

```
Step 1: Find order by order_code
  IF not found → 404 NOT FOUND

Step 2: Validate email
  IF orders.email != request.email (case-insensitive) → 403 FORBIDDEN
  ← This prevents enumeration of other users' orders

Step 3: Load order_items and deliveries
  For each order_item with a delivery:
    → JOIN deliveries.inventory_item_id → inventory_items.data_encrypted
    → Decrypt data_encrypted (AES-256, key from env DATA_ENCRYPTION_KEY)
    → Include decrypted credential in response
    ← There is no delivered_data field. The credential is always read via FK join.

Step 4: Return full order details including decrypted delivery credentials

Step 5: Normalize lookup email before comparison
  Store emails lowercase at write time → compare with plain = (not ILIKE)
```

SECURITY NOTE:
  - order_code must use random suffix (not sequential) to prevent enumeration
  - Email gate is mandatory — even if order_code is leaked, the email protects access
  - Decrypted credentials appear ONLY in this endpoint response, never in lists or admin views

---

## 12. WARRANTY RESOLVE FLOW (ASYNC)

Entry: PUT /api/v1/admin/warranty/{id}/resolve  (Admin only)

```
Step 1: ADMIN CALLS RESOLVE
  → Verify requester has role = ADMIN
  → Load warranty_request by id
  → Update status = IN_PROGRESS, updated_at = NOW()
  → Insert warranty_log (admin_id = current admin, action = "Admin initiated resolution")
  → Trigger @Async allocateInventoryForWarranty(warrantyRequestId)
  → Return 200 OK immediately

Step 2: ASYNC WARRANTY ALLOCATION (@Transactional)

  Load warranty_request + order_item + product_variant_id

  LOCK new inventory item:
    SELECT * FROM inventory_items
    WHERE product_variant_id = ?
    AND status = 'AVAILABLE'
    LIMIT 1
    FOR UPDATE

  CASE: Stock available
    → Update old inventory_item.status = 'REVOKED'
       (the key previously delivered — now recalled)
    → Update new inventory_item.status = 'SOLD'
    → UPDATE deliveries SET
         inventory_item_id = new_item.id,
         delivered_at = NOW()
       WHERE order_item_id = ?
       ← No delivered_data field. After this update, the order lookup response
         automatically reads the new credential via the updated inventory_item_id FK.
    → UPDATE warranty_requests SET status = 'RESOLVED', updated_at = NOW()
    → INSERT warranty_log (admin_id = NULL, action = "System: replacement key allocated successfully")

  CASE: Out of stock
    → UPDATE warranty_requests SET status = 'PENDING_STOCK', updated_at = NOW()
    → INSERT warranty_log (admin_id = NULL, action = "System: out of stock — pending restock")
    → Notify admin (async notification)

  COMMIT
```

---

## 13. TRANSACTION ISOLATION SUMMARY

| Flow | Isolation Level | Notes |
|---|---|---|
| All writes | READ COMMITTED (default) | PostgreSQL default — sufficient with row-level locks |
| Inventory allocation | READ COMMITTED + SELECT FOR UPDATE | Pessimistic locking handles concurrency |
| Discount code usage | READ COMMITTED + SELECT FOR UPDATE | Row lock serializes concurrent usage |
| Order expiry cron | READ COMMITTED + conditional UPDATE WHERE | Optimistic state guard sufficient |
| Payment webhook | READ COMMITTED + conditional UPDATE WHERE | Optimistic state guard + unique constraint |

Do NOT use SERIALIZABLE isolation — it dramatically reduces throughput with no benefit
given the explicit row-level locking already in place.

---

## 14. FINAL SYSTEM FLOW SUMMARY

```
[USER]
  → POST /api/v1/orders          → Insert order (PENDING) + snapshot prices
  → POST /api/v1/payments/create → Get payment URL/QR

[PAYMENT GATEWAY]
  → User pays on gateway
  → POST /api/v1/payments/webhook
      → Validate signature
      → Idempotency check (see §5)
      → Conditional UPDATE order WHERE status = 'PENDING' → PAID
      → @Async → allocateInventory

[ASYNC ALLOCATION (InventoryAllocationFacade → InventoryAllocationService)]
  → Sort variants → Batch SELECT FOR UPDATE
  → Allocate → Insert deliveries
  → Update order → COMPLETED / PARTIALLY_COMPLETED / PAID_PENDING_STOCK
  → Send email (if items delivered)
  → Notify admin (if any failed)

[CRON: every 5 min]
  → Expire PENDING orders > 15 min (conditional WHERE status = 'PENDING')

[CRON: every 10 min]
  → Recover PAID orders stuck > 10 min (re-trigger allocation)
```
