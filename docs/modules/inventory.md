# MODULE: INVENTORY ALLOCATION

---

## 1. ENTITIES

- **InventoryItem** (`id`, `product_variant_id`, `data_encrypted`, `status`, `cost_price`)
- **AccountProfile** (`id`, `inventory_item_id`, `profile_name`, `pin_code_encrypted`, `status`, `max_slots`, `assigned_slots`)
- **Delivery** (`id`, `order_item_id`, `inventory_item_id`, `account_profile_id`, `delivered_at`)
- **ProductVariant** — now has `fulfillment_type` column (INSTANT_DIRECT | INSTANT_SHARED | MANUAL)
- **Order** / **OrderItem** — used to update status and read allocation targets

---

## 2. FULFILLMENT TYPES

| FulfillmentType   | Description |
|-------------------|-------------|
| `INSTANT_DIRECT`  | Default. One dedicated key or account per customer. `InventoryItem.status → SOLD`. |
| `INSTANT_SHARED`  | One master account shared across multiple customers via `AccountProfile` slots. Master item status unchanged; `AccountProfile.assigned_slots` incremented. |
| `MANUAL`          | Admin delivers manually. Not auto-allocated; order stays in `PAID_PENDING_STOCK`. |

---

## 3. API / TRIGGER POINTS

- **Internal service** — no direct public endpoint.
- **Auto trigger (Async):** Called from `PaymentWebhookService` after payment confirmed (`@Async` → `allocateInventory(orderId)`).
- **Recovery cron:** Every 10 minutes — picks up PAID orders stuck > 10 min and calls `allocateInventory` synchronously (`SKIP LOCKED`).

### Admin Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/admin/inventory` | Bulk-import keys / accounts (JSON body) |
| `POST` | `/api/v1/admin/inventory/import` | Bulk-import from .csv / .xlsx file |
| `GET`  | `/api/v1/admin/inventory/{variantId}` | Stock stats (available, sold, total) |
| `POST` | `/api/v1/admin/inventory/profiles` | Import profile slots for INSTANT_SHARED account |

---

## 4. ALLOCATION ALGORITHM

### Step 1 — Guard
`UPDATE orders SET status='PROCESSING' WHERE id=? AND status='PAID'`
If rows_updated = 0 → another thread is already processing → exit.

### Step 2 — Load order items
`SELECT * FROM order_items WHERE order_id = ?`

### Step 3 — Idempotency check
For each item: `SELECT EXISTS (SELECT 1 FROM deliveries WHERE order_item_id = ?)`.
Already-delivered items are counted as success without re-allocating.

### Step 4 — Split by fulfillment type
- `directItems` — items where `fulfillment_type != 'INSTANT_SHARED'`
- `sharedItems` — items where `fulfillment_type = 'INSTANT_SHARED'`

### Step 5a — INSTANT_DIRECT allocation (anti-deadlock)
1. Collect distinct variant IDs from `directItems`, **sort ASC**.
2. Single batch lock:
   ```sql
   SELECT * FROM inventory_items
   WHERE product_variant_id IN (...)
     AND status = 'AVAILABLE'
   ORDER BY product_variant_id ASC
   FOR UPDATE
   ```
3. Iterate sorted items; for each: poll required quantity from pool.
   - Success → `status = SOLD`, insert `Delivery(inventoryItem=inv, accountProfile=null)`.
   - Insufficient stock → add to `failedItems`.

### Step 5b — INSTANT_SHARED allocation (anti-deadlock)
1. Collect distinct variant IDs from `sharedItems`, **sort ASC**.
2. Single batch lock on account_profiles:
   ```sql
   SELECT ap.* FROM account_profiles ap
   JOIN inventory_items ii ON ii.id = ap.inventory_item_id
   WHERE ii.product_variant_id IN (...)
     AND ap.status = 'AVAILABLE'
     AND ap.assigned_slots < ap.max_slots
   ORDER BY ii.product_variant_id ASC, ap.id ASC
   FOR UPDATE
   ```
3. For each sharedItem:
   - Pick one available profile from pool.
   - `profile.assigned_slots += 1`
   - If `assigned_slots == max_slots` → `profile.status = ASSIGNED`
   - Save profile.
   - Insert `Delivery(inventoryItem=profile.inventoryItem, accountProfile=profile)`.
   - Success → add to `successItems`.
   - No profile available → add to `failedItems`.

### Step 6 — Final order status
| successItems | failedItems | Final Status |
|---|---|---|
| all | 0 | `COMPLETED` |
| some | some | `PARTIALLY_COMPLETED` |
| 0 | all | `PAID_PENDING_STOCK` |

---

## 5. ORDER LOOKUP — CREDENTIAL RESPONSE

`POST /api/v1/orders/lookup` decrypts credentials per delivery:

| Delivery type | `credential` field | `profile_name` field |
|---|---|---|
| INSTANT_DIRECT | `decrypt(inventoryItem.data_encrypted)` | null (omitted) |
| INSTANT_SHARED | `decrypt(accountProfile.pin_code_encrypted)` | `accountProfile.profile_name` |

---

## 6. ADMIN: IMPORT PROFILES (INSTANT_SHARED)

`POST /api/v1/admin/inventory/profiles`

```json
{
  "inventory_item_id": 42,
  "profiles": [
    { "profile_name": "Profile 1", "pin_code": "1234", "max_slots": 1 },
    { "profile_name": "Profile 2", "pin_code": "5678", "max_slots": 1 }
  ]
}
```

- `inventory_item_id` must reference an existing `InventoryItem` (type=ACCOUNT).
- `pin_code` is optional. If provided, it is AES-256 encrypted via `DATA_ENCRYPTION_KEY` before storage.
- `max_slots` ≥ 1. Set > 1 to allow simultaneous sharing of the same profile slot.

---

## 7. DEVELOPMENT RULES

- `@Transactional` lives in `InventoryAllocationServiceImpl`.
- `@Retryable` lives in `InventoryAllocationFacade` (separate class) — never on the same method as `@Transactional`.
- Each retry starts a fresh transaction; ensures pessimistic lock failures are cleanly retried.
- NEVER throw exceptions from the allocation flow — catch and set order status gracefully.
- `DeliveredItem` DTOs (for email) are built inside the transaction while the Hibernate session is open, then passed to the post-commit async callback.
