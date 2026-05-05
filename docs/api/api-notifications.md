# API DOCUMENTATION — NOTIFICATION MODULE
**Version:** 2.0
**Last updated:** 2026-04-25
**Base URL:** `http://localhost:8080`

---

## 1. OVERVIEW

The Notification module delivers transactional alerts across two channels:

| Channel | Implementation | Direction |
|---|---|---|
| **Email** | Thymeleaf HTML via JavaMailSender (SMTP) | Customer + Admin |
| **Telegram** | Telegram Bot API via RestTemplate | Admin only |

All notification calls are:
- `@Async("taskExecutor")` — fire-and-forget, never block the HTTP thread
- Registered via `TransactionSynchronizationManager.afterCommit()` — fire only after the triggering DB transaction has committed
- Wrapped in `try/catch(Exception)` — SMTP or network failures are logged and swallowed; they cannot crash order, allocation, or warranty flows

---

## 2. CONFIGURATION

### 2.1 Email

#### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `MAIL_ENABLED` | `false` | Master switch — set `true` to enable SMTP sends |
| `MAIL_HOST` | `smtp.gmail.com` | SMTP server hostname |
| `MAIL_PORT` | `587` | SMTP port (587 = STARTTLS) |
| `MAIL_USERNAME` | `noreply@augustdigital.com` | SMTP auth username |
| `MAIL_PASSWORD` | *(empty)* | SMTP auth password |
| `MAIL_FROM` | `noreply@augustdigital.com` | From address shown in email header |
| `MAIL_ADMIN_EMAIL` | `admin@augustdigital.com` | Recipient for all admin alert emails |

When `MAIL_ENABLED=false` (default), every method logs `"Email skipped (MAIL_ENABLED=false): ..."` and returns immediately. The application starts cleanly with no SMTP server configured.

#### application.yml excerpt

```yaml
spring:
  mail:
    host: ${MAIL_HOST:smtp.gmail.com}
    port: ${MAIL_PORT:587}
    username: ${MAIL_USERNAME:noreply@augustdigital.com}
    password: ${MAIL_PASSWORD:}
    properties:
      mail.smtp.auth: true
      mail.smtp.starttls.enable: true

app:
  mail:
    enabled: ${MAIL_ENABLED:false}
    from: ${MAIL_FROM:noreply@augustdigital.com}
    admin-email: ${MAIL_ADMIN_EMAIL:admin@augustdigital.com}
```

---

### 2.2 Telegram

#### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `TELEGRAM_ENABLED` | `false` | Master switch — set `true` to enable Telegram alerts |
| `TELEGRAM_BOT_TOKEN` | *(empty)* | Bot token from @BotFather (e.g. `123456:ABC-...`) |
| `TELEGRAM_CHAT_ID` | *(empty)* | Numeric chat/group/channel ID (e.g. `-1001234567890`) |

When `TELEGRAM_ENABLED=false` (default), every call logs `"Telegram skipped (TELEGRAM_ENABLED=false): ..."`. If enabled but `bot-token` or `chat-id` is blank, the call logs a WARN and is skipped.

#### application.yml excerpt

```yaml
app:
  telegram:
    enabled: ${TELEGRAM_ENABLED:false}
    bot-token: ${TELEGRAM_BOT_TOKEN:}
    chat-id: ${TELEGRAM_CHAT_ID:}
```

#### Telegram Bot API call (internal)

```
POST https://api.telegram.org/bot{token}/sendMessage
Content-Type: application/json

{
  "chat_id": "{chatId}",
  "text":    "{message}",
  "parse_mode": "HTML"
}
```

Messages use Telegram HTML formatting: `<b>bold</b>`, `<code>inline code</code>`.

---

## 3. EMAIL EVENTS

### 3.1 Order Confirmation

**Trigger:** `POST /api/v1/orders` or `POST /api/v1/orders/buy-now` — post-commit
**Caller:** `OrderServiceImpl`
**Recipient:** `orders.email`
**Template:** `templates/email/order-confirmation.html`
**Subject:** `Order Confirmed — ORD-YYYYMMDD-XXXXXX`

**Content:**
- Order code, status (`PENDING`), total amount, order date
- Itemised table: product name, variant, qty, unit price, subtotal
- Instructions to complete payment

---

### 3.2 Delivery Notification

**Trigger:** Inventory allocation sets order status → `COMPLETED`
**Caller:** `InventoryAllocationServiceImpl` (post-commit via `afterCommit()`)
**Recipient:** `orders.email`
**Template:** `templates/email/delivery-notification.html`
**Subject:** `Your order has been delivered — ORD-YYYYMMDD-XXXXXX`

**Content:**
- Order code and total amount
- Per-item section:
  - Product name, variant name, quantity
  - Decrypted credentials — one entry per allocated inventory unit

---

### 3.3 Partial Delivery Notification

**Trigger:** Inventory allocation sets order status → `PARTIALLY_COMPLETED`
**Caller:** `InventoryAllocationServiceImpl` (post-commit)
**Recipient:** `orders.email`
**Template:** `templates/email/partial-delivery.html`
**Subject:** `Partial delivery for your order — ORD-YYYYMMDD-XXXXXX`

**Content:**
- Order code, total amount, count of pending (undelivered) items
- Credentials for delivered items (same format as §3.2)
- Notice that remaining items will be sent when stock is available

---

### 3.4 Admin Stock Alert (Order)

**Trigger:** Order status → `PARTIALLY_COMPLETED` or `PAID_PENDING_STOCK`
**Caller:** `InventoryAllocationServiceImpl` (post-commit)
**Recipient:** `app.mail.admin-email`
**Template:** Inline HTML (no Thymeleaf file)
**Subject:** `STOCK ALERT — N item(s) undelivered for ORD-YYYYMMDD-XXXXXX`

**Content:**
- Order code and undelivered item count
- Recovery instruction: `POST /api/v1/admin/orders/recover-stuck`

---

### 3.5 Warranty Resolved — Customer Email *(NEW)*

**Trigger:** Warranty allocation succeeds and sets warranty status → `RESOLVED`
**Caller:** `WarrantyServiceImpl.allocateReplacementInventory()` (post-commit)
**Recipient:** `warranty_requests.user_email`
**Template:** `templates/email/warranty-resolved.html`
**Subject:** `Your replacement is ready — ORD-YYYYMMDD-XXXXXX`

**Content:**
- Order code reference
- Product name and variant name
- New replacement credentials — format depends on fulfillment type:

| Fulfillment type | Credential entries |
|---|---|
| `INSTANT_DIRECT` (KEY) | Raw decrypted key string |
| `INSTANT_SHARED` (ACCOUNT) | `Account: email`, `Password: pass`, `Profile: name`, `PIN: 1234` |

Credential lines with a label (`Account:`, `Password:`, etc.) are rendered with the label in purple and the value in green inside a dark monospace block for easy copy-paste.

**Example credential block in email:**
```
Account:  netflix@example.com
Password: mypassword123
Profile:  Profile 1
PIN:      1111
```

---

### 3.6 Admin New Warranty Alert *(NEW)*

**Trigger:** Customer submits a warranty claim via `POST /api/v1/warranty` — post-commit
**Caller:** `WarrantyServiceImpl.submitClaim()` (post-commit)
**Recipient:** `app.mail.admin-email`
**Template:** Inline HTML (no Thymeleaf file)
**Subject:** `New Warranty Claim #N — ORD-YYYYMMDD-XXXXXX`

**Content:**
- Warranty ID, order code, product name, customer description
- Action link: `PUT /api/v1/admin/warranty/{id}/resolve`

---

### 3.7 Admin Warranty Stock Alert *(NEW)*

**Trigger:** Warranty resolution finds no `AVAILABLE` inventory → status → `PENDING_STOCK`
**Caller:** `WarrantyServiceImpl.allocateReplacementInventory()` (post-commit)
**Recipient:** `app.mail.admin-email`
**Template:** Inline HTML (no Thymeleaf file)
**Subject:** `WARRANTY STOCK ALERT — Claim #N pending restock`

**Content:**
- Warranty ID and order code
- Status (`PENDING_STOCK`) with explanation
- Action: restock inventory, then re-call `PUT /api/v1/admin/warranty/{id}/resolve`

---

## 4. TELEGRAM ALERTS

All Telegram messages are sent to the same `TELEGRAM_CHAT_ID`. Messages use HTML formatting.

### 4.1 New Warranty Claim *(NEW)*

**Trigger:** `POST /api/v1/warranty` — fired alongside §3.6 in the same `afterCommit()` callback

```
🚨 New Warranty Claim #5
Order: ORD-20260425-K3P9X1
Product: Netflix Premium
Issue: The activation key was already used and cannot be redeemed.
```

---

### 4.2 Warranty Resolved *(NEW)*

**Trigger:** Warranty allocation succeeds — fired alongside §3.5 in the same `afterCommit()` callback

```
✅ Warranty Resolved — Claim #5
Order: ORD-20260425-K3P9X1
Product: Netflix Premium
Replacement sent to: john.doe@example.com
```

---

### 4.3 Warranty Stock Alert *(NEW)*

**Trigger:** Warranty allocation finds no stock — fired alongside §3.7 in the same `afterCommit()` callback

```
⚠️ Warranty Stock Alert — Claim #5
Order: ORD-20260425-K3P9X1
Status: PENDING_STOCK — no replacement inventory available.
Action: restock and call PUT /api/v1/admin/warranty/5/resolve
```

---

## 5. IMPLEMENTATION DESIGN

### 5.1 EmailService Interface

```java
// ── Order events ──────────────────────────────────────────────────────────────
void sendOrderConfirmation(OrderResponse order);
void sendDeliveryNotification(String email, String orderCode,
                               BigDecimal totalAmount, List<DeliveredItem> items);
void sendPartialDeliveryNotification(String email, String orderCode,
                                      BigDecimal totalAmount,
                                      List<DeliveredItem> delivered, int pendingCount);
void sendAdminStockAlert(String orderCode, int undeliveredCount);

// ── Warranty events ───────────────────────────────────────────────────────────
void sendWarrantyResolvedEmail(String toEmail, String orderCode, DeliveredItem item);
void sendAdminNewWarrantyAlert(Long warrantyId, String orderCode,
                               String productName, String description);
void sendAdminWarrantyStockAlert(Long warrantyId, String orderCode);
```

### 5.2 TelegramService Interface

```java
void sendAdminAlert(String message);   // Telegram HTML parse_mode
```

### 5.3 DeliveredItem DTO

```java
@Value @Builder
public class DeliveredItem {
    String       productName;
    String       variantName;
    int          quantity;
    List<String> credentials;   // labelled strings for ACCOUNT, raw string for KEY
}
```

The `credentials` list is constructed **inside the `@Transactional` boundary** (while the Hibernate session is open) so lazy associations on `InventoryItem` and `AccountProfile` can be traversed. The fully-built `DeliveredItem` (all primitives/immutable) is then captured in the `afterCommit()` closure and passed to the email method — no lazy loading occurs outside the session.

### 5.4 Async & Transaction Safety

```
@Transactional method (e.g. allocateReplacementInventory)
  │
  ├─ DB writes  ──────────────────────────────────────────── committed to DB
  │
  ├─ Extract primitive values + build DeliveredItem (in-session)
  │
  └─ registerSynchronization(afterCommit → {
         emailService.sendWarrantyResolvedEmail(...)    ← @Async on taskExecutor
         telegramService.sendAdminAlert(...)            ← @Async on taskExecutor
     })
       │
       └─ fires AFTER transaction commit
```

### 5.5 Error Isolation

| Failure | Level | Behaviour |
|---|---|---|
| SMTP connection failure | ERROR | Logged, exception swallowed |
| Template rendering error | ERROR | Logged, exception swallowed |
| Credential decryption failure | WARN | `[credential unavailable]` substituted, email still sent |
| Telegram HTTP error | ERROR | Logged, exception swallowed |
| `bot-token` / `chat-id` missing | WARN | Logged, skipped silently |

---

## 6. TEMPLATES

| Template path | Event |
|---|---|
| `templates/email/order-confirmation.html` | Order created (PENDING) |
| `templates/email/delivery-notification.html` | Order COMPLETED |
| `templates/email/partial-delivery.html` | Order PARTIALLY_COMPLETED |
| `templates/email/warranty-resolved.html` | Warranty RESOLVED *(NEW)* |

Admin alerts (§3.4, §3.6, §3.7) use inline HTML — no separate template file.

All Thymeleaf templates use inline CSS and are compatible with major email clients.
Dialect: standard (`th:text`, `th:each`, `th:if`, `th:unless`, `#numbers`).

The `warranty-resolved.html` template detects labelled credential lines by checking for `": "` in the string and splits it to bold the label in purple (`#6366f1`) and colour the value in green (`#10b981`). Raw key strings (no label) are rendered in green directly.

---

## 7. QUICK REFERENCE

| Event | Recipient | Channel | Template / Type |
|---|---|---|---|
| Order created (PENDING) | Customer | Email | `order-confirmation.html` |
| Order COMPLETED | Customer | Email | `delivery-notification.html` |
| Order PARTIALLY_COMPLETED | Customer + Admin | Email | `partial-delivery.html` + inline |
| Order PAID_PENDING_STOCK | Admin | Email | Inline |
| **Warranty claim submitted** | **Admin** | **Email + Telegram** | **Inline + Telegram** |
| **Warranty RESOLVED** | **Customer + Admin** | **Email + Telegram** | **`warranty-resolved.html` + Telegram** |
| **Warranty PENDING_STOCK** | **Admin** | **Email + Telegram** | **Inline + Telegram** |
