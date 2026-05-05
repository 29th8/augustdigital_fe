# ERD — Digital Goods E-commerce Platform
**Version:** 2.1 (FINAL PRODUCTION AUDIT — ALL RACE CONDITIONS AND DB INTEGRITY ISSUES RESOLVED)
**Database:** PostgreSQL

---

## CHANGELOG v2.1 (Final Production Audit)
- Added partial unique index `ON payments(order_id) WHERE status='SUCCESS'` — DB-level one-SUCCESS-per-order enforcement
- Removed `deliveries.delivered_data` — redundant encrypted copy; credential read via `inventory_item_id → inventory_items.data_encrypted` FK join
- Changed `deliveries.order_item_id` from plain index to **UNIQUE** constraint — enforces 1-1 at DB level
- Added partial unique indexes on `cart_items` for `(user_id, product_variant_id)` and `(session_id, product_variant_id)` — prevents duplicate cart rows under concurrent add-to-cart
- Added email normalization rule — all emails stored lowercase; comparisons use plain `=`

## CHANGELOG v2.0 (Post-Review)
- Unified all ENUM values (see CLAUDE.md §25 for canonical definitions)
- Added `PROCESSING`, `COMPLETED`, `PARTIALLY_COMPLETED`, `PAID_PENDING_STOCK`, `FAILED`, `EXPIRED` to `orders.status`
- Added `BANNED`, `REVOKED` to `inventory_items.status`
- Added `PENDING_STOCK` to `warranty_requests.status`
- Added UNIQUE constraint on `payments.transaction_code`
- Added UNIQUE constraint on `discount_codes.code`
- Removed `product_variants.stock` — stock source of truth is now `inventory_items`
- Changed `orders` ↔ `payments` from 1-1 to 1-N (supports payment retry)
- Added `orders.updated_at`
- Added `warranty_requests.user_id` (nullable FK); kept `user_email` for guest context
- Added `warranty_logs.admin_id` (nullable FK)
- Added `notifications.recipient_email`, `notifications.entity_type`, `notifications.entity_id`
- Added `discount_codes.is_active`
- Added comprehensive index definitions

---

## 1. Entities

### 1.1 `users`
| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | Primary key |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Login email |
| `password` | VARCHAR(255) | NOT NULL | BCrypt-hashed password — NEVER expose |
| `role` | ENUM('ADMIN','CUSTOMER') | NOT NULL, DEFAULT 'CUSTOMER' | Role — always assigned by server, never from request |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Registration time |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last profile update |

---

### 1.2 `categories`
| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | Primary key |
| `name` | VARCHAR(100) | UNIQUE, NOT NULL | Category name |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation time |

---

### 1.3 `products`
| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | Primary key |
| `name` | VARCHAR(255) | NOT NULL | Product name |
| `category_id` | BIGINT | FK → categories.id, NOT NULL | Category reference |
| `description` | TEXT | | Full description |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Visible to public |
| `is_deleted` | BOOLEAN | NOT NULL, DEFAULT FALSE | Soft delete flag |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation time |

---

### 1.4 `product_variants`
| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | Primary key |
| `product_id` | BIGINT | FK → products.id, NOT NULL | Parent product |
| `name` | VARCHAR(255) | NOT NULL | Variant name (e.g. "1 month", "Family Plan") |
| `price` | DECIMAL(15,2) | NOT NULL, CHECK (price > 0) | Sale price |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation time |

**REMOVED FIELD:** `stock` — stock is derived from `inventory_items`.
Available stock = `COUNT(*) FROM inventory_items WHERE product_variant_id = ? AND status = 'AVAILABLE'`
This is the ONLY valid stock check. No other field stores stock count.

---

### 1.5 `cart_items`
| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | Primary key |
| `user_id` | BIGINT | FK → users.id, NULLABLE | Set if user is logged in |
| `session_id` | VARCHAR(128) | NULLABLE | Set if user is a guest (Header: X-Session-ID) |
| `product_variant_id` | BIGINT | FK → product_variants.id, NOT NULL | Variant reference |
| `quantity` | INT | NOT NULL, CHECK (quantity > 0) | Item quantity |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Added time |

**Constraint:** Either `user_id` or `session_id` must be non-null (enforced at application layer).
**Order creation:** `POST /api/v1/orders` reads items directly from this table (by `user_id` or `session_id`) instead of accepting an `items` array in the request body. The cart is cleared atomically within the same `@Transactional` after the order is saved.
**Constraint:** Cart uniqueness is enforced at DB level via two partial unique indexes (see §3):
  - `CREATE UNIQUE INDEX idx_cart_user_variant ON cart_items(user_id, product_variant_id) WHERE user_id IS NOT NULL`
  - `CREATE UNIQUE INDEX idx_cart_session_variant ON cart_items(session_id, product_variant_id) WHERE session_id IS NOT NULL`
Application-layer upsert alone is not safe under concurrent add-to-cart requests.

---

### 1.6 `orders`
| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | Primary key |
| `order_code` | VARCHAR(32) | UNIQUE, NOT NULL | Auto-generated: ORD-YYYYMMDD-[6-char random alphanumeric] |
| `user_id` | BIGINT | FK → users.id, NULLABLE | Null for guest orders |
| `email` | VARCHAR(255) | NOT NULL | Contact email (used for delivery + lookup validation) |
| `phone` | VARCHAR(20) | NOT NULL | Contact phone |
| `total_amount` | DECIMAL(15,2) | NOT NULL | Final amount after discount |
| `discount_code_id` | BIGINT | FK → discount_codes.id, NULLABLE | Applied discount (if any) |
| `status` | ENUM | NOT NULL, DEFAULT 'PENDING' | See status values below |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Order creation time |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last status change time |

**`orders.status` ENUM values (CANONICAL):**
- `PENDING` — created, awaiting payment
- `PAID` — payment confirmed by webhook
- `PROCESSING` — inventory allocation in progress (set at start of allocateInventory)
- `COMPLETED` — all items successfully allocated and delivered
- `PARTIALLY_COMPLETED` — some items delivered; some out of stock
- `PAID_PENDING_STOCK` — payment received but zero items could be allocated (all out of stock)
- `FAILED` — payment explicitly failed
- `EXPIRED` — payment not received within 15 minutes (set by cron)

---

### 1.7 `order_items`
| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | Primary key |
| `order_id` | BIGINT | FK → orders.id, NOT NULL | Parent order |
| `product_variant_id` | BIGINT | FK → product_variants.id, NOT NULL | Purchased variant |
| `quantity` | INT | NOT NULL, CHECK (quantity > 0) | Quantity purchased |
| `price` | DECIMAL(15,2) | NOT NULL | Unit price snapshot at time of purchase — never recalculated |

---

### 1.8 `payments`
| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | Primary key |
| `order_id` | BIGINT | FK → orders.id, NOT NULL | Associated order (1 order → N payments) |
| `method` | ENUM('VNPAY','MOMO') | NOT NULL | Payment gateway used |
| `transaction_code` | VARCHAR(255) | **UNIQUE**, NULLABLE | Gateway transaction code. NULL until gateway responds. Set once, never changed. |
| `amount` | DECIMAL(15,2) | NOT NULL | Payment amount — must equal order.total_amount |
| `status` | ENUM('PENDING','SUCCESS','FAILED') | NOT NULL, DEFAULT 'PENDING' | Payment state |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Payment initiation time |

**Relationship note:** One order can have multiple payment rows (retry attempts).
Only one row per order may ever reach `status = SUCCESS`.
DB-LEVEL ENFORCEMENT via partial unique index (see §3 Indexes):
  `CREATE UNIQUE INDEX idx_one_success_payment ON payments(order_id) WHERE status = 'SUCCESS'`
Application-layer checks alone are NOT sufficient — a race condition between concurrent
payment retries can bypass them before either transaction commits.

**Idempotency:** `transaction_code` UNIQUE constraint is the database-level guard.
See CLAUDE.md §19 for the full idempotency algorithm including `SELECT FOR UPDATE`.

---

### 1.9 `inventory_items`
| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | Primary key |
| `product_variant_id` | BIGINT | FK → product_variants.id, NOT NULL | Associated variant |
| `type` | ENUM('KEY','ACCOUNT') | NOT NULL | Digital goods type |
| `data_encrypted` | TEXT | NOT NULL | AES-256 encrypted credential (key or account:password). Key = env var DATA_ENCRYPTION_KEY |
| `status` | ENUM | NOT NULL, DEFAULT 'AVAILABLE' | See status values below |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Import time |

**`inventory_items.status` ENUM values (CANONICAL):**
- `AVAILABLE` — in stock, ready to allocate
- `SOLD` — allocated to an order and delivered
- `IN_USE` — used for account_profiles slot model (not yet allocated to a specific order)
- `BANNED` — revoked due to fraud or invalid key (cannot be re-issued)
- `REVOKED` — recalled during warranty replacement (old key exchanged for new one)

---

### 1.10 `account_profiles`
| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | Primary key |
| `inventory_item_id` | BIGINT | FK → inventory_items.id, NOT NULL | Parent account item |
| `profile_name` | VARCHAR(100) | NOT NULL | Profile slot name (e.g. "Profile 1") |
| `pin_code` | VARCHAR(50) | | Access PIN for this profile |
| `status` | ENUM('AVAILABLE','IN_USE') | NOT NULL, DEFAULT 'AVAILABLE' | Profile slot status |

**Note:** This table supports the slot-sharing model. Full allocation flow for account_profiles is deferred to v1.1. In v1.0, only KEY and single-account types are allocated.

---

### 1.11 `deliveries`
| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | Primary key |
| `order_item_id` | BIGINT | FK → order_items.id, **UNIQUE**, NOT NULL | The order line this delivery fulfills — UNIQUE enforces 1-1 at DB level |
| `inventory_item_id` | BIGINT | FK → inventory_items.id, NOT NULL | The inventory record issued. Updated to new item on warranty replacement. |
| `delivered_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Delivery timestamp |

**No `delivered_data` field.** The delivered credential is ALWAYS read at query time via:
  `inventory_items.data_encrypted` through the `inventory_item_id` FK join.
Decryption happens only within the `/orders/lookup` response handler.

**Why no `delivered_data`:** Storing a duplicate copy of AES-encrypted credentials doubles
the sensitive data attack surface with no functional benefit. The `inventory_item_id` FK
already points to the single authoritative copy in `inventory_items.data_encrypted`.
During warranty replacement, updating `inventory_item_id` to the new item is sufficient —
the new credential is immediately accessible via the same join.

**`order_item_id` UNIQUE constraint:** Prevents two delivery rows for the same order_item.
The 1-1 relationship (order_items → deliveries) is enforced at the database level, not only
in application code.

---

### 1.12 `warranty_requests`
| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | Primary key |
| `order_item_id` | BIGINT | FK → order_items.id, NOT NULL | The purchased item under warranty |
| `user_id` | BIGINT | FK → users.id, NULLABLE | Owning user (null for guest-originated orders) |
| `user_email` | VARCHAR(255) | NOT NULL | Email for contact and ownership verification |
| `description` | TEXT | NOT NULL | Problem description |
| `status` | ENUM | NOT NULL, DEFAULT 'OPEN' | See status values below |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Request creation time |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last status change time |

**`warranty_requests.status` ENUM values (CANONICAL):**
- `OPEN` — submitted, awaiting admin review
- `IN_PROGRESS` — admin is actively processing
- `RESOLVED` — new key/account issued successfully
- `PENDING_STOCK` — out of stock at time of resolution; will be fulfilled when restocked

**Ownership validation rule:** For requests from authenticated users, match `user_id` from JWT.
For guest orders, match `user_email` against `orders.email` for the order containing the `order_item_id`.

---

### 1.13 `warranty_logs`
| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | Primary key |
| `warranty_id` | BIGINT | FK → warranty_requests.id, NOT NULL | Parent warranty request |
| `admin_id` | BIGINT | FK → users.id, NULLABLE | Admin who performed the action (null if system-generated log) |
| `action` | VARCHAR(500) | NOT NULL | Human-readable description of the action taken |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Log entry time |

**Rule:** Every status transition of a warranty_request MUST produce a warranty_log entry.
System-generated logs (async flow) have `admin_id = NULL`.

---

### 1.14 `discount_codes`
| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | Primary key |
| `code` | VARCHAR(50) | **UNIQUE**, NOT NULL | Voucher code entered by user |
| `type` | ENUM('PERCENT','FIXED') | NOT NULL | Discount calculation method |
| `value` | DECIMAL(15,2) | NOT NULL, CHECK (value > 0) | Discount value (percent or fixed amount) |
| `usage_limit` | INT | NOT NULL, CHECK (usage_limit > 0) | Maximum allowed uses |
| `used_count` | INT | NOT NULL, DEFAULT 0, CHECK (used_count >= 0) | Uses so far |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Manual on/off switch for the code |
| `expired_at` | TIMESTAMP | NOT NULL | Expiry datetime |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Creation time |

**Concurrent usage rule (CRITICAL):**
When validating a discount code during order creation, the code row MUST be locked with
`SELECT ... FOR UPDATE` before reading `used_count`. This prevents race conditions where
multiple concurrent orders pass the `used_count < usage_limit` check simultaneously.

---

### 1.15 `notifications`
| Field | Type | Constraints | Description |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | Primary key |
| `type` | ENUM('EMAIL','TELEGRAM') | NOT NULL | Delivery channel |
| `recipient_email` | VARCHAR(255) | | Email recipient (for EMAIL type) |
| `entity_type` | VARCHAR(50) | | Context type: 'ORDER', 'WARRANTY', 'SYSTEM' |
| `entity_id` | BIGINT | | ID of the related entity (order.id, warranty_request.id, etc.) |
| `content` | TEXT | NOT NULL | Notification body |
| `status` | ENUM('SENT','FAILED') | NOT NULL | Delivery outcome |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Send attempt time |

---

## 2. Relationships

| Relationship | Cardinality | Notes |
|---|---|---|
| users → orders | 1-N | user_id nullable for guest orders |
| users → cart_items | 1-N | user_id nullable for guest carts |
| categories → products | 1-N | |
| products → product_variants | 1-N | Each product must have ≥ 1 variant |
| product_variants → inventory_items | 1-N | Each variant has 0-N physical inventory records |
| inventory_items → account_profiles | 1-N | Only for ACCOUNT type items |
| orders → order_items | 1-N | Each order has ≥ 1 item |
| orders → payments | **1-N** | Multiple payment attempts per order; max 1 SUCCESS |
| orders → discount_codes | N-1 | Optional; nullable discount_code_id on orders |
| order_items → deliveries | 1-1 | One delivery per order line |
| order_items → warranty_requests | 1-N | Multiple warranty requests per purchased item |
| warranty_requests → warranty_logs | 1-N | Full audit trail |

---

## 3. Database Indexes

All indexes below must be created. Critical indexes are marked.

### `users`
- `idx_users_email` ON users(email) — UNIQUE (already covered by constraint; explicitly name it)

### `products`
- `idx_products_category_id` ON products(category_id)
- `idx_products_active` ON products(is_active, is_deleted) — for public listing filter

### `product_variants`
- `idx_product_variants_product_id` ON product_variants(product_id)

### `cart_items`
- `idx_cart_items_user_id` ON cart_items(user_id) — logged-in cart lookup
- `idx_cart_items_session_id` ON cart_items(session_id) — **CRITICAL** guest cart lookup
- `idx_cart_user_variant` UNIQUE ON cart_items(user_id, product_variant_id) WHERE user_id IS NOT NULL — **CRITICAL** prevents duplicate cart rows for logged-in users
- `idx_cart_session_variant` UNIQUE ON cart_items(session_id, product_variant_id) WHERE session_id IS NOT NULL — **CRITICAL** prevents duplicate cart rows for guests

### `orders`
- `idx_orders_order_code` ON orders(order_code) — UNIQUE (lookup by code)
- `idx_orders_user_id` ON orders(user_id) — user order history
- `idx_orders_status` ON orders(status) — cron + admin filter
- `idx_orders_status_created_at` ON orders(status, created_at) — **CRITICAL** expiry cron query
- `idx_orders_status_updated_at` ON orders(status, updated_at) — **CRITICAL** stuck order recovery query

### `order_items`
- `idx_order_items_order_id` ON order_items(order_id) — **CRITICAL** join for allocation
- `idx_order_items_product_variant_id` ON order_items(product_variant_id)

### `payments`
- `idx_payments_transaction_code` UNIQUE ON payments(transaction_code) — idempotency check
- `idx_payments_order_id` ON payments(order_id) — lookup payments for an order
- `idx_one_success_payment` UNIQUE ON payments(order_id) WHERE status = 'SUCCESS' — **CRITICAL** DB-level enforcement that only one SUCCESS payment exists per order. Partial unique index. Cannot be replaced by application-layer checks alone.

### `inventory_items`
- `idx_inventory_product_variant_status` ON inventory_items(product_variant_id, status) — **CRITICAL** allocation + stock count query
- This index is the single most important index in the system. Every allocation and every stock check uses it.

### `deliveries`
- `idx_deliveries_order_item_id` UNIQUE ON deliveries(order_item_id) — **CRITICAL** enforces 1-1 at DB level; prevents duplicate deliveries for the same order_item. Must be UNIQUE, not a plain index.
- `idx_deliveries_inventory_item_id` ON deliveries(inventory_item_id)

### `warranty_requests`
- `idx_warranty_order_item_id` ON warranty_requests(order_item_id)
- `idx_warranty_user_id` ON warranty_requests(user_id)
- `idx_warranty_status` ON warranty_requests(status) — admin ticket listing

### `discount_codes`
- `idx_discount_codes_code` ON discount_codes(code) — UNIQUE (lookup by code string)

---

## 4. Entity-Level Soft Delete Rule

Only `products` uses soft delete via `is_deleted`.

All queries on `products` and joins from `product_variants` through to `products`
MUST filter `is_deleted = false`. Use `@SQLRestriction("is_deleted = false")` on the
Product entity to apply this globally, so all repository queries filter automatically.

---

## 5. Stock Count — Implementation Note

`product_variants` does NOT have a `stock` field.

Wherever stock count is needed:
1. **Cart validation:** `COUNT(*) FROM inventory_items WHERE product_variant_id = ? AND status = 'AVAILABLE'`
2. **Admin stock view:** Same query, exposed via `/api/v1/admin/inventory/{variantId}`
3. **Allocation:** `SELECT * FROM inventory_items WHERE product_variant_id = ? AND status = 'AVAILABLE' ORDER BY product_variant_id ASC FOR UPDATE`

The index `idx_inventory_product_variant_status (product_variant_id, status)` makes all three fast.
