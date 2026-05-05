# MODULE DOCUMENTATION — REFUNDS
**Version:** 1.0
**Last updated:** 2026-04-26
**Flyway migrations:** V3 (table creation), V10 (schema extension)

---

## 1. OVERVIEW & PURPOSE

### Business Problem

When a customer completes a payment via the payment gateway, there is a narrow race between the gateway webhook and the order-expiry cron job. If the cron transitions the order to `EXPIRED` moments before the webhook arrives, the webhook detects the conflict, records the payment as `FAILED`, and logs a warning — but the customer's money has already left their account. The system cannot automatically reverse a gateway transaction; a human decision is required.

Beyond race-condition refunds, any paid order may require a refund: incorrect items delivered, fraudulent charge disputes, goodwill gestures, etc.

### What This Module Does

- Provides a formal record of every refund request with its full audit trail (who initiated it, who actioned it, when, and why).
- Enforces a simple two-step admin workflow: **create** a record (registers intent), then **process** it (records the outcome).
- Gives customers a read-only view of refunds tied to their own orders.
- Does **not** automatically reverse any gateway payment. The `PROCESSED` status signals that the admin has manually issued the refund through the bank or gateway dashboard outside the system. Future integration with a refund API (VNPAY/MoMo) should update `processRefund()` to call the gateway and only set `PROCESSED` on a successful gateway response.

---

## 2. DATABASE SCHEMA & RELATIONSHIPS

### 2.1 Table: `refunds`

Created by **V3**, extended by **V10**.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `BIGSERIAL` | No | auto | Primary key |
| `payment_id` | `BIGINT` | No | — | FK → `payments.id` — the specific SUCCESS payment being refunded |
| `order_id` | `BIGINT` | No | — | FK → `orders.id` — the parent order |
| `amount` | `NUMERIC(15,2)` | No | — | Refund amount in VND (may differ from order total for partial refunds) |
| `reason` | `VARCHAR(512)` | No | — | Human-readable justification |
| `status` | `VARCHAR(255)` | No | `'PENDING'` | One of: `PENDING`, `PROCESSED`, `REJECTED` |
| `admin_id` | `BIGINT` | Yes | `NULL` | FK (soft) → `users.id` — admin who last acted on this refund |
| `notes` | `VARCHAR(512)` | Yes | `NULL` | Admin commentary added during processing |
| `resolved_at` | `TIMESTAMP(6)` | Yes | `NULL` | Timestamp of the PROCESSED or REJECTED transition |
| `created_at` | `TIMESTAMP(6)` | No | `NOW()` | Row creation time (immutable) |
| `updated_at` | `TIMESTAMP(6)` | No | `NOW()` | Auto-updated on every write (`@UpdateTimestamp`) |
| `resolved_by` | `VARCHAR(255)` | Yes | `NULL` | Legacy column from V3 — superseded by `admin_id` in V10; remains in DB unmapped |

> **Why `admin_id` is a soft FK:** The column references `users.id` by convention but no `FOREIGN KEY` constraint is declared. This avoids a cascading delete issue (deleting an admin account should not cascade-delete audit records). The application layer is responsible for passing a valid user ID.

### 2.2 Indexes

| Index name | Columns | Purpose |
|---|---|---|
| `idx_refunds_payment_id` | `payment_id` | Fast lookup of refunds by payment |
| `idx_refunds_order_id` | `order_id` | Fast lookup of refunds by order (customer history) |
| `idx_refunds_status` | `status` | Fast filtering by status (admin dashboard views) |

### 2.3 Entity Relationships

```
users (id)
  │
  └──[soft ref, no FK constraint]── refunds.admin_id
                                     (who actioned it)

orders (id) ──────────────────────── refunds.order_id  (NOT NULL)
  │
  └── orders.user_id ──────────────── (used to scope customer queries)

payments (id) ────────────────────── refunds.payment_id  (NOT NULL)
  │                                   ← must be a SUCCESS payment
  └── payments.order_id
```

**Key constraint:** A `Refund` row always links to both an `Order` and the specific `Payment` that funded that order. The `payment_id` reference creates an immutable audit link — even if the payment record is later annotated, the refund always points to the exact transaction that was refunded.

---

## 3. STATE MACHINE & LIFECYCLE

### 3.1 State Diagram

```
                   ┌──────────────────────────────────────┐
                   │  Admin: POST /api/v1/admin/refunds   │
                   └───────────────────┬──────────────────┘
                                       │
                                       ▼
                               ┌───────────────┐
                               │    PENDING    │  ← initial state on creation
                               └───────┬───────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    │  Admin: PUT /api/v1/admin/           │
                    │         refunds/{id}/process         │
                    └──────────────────┬──────────────────┘
                                       │
                     ┌─────────────────┴─────────────────┐
                     │                                   │
               status=PROCESSED                   status=REJECTED
                     │                                   │
                     ▼                                   ▼
             ┌───────────────┐                 ┌───────────────┐
             │   PROCESSED   │                 │   REJECTED    │
             │  (terminal)   │                 │  (terminal)   │
             └───────────────┘                 └───────────────┘
```

### 3.2 Transition Rules

| Transition | Trigger | Actor | DB changes |
|---|---|---|---|
| `(none) → PENDING` | `POST /api/v1/admin/refunds` | Admin | INSERT row; `status = PENDING`; `admin_id` = creator's user ID; `resolved_at = NULL` |
| `PENDING → PROCESSED` | `PUT /api/v1/admin/refunds/{id}/process` with `status = PROCESSED` | Admin | UPDATE `status`, `admin_id` (processor), `notes`, `resolved_at = NOW()`, `updated_at = NOW()` |
| `PENDING → REJECTED` | `PUT /api/v1/admin/refunds/{id}/process` with `status = REJECTED` | Admin | Same columns as above; `status = REJECTED` |

**Terminal states:** `PROCESSED` and `REJECTED` are final. Once a refund leaves `PENDING`, it cannot be transitioned again. Any further `processRefund()` call on a non-`PENDING` refund throws `BadRequestException`.

---

## 4. CORE BUSINESS RULES

### 4.1 Pre-conditions for Creating a Refund

| Rule | Enforcement layer | Detail |
|---|---|---|
| Order must exist | Service | `orderRepository.findById()` → `NotFoundException` if missing |
| Order must have a `SUCCESS` payment | Service | `paymentRepository.findFirstByOrder_IdAndStatus(orderId, SUCCESS)` → `BadRequestException` if none found |
| No existing `PENDING` refund for the same order | Service | `refundRepository.findFirstByOrderIdAndStatus(orderId, PENDING)` → `BadRequestException` if present |
| Only admins may create refunds | Security layer | `@PreAuthorize("hasRole('ADMIN')")` on `AdminRefundController` |

**Why the PENDING-duplicate guard?** A refund is an admin intent record, not an automatic action. Allowing two `PENDING` refunds for the same order would create ambiguity about which one to action. After the first is resolved (either `PROCESSED` or `REJECTED`), a new `PENDING` refund may be created for the same order if warranted.

**Why require a SUCCESS payment?** The purpose of a refund is to reverse money that actually moved. An order without a `SUCCESS` payment has no confirmed received funds — there is nothing to refund. This also prevents creating refund records for orders in `PENDING` or `EXPIRED` status where no money was ever collected.

### 4.2 Processing Rules

| Rule | Enforcement layer | Detail |
|---|---|---|
| `status` must be `PROCESSED` or `REJECTED` | Service | Explicit check: `if (status == PENDING) throw BadRequestException` |
| Target refund must be in `PENDING` state | Service | `if (refund.getStatus() != PENDING) throw BadRequestException` |
| Only admins may process refunds | Security layer | `@PreAuthorize("hasRole('ADMIN')")` |
| `notes` is optional | Service | `null` is allowed; stored as-is |

### 4.3 Customer Read Access

| Rule | Enforcement layer | Detail |
|---|---|---|
| Customer sees only their own orders' refunds | Service | `findByOrder_UserId(userId, pageable)` — `userId` derived from JWT, never from request body |
| Customer cannot create or process refunds | Security layer | `/api/v1/admin/refunds/**` is restricted to `ADMIN` role |

### 4.4 Amount vs. Order Total

The `amount` field on a `Refund` is set by the admin and is **not** automatically validated against the order's `total_amount`. This is intentional: admins may issue partial refunds (e.g., refunding only the service fee, not the full product cost). Future iterations may add a maximum-amount guard at the service layer.

---

## 5. INTEGRATION POINTS

### 5.1 Orders Module

- `Refund.order` (ManyToOne → `Order`) is the primary relationship. The service loads the order by ID to validate it exists and to resolve `orderCode` for the response.
- `order.userId` is used by `findByOrder_UserId()` to scope the customer's refund history. This traversal (`order → user`) means the `orders` table is joined whenever a customer lists their refunds.
- The refund module does **not** modify order status. A refund being `PROCESSED` has no effect on `orders.status`. Orders remain in their terminal state (`COMPLETED`, `EXPIRED`, etc.) regardless of refund outcome.

### 5.2 Payments Module

- `Refund.payment` (ManyToOne → `Payment`) anchors the refund to the exact gateway transaction.
- On creation, the service calls `paymentRepository.findFirstByOrder_IdAndStatus(orderId, SUCCESS)`. This query was added to `PaymentRepository` specifically for this module.
- The refund module does **not** modify `payments.status`. A `PROCESSED` refund does not flip the payment to any new status — the payment remains `SUCCESS` as an immutable historical record.

### 5.3 Auth / Users Module

- `admin_id` is derived from the JWT token in the controller (`resolveAdminId(authHeader)`) and passed to the service. The service stores it directly as a `Long` — no `User` entity load is required.
- Customer identity for `getMyRefunds` is resolved the same way: JWT → email → `userRepository.findByEmail()` → `userId`.
- Role enforcement is handled entirely by Spring Security (`@PreAuthorize`) — the service layer has no role-awareness.

### 5.4 Flyway Migrations

| Migration | Effect |
|---|---|
| **V3** | Creates the `refunds` table with `payment_id`, `order_id`, `amount`, `reason`, `status`, `created_at`, `resolved_at`, `resolved_by` |
| **V10** | Adds `admin_id`, `notes`, `updated_at` to `refunds`; data-migrates `FAILED` → `REJECTED`; creates `app_notifications` |

---

## 6. KNOWN CONSTRAINTS & FUTURE CONSIDERATIONS

| Item | Current behaviour | Suggested future improvement |
|---|---|---|
| No gateway integration | `PROCESSED` is a manual flag; no API call reverses the charge | Integrate VNPAY/MoMo refund API; only set `PROCESSED` on gateway `200 OK` |
| No partial-amount cap | Admin can enter any amount, including more than the original payment | Add `amount <= payment.amount` validation in `createRefund()` |
| No customer notification on resolution | Customer must poll the refunds list | Call `NotificationService.createNotification()` inside `processRefund()` when status transitions |
| `resolved_by` legacy column | Remains in DB unmapped; not exposed in any response | Drop in a future migration once confirmed no other code reads it |
