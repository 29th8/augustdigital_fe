# MODULE DOCUMENTATION — IN-APP NOTIFICATIONS
**Version:** 1.0
**Last updated:** 2026-04-26
**Flyway migration:** V10

---

## 1. OVERVIEW & PURPOSE

### Business Problem

The platform already sends transactional emails and Telegram alerts to admins when significant events occur (order delivery, warranty resolution, stock alerts). These external channels have two limitations:

1. **Email is asynchronous and passive** — customers must open their inbox. There is no indicator inside the application that something happened.
2. **No in-app awareness** — the frontend has no mechanism to show a notification badge, an alert feed, or any signal that the user should check their orders or warranty claims.

### What This Module Does

- Maintains a persistent, user-scoped feed of notifications inside the application (`app_notifications` table).
- Allows the backend to create notifications programmatically from any service, synchronously within a transaction.
- Exposes three read/update endpoints to the frontend: list, mark one as read, mark all as read.
- Does **not** push notifications in real time (no WebSocket). The frontend polls on a schedule to refresh the feed.

### Distinction from External Notifications

This module is entirely separate from the `EmailService` and `TelegramService` used for external delivery:

| Dimension | External (`NotificationType`) | In-App (`AppNotificationType`) |
|---|---|---|
| Enum values | `EMAIL`, `TELEGRAM` | `ORDER`, `WARRANTY`, `SYSTEM` |
| Delivery | SMTP / Telegram Bot API | Database row in `app_notifications` |
| Recipient | Customer email / Admin Telegram | Authenticated user in the app |
| Persistence | No DB record (fire-and-forget) | Persisted; survives restarts |
| Read tracking | Not applicable | `is_read` boolean column |
| Async | `@Async("taskExecutor")`, post-commit | Synchronous, within the calling transaction |

---

## 2. DATABASE SCHEMA & RELATIONSHIPS

### 2.1 Table: `app_notifications`

Created by **V10**.

| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | `BIGSERIAL` | No | auto | Primary key |
| `user_id` | `BIGINT` | Yes | `NULL` | FK → `users.id` ON DELETE CASCADE — owning user; NULL for broadcast/system notifications not yet targeted |
| `title` | `VARCHAR(255)` | No | — | Short subject line (displayed as notification heading) |
| `message` | `TEXT` | No | — | Full notification body |
| `type` | `VARCHAR(20)` | No | — | One of: `ORDER`, `WARRANTY`, `SYSTEM` |
| `is_read` | `BOOLEAN` | No | `FALSE` | Whether the user has acknowledged the notification |
| `created_at` | `TIMESTAMP(6)` | No | `NOW()` | Row creation time (immutable) |

> **Why `user_id` is nullable:** Designed to support future system-wide broadcasts (type `SYSTEM`) where a single notification row could conceptually apply to all users. In the current implementation, every `createNotification()` call passes a concrete `userId`, so in practice the column is always populated.

### 2.2 Indexes

| Index name | Columns | Purpose |
|---|---|---|
| `idx_app_notif_user_id` | `user_id` | Fast retrieval of all notifications for a user |
| `idx_app_notif_user_is_read` | `user_id, is_read` | Composite index — powers unread count queries and the `markAllReadByUserId` JPQL update (`WHERE userId = ? AND isRead = false`) |
| `idx_app_notif_type` | `type` | Supports future admin analytics queries filtered by category |

### 2.3 Entity Relationships

```
users (id)
  │
  └── ON DELETE CASCADE ── app_notifications.user_id (nullable FK)
                           │
                           ├── title       VARCHAR(255)
                           ├── message     TEXT
                           ├── type        VARCHAR(20)  ← ORDER | WARRANTY | SYSTEM
                           ├── is_read     BOOLEAN      ← DEFAULT FALSE
                           └── created_at  TIMESTAMP    ← immutable
```

**Cascade behaviour:** When a `users` row is hard-deleted (`ON DELETE CASCADE`), all of that user's notification rows are automatically removed by the database. This prevents orphaned rows without requiring application-level cleanup.

---

## 3. NOTIFICATION LIFECYCLE

### 3.1 Creation Flow

Notifications are created **synchronously inside the transaction** of the originating service method. This is different from email/Telegram which are fired post-commit asynchronously.

```
Service method (@Transactional)
  │
  ├── Business logic (e.g., warranty resolved, order delivered)
  │
  ├── notificationService.createNotification(userId, title, message, type)
  │     └── INSERT INTO app_notifications ← within the SAME transaction
  │
  └── Transaction commits → notification row visible immediately
```

**Why synchronous (not post-commit)?** In-app notifications are low-risk to write. If the outer transaction rolls back, the notification row rolls back with it — this is the correct behaviour (don't notify a user about something that didn't happen). There is no I/O or external API call to defer. Contrast this with email/Telegram where post-commit deferral is necessary to avoid sending a notification before the DB state is stable.

### 3.2 Read State Lifecycle

```
                   ┌──────────────────────────────────┐
                   │  Backend: createNotification()   │
                   └──────────────────┬───────────────┘
                                      │
                                      ▼
                             ┌─────────────────┐
                             │   is_read=false  │  ← initial state
                             └────────┬────────┘
                                      │
                     ┌────────────────┴────────────────┐
                     │                                 │
             PUT /{id}/read                   PUT /read-all
             (single update)                 (bulk UPDATE)
                     │                                 │
                     ▼                                 ▼
                             ┌─────────────────┐
                             │   is_read=true   │  ← terminal (cannot be unread)
                             └─────────────────┘
```

- `is_read` transitions are **one-way**: once `true`, there is no API to set it back to `false`.
- There is no `DELETED` state. Notifications are never deleted by user action — they remain in the database as a historical record. Deletion only occurs via the `ON DELETE CASCADE` when the parent user is deleted.

---

## 4. CORE BUSINESS RULES

### 4.1 Creation Rules

| Rule | Enforcement layer | Detail |
|---|---|---|
| Only backend services create notifications | Architecture | No public POST endpoint exists; `createNotification()` is an internal service method |
| `userId` must reference a valid user | Caller's responsibility | `NotificationServiceImpl` trusts the caller to pass a valid `userId`; no lookup is performed |
| `title` and `message` are required | Entity constraint | `nullable = false` on both columns |
| `type` must be a valid enum value | Entity constraint | `@Enumerated(EnumType.STRING)` with `VARCHAR(20)` — invalid values cause a JPA mapping error |
| `is_read` defaults to `false` | Entity default + DB default | `@Builder.Default` in Java and `DEFAULT FALSE` in SQL enforce this at both layers |

### 4.2 Read Rules (Single)

| Rule | Enforcement layer | Detail |
|---|---|---|
| User may only mark their own notifications as read | Service | `markAsRead()` loads the notification, then checks `notification.getUserId().equals(userId)`. Mismatch → `NotFoundException` with the same message as "not found" (deliberate — prevents ID enumeration) |
| JWT is required | Security filter | All `/api/v1/notifications/**` routes hit `.anyRequest().authenticated()` — unauthenticated calls return `401` before reaching the controller |
| `userId` is derived from JWT only | Controller | `resolveUserId(authHeader)` extracts email from token → looks up user. No `user_id` in request body. |

### 4.3 Read Rules (Bulk — Mark All)

| Rule | Enforcement layer | Detail |
|---|---|---|
| Bulk update is scoped to the authenticated user | Repository | JPQL: `WHERE n.userId = :userId AND n.isRead = false` — other users' notifications are never touched |
| Idempotent | Repository | `WHERE isRead = false` clause means calling it with no unread notifications is a no-op (0 rows updated, no error) |
| Returns no body detail | Service | `markAllAsRead()` returns `void`; the controller responds with a plain success message string |

### 4.4 Read (List) Rules

| Rule | Enforcement layer | Detail |
|---|---|---|
| Scoped to authenticated user | Repository | `findByUserIdOrderByCreatedAtDesc(userId, pageable)` |
| Always sorted newest first | Repository | `OrderByCreatedAtDesc` is encoded in the method name — the caller cannot override it |
| Paginated | Controller | Default `page=0`, `size=20`; frontend controls via query params |

---

## 5. INTEGRATION POINTS

### 5.1 Called By — Current

The `NotificationService.createNotification()` method is available for any service to call. In the current codebase it is available but not yet wired into any event flow (see §6 Known Constraints). The intended integration points are:

| Originating service | Event | Suggested `type` | Suggested `title` |
|---|---|---|---|
| `OrderServiceImpl` | Order status → `COMPLETED` | `ORDER` | `"Your order has been delivered"` |
| `OrderServiceImpl` | Order status → `PARTIALLY_COMPLETED` | `ORDER` | `"Partial delivery for your order"` |
| `InventoryAllocationServiceImpl` | Order status → `PAID_PENDING_STOCK` | `ORDER` | `"Your order is pending stock"` |
| `WarrantyServiceImpl.submitClaim()` | Claim submitted | `WARRANTY` | `"Warranty claim received"` |
| `WarrantyServiceImpl.allocateReplacementInventory()` | Status → `RESOLVED` | `WARRANTY` | `"Your replacement is ready"` |
| `WarrantyServiceImpl.allocateReplacementInventory()` | Status → `PENDING_STOCK` | `WARRANTY` | `"Replacement pending restock"` |
| `RefundServiceImpl.processRefund()` | Status → `PROCESSED` or `REJECTED` | `ORDER` | `"Your refund has been processed"` |

### 5.2 Auth / Users Module

- `user_id` FK references `users.id` with `ON DELETE CASCADE`.
- The controller resolves `userId` from the JWT via `JwtTokenProvider.extractEmail()` → `userRepository.findByEmail()`. This is the same pattern used by `WarrantyController` and `RefundController`.
- The notification service itself has no dependency on `UserRepository` or `JwtTokenProvider` — it receives a resolved `userId` from the controller layer, keeping the service pure.

### 5.3 No Dependency on Orders / Payments / Warranty

`NotificationServiceImpl` depends only on `NotificationRepository`. It has zero knowledge of Orders, Payments, or Warranty entities. This is deliberate — the service is a general-purpose write/read layer. Business context is provided by the caller at creation time via `title`, `message`, and `type`.

---

## 6. KNOWN CONSTRAINTS & FUTURE CONSIDERATIONS

| Item | Current behaviour | Suggested future improvement |
|---|---|---|
| Not yet wired into event flows | `createNotification()` exists but no service calls it yet | Wire into `WarrantyServiceImpl`, `OrderServiceImpl`, `RefundServiceImpl` at the appropriate transaction boundaries |
| Polling-only delivery | Frontend must poll `GET /api/v1/notifications` on a timer | Add WebSocket or Server-Sent Events (SSE) support for real-time push |
| No unread count endpoint | Frontend must derive unread count from the items array | Add `GET /api/v1/notifications/unread-count` returning a single integer for efficient badge rendering |
| No deletion endpoint | Notifications accumulate indefinitely | Add a `DELETE /api/v1/notifications/{id}` endpoint or a scheduled cleanup job (`DELETE WHERE created_at < NOW() - INTERVAL '90 days'`) |
| `user_id` nullable but always populated | Schema allows NULL for broadcast use-case, but no broadcast mechanism exists | Implement a broadcast flow (e.g., admin posts a SYSTEM notification to all users via a batch insert) |
| Read state is one-way | No "mark as unread" capability | Low priority; consider adding if admin/support workflows require it |
