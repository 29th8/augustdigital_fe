# SEQUENCE DIAGRAM SPECIFICATION
**Project:** Digital Goods E-commerce Platform (Shop August)

---

## 1. ORDER + PAYMENT + DELIVERY FLOW

```plantuml
@startuml

actor User
participant "Frontend (Next.js)" as FE
participant "Backend API (Spring Boot)" as BE
participant "Database" as DB
participant "Payment Gateway" as PG
participant "Async Service" as AS
participant "Email Service" as ES

User -> FE: Click "Buy Now"
FE -> BE: POST /orders
BE -> DB: Insert order (PENDING)
BE -> DB: Insert order_items
BE -> FE: Return order_code

User -> FE: Click "Pay"
FE -> BE: POST /payments/create
BE -> PG: Create payment
PG -> FE: Return payment_url / QR

User -> PG: Make payment

PG -> BE: Webhook (payment success)

BE -> DB: Insert payment (transaction_code UNIQUE)
BE -> DB: Update order = PAID

BE -> AS: Trigger allocate_inventory(order_id)

activate AS

AS -> DB: Load order_items
AS -> DB: SELECT inventory FOR UPDATE (sorted)

alt Inventory available
    AS -> DB: Update inventory = SOLD
    AS -> DB: Insert delivery
    AS -> DB: Update order = COMPLETED
else Partial available
    AS -> DB: Update some inventory
    AS -> DB: Insert partial delivery
    AS -> DB: Update order = PARTIALLY_COMPLETED
else Out of stock
    AS -> DB: Update order = PAID_PENDING_STOCK
end

AS -> ES: Send email delivery

deactivate AS

BE -> PG: Return 200 OK

@enduml
```

---

## 2. PAYMENT TIMEOUT FLOW

```plantuml
@startuml

participant "Cron Job" as CRON
participant "Backend" as BE
participant "Database" as DB

CRON -> BE: Run every 5 minutes
BE -> DB: Find orders PENDING > 15 min
BE -> DB: Update status = EXPIRED

@enduml
```

---

## 3. WARRANTY FLOW

```plantuml
@startuml

actor User
participant FE
participant BE
participant DB
participant AS

User -> FE: Submit warranty request
FE -> BE: POST /warranty

BE -> DB: Insert warranty_request (OPEN)

BE -> AS: allocate_inventory_for_warranty()

activate AS

AS -> DB: SELECT inventory FOR UPDATE

alt Available
    AS -> DB: Update inventory = SOLD
    AS -> DB: Update delivery (replace key)
    AS -> DB: Update warranty = RESOLVED
else Out of stock
    AS -> DB: Update warranty = PENDING_STOCK
end

deactivate AS

@enduml
```

---

## 4. ORDER LOOKUP FLOW

```plantuml
@startuml

actor User
participant FE
participant BE
participant DB

User -> FE: Enter order_code + email
FE -> BE: POST /orders/lookup

BE -> DB: Find order
BE -> DB: Validate email

alt Found
    BE -> DB: Get delivery
    BE -> FE: Return data
else Not found
    BE -> FE: Return error
end

@enduml
```

---

## 5. CART FLOW

```plantuml
@startuml

actor User
participant FE
participant BE
participant DB

User -> FE: Add to cart
FE -> BE: POST /cart

BE -> DB: Check product_variant
BE -> DB: Insert or update cart_item

BE -> FE: Return success

@enduml
```

---

## 6. DEADLOCK-SAFE INVENTORY FLOW (DETAIL)

```plantuml
@startuml

participant AS
participant DB

AS -> DB: Load order_items
AS -> AS: Sort by product_variant_id ASC

loop each item
    AS -> DB: SELECT ... FOR UPDATE
    alt available
        AS -> DB: update SOLD
    else not available
        AS -> AS: mark failed
    end
end

AS -> DB: Update order status

@enduml
```

---

## 7. SYSTEM OVERVIEW FLOW

```plantuml
@startuml

actor User
participant FE
participant BE
participant DB
participant PG
participant AS

User -> FE: Order
FE -> BE: API request
BE -> DB: Save data

User -> PG: Payment
PG -> BE: Webhook

BE -> AS: Async processing
AS -> DB: Allocation

BE -> FE: Response

@enduml
```