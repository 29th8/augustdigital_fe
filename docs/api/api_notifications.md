# API DOCUMENTATION — IN-APP NOTIFICATIONS MODULE
**Version:** 1.0
**Last updated:** 2026-04-26
**Base URL:** `http://localhost:8080`

---

## 1. OVERVIEW

The In-App Notifications module delivers real-time alerts to authenticated users inside the application (as opposed to email or Telegram alerts which are sent externally). Notifications are created server-side by the backend when significant events occur (order updates, warranty status changes, system broadcasts). Customers interact with them via three endpoints.

| Actor | Capability |
|---|---|
| **Customer / Admin** | List their own notifications (paginated, newest first) |
| **Customer / Admin** | Mark a single notification as read |
| **Customer / Admin** | Mark all notifications as read |

> **Note on creation:** Notifications are created internally by the backend (e.g., inside `WarrantyServiceImpl`, `OrderServiceImpl`). There is no public API to create notifications — the frontend only reads and marks them.

---

## 2. ENUMS

### `AppNotificationType`

> This enum is **separate** from the external-channel `NotificationType` (`EMAIL`, `TELEGRAM`). It describes the category of an in-app notification only.

| Value | When it appears |
|---|---|
| `ORDER` | Order status changes (PAID, COMPLETED, PARTIALLY_COMPLETED, PAID_PENDING_STOCK) |
| `WARRANTY` | Warranty claim submitted, resolved, or pending stock |
| `SYSTEM` | Platform announcements and admin broadcasts |

---

## 3. ENDPOINTS

All notification endpoints require `Authorization: Bearer <token>` for any authenticated user (CUSTOMER or ADMIN). The backend identifies the caller from the JWT — there is no `user_id` field in any request.

---

### 3.1 Get Notifications

Returns the authenticated user's notifications, sorted newest first.

**`GET /api/v1/notifications`**

#### Headers

| Key | Value |
|---|---|
| `Authorization` | `Bearer <token>` |

#### Query Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `page` | `number` | `0` | Zero-based page index |
| `size` | `number` | `20` | Items per page |

#### Success Response — `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "items": [
      {
        "id": 12,
        "title": "Your replacement is ready",
        "message": "Warranty claim for order ORD-20260425-K3P9X1 has been resolved. Check your email for credentials.",
        "type": "WARRANTY",
        "isRead": false,
        "createdAt": "2026-04-26T09:45:00"
      },
      {
        "id": 8,
        "title": "Order delivered",
        "message": "Your order ORD-20260420-A1B2C3 has been completed. Check your email for credentials.",
        "type": "ORDER",
        "isRead": true,
        "createdAt": "2026-04-20T14:22:00"
      }
    ],
    "page_info": {
      "total_elements": 2,
      "total_pages": 1,
      "current_page": 0,
      "page_size": 20
    }
  }
}
```

#### Error Responses

| HTTP | Scenario |
|---|---|
| `401` | Missing or invalid JWT |

---

### 3.2 Mark Single Notification as Read

Marks one notification as read. Returns `404` if the notification does not exist **or** belongs to a different user — the two cases are intentionally indistinguishable to prevent notification ID enumeration.

**`PUT /api/v1/notifications/{id}/read`**

#### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `id` | `number` | Notification ID |

#### Headers

| Key | Value |
|---|---|
| `Authorization` | `Bearer <token>` |

#### Request Body

None.

#### Success Response — `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "id": 12,
    "title": "Your replacement is ready",
    "message": "Warranty claim for order ORD-20260425-K3P9X1 has been resolved. Check your email for credentials.",
    "type": "WARRANTY",
    "isRead": true,
    "createdAt": "2026-04-26T09:45:00"
  }
}
```

#### Error Responses

| HTTP | Scenario |
|---|---|
| `404` | Notification not found or belongs to another user |
| `401` | Missing or invalid JWT |

---

### 3.3 Mark All Notifications as Read

Bulk-updates all unread notifications for the authenticated user to `is_read = true`. Idempotent — calling it when there are no unread notifications returns the same `200 OK`.

**`PUT /api/v1/notifications/read-all`**

#### Headers

| Key | Value |
|---|---|
| `Authorization` | `Bearer <token>` |

#### Request Body

None.

#### Success Response — `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": "All notifications marked as read"
}
```

#### Error Responses

| HTTP | Scenario |
|---|---|
| `401` | Missing or invalid JWT |

---

## 4. POSTMAN TESTING WORKFLOW

Follow these steps to test the complete notification lifecycle from a freshly seeded state.

### Step 1 — Authenticate

```
POST http://localhost:8080/api/v1/auth/login
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "your_password"
}
```

Copy the `token` and set it as Postman collection variable `{{token}}`.

---

### Step 2 — Trigger a Notification (via Warranty Submit)

Submit a warranty claim — the backend creates a WARRANTY notification for the customer automatically:

```
POST http://localhost:8080/api/v1/warranty
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "order_item_id": 10,
  "user_email": "customer@example.com",
  "description": "The activation key was already used."
}
```

---

### Step 3 — List Notifications

```
GET http://localhost:8080/api/v1/notifications?page=0&size=20
Authorization: Bearer {{token}}
```

**Verify:**
- The newly created WARRANTY notification appears at the top.
- `isRead` is `false`.

Copy the `id` of the notification. Set it as `{{notification_id}}`.

---

### Step 4 — Mark Single Notification as Read

```
PUT http://localhost:8080/api/v1/notifications/{{notification_id}}/read
Authorization: Bearer {{token}}
```

**Verify:** `data.isRead` is `true`.

---

### Step 5 — Verify Read State Persists

Re-run Step 3.

**Verify:** The notification now shows `isRead: true`.

---

### Step 6 — Trigger Multiple Notifications

Submit two more warranty claims (with different `order_item_id` values) to create additional unread notifications.

---

### Step 7 — Mark All as Read

```
PUT http://localhost:8080/api/v1/notifications/read-all
Authorization: Bearer {{token}}
```

**Verify:** `data` is `"All notifications marked as read"`.

---

### Step 8 — Confirm All Are Read

Re-run Step 3.

**Verify:** All notifications have `isRead: true`.

---

### Step 9 — Test 404 Isolation (Security)

Authenticate as a **different** user and attempt to mark the first user's notification as read:

```
PUT http://localhost:8080/api/v1/notifications/{{notification_id}}/read
Authorization: Bearer {{other_user_token}}
```

**Verify:** `404 Not Found` — the other user cannot see or modify another user's notifications.

---

### Step 10 — Test Idempotency

Call `PUT /api/v1/notifications/read-all` again when no unread notifications exist.

**Verify:** `200 OK` — no error.

---

## 5. FRONTEND INTEGRATION NOTES (NEXT.JS)

### 5.1 TypeScript Types

```typescript
export type AppNotificationType = 'ORDER' | 'WARRANTY' | 'SYSTEM';

export interface NotificationResponse {
  id: number;
  title: string;
  message: string;
  type: AppNotificationType;
  isRead: boolean;
  createdAt: string;   // ISO-8601 datetime string
}
```

### 5.2 Unread Badge Count

Derive the unread count client-side from the first fetched page and `page_info.total_elements`:

```typescript
// Fetch first page — use a small size for the bell icon badge
const res = await fetch('/api/v1/notifications?page=0&size=50', {
  headers: { Authorization: `Bearer ${token}` },
});
const json = await res.json();
const notifications: NotificationResponse[] = json.data.items;
const unreadCount = notifications.filter(n => !n.isRead).length;
```

> For precise unread counts across all pages consider adding a dedicated `/api/v1/notifications/unread-count` endpoint in a future iteration, or load all notifications if the volume is small.

### 5.3 Polling vs. WebSocket

The current backend does **not** push notifications in real time — it only serves them on demand. Implement polling in Next.js to refresh the notification list:

```typescript
// app/hooks/useNotifications.ts
import useSWR from 'swr';

const fetcher = (url: string) =>
  fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json());

export function useNotifications() {
  const { data, mutate } = useSWR(
    '/api/v1/notifications?page=0&size=20',
    fetcher,
    { refreshInterval: 30_000 }   // poll every 30 seconds
  );
  return { notifications: data?.data?.items ?? [], mutate };
}
```

### 5.4 Optimistic Mark-as-Read

For a snappy UI, mark a notification as read optimistically before the API call resolves:

```typescript
async function handleMarkRead(id: number) {
  // 1. Optimistic update
  mutate(
    (prev) => ({
      ...prev,
      data: {
        ...prev.data,
        items: prev.data.items.map((n: NotificationResponse) =>
          n.id === id ? { ...n, isRead: true } : n
        ),
      },
    }),
    false   // do not revalidate yet
  );

  // 2. API call
  await fetch(`/api/v1/notifications/${id}/read`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });

  // 3. Revalidate to sync server state
  mutate();
}
```

### 5.5 Type Icon Mapping

```typescript
import { BellIcon, ShieldCheckIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

export const notificationTypeConfig: Record<AppNotificationType, {
  label: string;
  icon: React.ComponentType;
  color: string;
}> = {
  ORDER:    { label: 'Order Update',   icon: BellIcon,               color: 'blue'   },
  WARRANTY: { label: 'Warranty',       icon: ShieldCheckIcon,        color: 'purple' },
  SYSTEM:   { label: 'System',         icon: InformationCircleIcon,  color: 'gray'   },
};
```

### 5.6 Pagination

```typescript
// Page index is zero-based — convert from 1-based UI pagination:
const apiPage = uiPage - 1;

const res = await fetch(
  `/api/v1/notifications?page=${apiPage}&size=${pageSize}`,
  { headers: { Authorization: `Bearer ${token}` } }
);
const json = await res.json();

const items: NotificationResponse[] = json.data.items;
const totalPages: number = json.data.page_info.total_pages;
const totalElements: number = json.data.page_info.total_elements;
```

### 5.7 Date Formatting

`createdAt` is returned as an ISO-8601 local datetime string (no timezone suffix). Treat it as the server's local time and display it using `date-fns` or `Intl`:

```typescript
import { formatDistanceToNow, parseISO } from 'date-fns';

const relativeTime = formatDistanceToNow(parseISO(notification.createdAt), { addSuffix: true });
// e.g. "3 minutes ago"
```
