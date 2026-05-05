# API DOCUMENTATION — ANALYTICS MODULE
**Version:** 1.0
**Last updated:** 2026-04-12
**Base URL:** `http://localhost:8080`

---

## 1. OVERVIEW

The Analytics module provides admin-only endpoints for profit analysis and dashboard
summaries. All data is read-only and derived from completed orders, delivered inventory
items, and their recorded cost prices.

### Revenue vs Cost definition

| Metric          | Source                                                              |
|-----------------|---------------------------------------------------------------------|
| **Revenue**     | `SUM(order_items.price × quantity)` for orders with `status = COMPLETED` |
| **Cost**        | `SUM(inventory_items.cost_price)` for SOLD items joined through `deliveries` |
| **Gross Profit**| Revenue − Cost                                                      |
| **Margin %**    | (Gross Profit ÷ Revenue) × 100, rounded to 2 dp; 0 when revenue = 0 |

Cost is nullable — items imported without a `cost_price` contribute **0** to cost
aggregates (via `COALESCE`). This ensures backward compatibility with existing inventory.

---

## 2. ENDPOINTS

### 2.1 `GET /api/v1/admin/analytics/profit`

Profit report for a date range. Revenue and cost are filtered by `orders.created_at`.

**Auth:** JWT Bearer + role `ADMIN`

#### Query Parameters

| Parameter    | Type   | Required | Description                                               |
|--------------|--------|----------|-----------------------------------------------------------|
| `from`       | date   | Yes      | Inclusive start date — `yyyy-MM-dd`                      |
| `to`         | date   | Yes      | Inclusive end date — `yyyy-MM-dd`                        |
| `variant_id` | Long   | No       | Limit report to a single product variant                 |

#### Response `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "total_revenue":       1500000.00,
    "total_cost":           900000.00,
    "gross_profit":         600000.00,
    "gross_margin_percent":      40.00,
    "orders_count":             42,
    "items_sold":               87,
    "by_variant": [
      {
        "variant_id":    4,
        "variant_name":  "Standard Key",
        "revenue":       900000.00,
        "cost":          540000.00,
        "gross_profit":  360000.00,
        "items_sold":    50
      },
      {
        "variant_id":    7,
        "variant_name":  "Premium Key",
        "revenue":       600000.00,
        "cost":          360000.00,
        "gross_profit":  240000.00,
        "items_sold":    37
      }
    ]
  }
}
```

| Field                  | Description                                                   |
|------------------------|---------------------------------------------------------------|
| `total_revenue`        | Sum of (price × quantity) for all COMPLETED orders in period  |
| `total_cost`           | Sum of cost_price for SOLD items delivered in period          |
| `gross_profit`         | total_revenue − total_cost                                    |
| `gross_margin_percent` | (gross_profit / total_revenue) × 100 — 0 if no revenue       |
| `orders_count`         | Distinct COMPLETED orders in the period                       |
| `items_sold`           | Total units sold across all COMPLETED orders                  |
| `by_variant`           | Per-variant breakdown, ordered by revenue descending          |

#### Example `curl`

```bash
curl "http://localhost:8080/api/v1/admin/analytics/profit?from=2026-04-01&to=2026-04-30" \
  -H "Authorization: Bearer <admin-token>"

# Filter to a single variant:
curl "http://localhost:8080/api/v1/admin/analytics/profit?from=2026-04-01&to=2026-04-30&variant_id=4" \
  -H "Authorization: Bearer <admin-token>"
```

---

### 2.2 `GET /api/v1/admin/analytics/summary`

Dashboard snapshot. All metrics are scoped to the **current calendar month** unless
otherwise noted.

**Auth:** JWT Bearer + role `ADMIN`

#### Response `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "revenue_today":   50000.00,
    "revenue_week":   250000.00,
    "revenue_month":  900000.00,
    "total_orders":        142,
    "top_variants": [
      { "variant_id": 4, "variant_name": "Standard Key", "items_sold": 50, "revenue": 900000.00 },
      { "variant_id": 7, "variant_name": "Premium Key",  "items_sold": 37, "revenue": 600000.00 }
    ]
  }
}
```

| Field           | Period                                    | Source                            |
|-----------------|-------------------------------------------|-----------------------------------|
| `revenue_today` | Midnight → now                            | COMPLETED orders                  |
| `revenue_week`  | 7 days ago (same time) → now              | COMPLETED orders                  |
| `revenue_month` | 1st of current month → now               | COMPLETED orders                  |
| `total_orders`  | 1st of current month → now               | All statuses                      |
| `top_variants`  | 1st of current month → now (top 5)       | Ordered by items_sold DESC        |

#### Example `curl`

```bash
curl http://localhost:8080/api/v1/admin/analytics/summary \
  -H "Authorization: Bearer <admin-token>"
```

---

## 3. COST PRICE TRACKING

### Adding cost_price to inventory items

Both import APIs accept an optional `costPrice` parameter. When provided, every item
in the import batch is assigned that cost price. When omitted, `cost_price = NULL`
(treated as 0 in all analytics aggregations).

**JSON import (existing endpoint):**

```bash
POST /api/v1/admin/inventory
Content-Type: application/json

{
  "variantId":  4,
  "type":       "KEY",
  "keys":       ["KEY-001", "KEY-002"],
  "costPrice":  5000.00
}
```

**File import:**

```bash
POST /api/v1/admin/inventory/import
Content-Type: multipart/form-data

file=@keys.csv
variantId=4
type=KEY
costPrice=5000.00        # optional
```

### Backward compatibility

- Existing inventory items with `cost_price = NULL` are fully supported.
- Analytics queries use `COALESCE(SUM(cost_price), 0)` so NULL cost items
  contribute 0 to the cost total and do not affect revenue or order counts.
- `gross_margin_percent` will appear lower than the actual margin when some items
  have no cost tracked — this is expected and visible in the `total_cost` field.

---

## 4. DATABASE QUERY DESIGN

### Profit query (simplified)

```sql
SELECT
  COALESCE(SUM(oi.price * oi.quantity), 0)  AS total_revenue,
  COALESCE(SUM(ii.cost_price),           0)  AS total_cost,
  COUNT(DISTINCT o.id)                        AS orders_count,
  COALESCE(SUM(oi.quantity),             0)  AS items_sold
FROM order_items oi
JOIN orders o          ON o.id  = oi.order_id
LEFT JOIN deliveries d ON d.order_item_id  = oi.id
LEFT JOIN inventory_items ii ON ii.id = d.inventory_item_id
WHERE o.status = 'COMPLETED'
  AND o.created_at >= :from AND o.created_at <= :to
  -- AND oi.product_variant_id = :variantId  (when variant filter applied)
```

The `LEFT JOIN` on `deliveries` and `inventory_items` ensures that order items without
a delivery record (e.g., PAID_PENDING_STOCK lines that were never allocated) still
contribute to revenue but with 0 cost.

---

## 5. QUICK REFERENCE

| Method | Path                              | Auth        | Description                    |
|--------|-----------------------------------|-------------|--------------------------------|
| GET    | `/api/v1/admin/analytics/profit`  | JWT + ADMIN | Profit report with breakdown   |
| GET    | `/api/v1/admin/analytics/summary` | JWT + ADMIN | Dashboard revenue snapshot     |
