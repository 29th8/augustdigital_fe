# API Documentation — Cart Module

**Base URL:** `http://localhost:8080`
**Updated:** 2026-05-03

---

## Known Gotchas

| # | Gotcha | Detail |
|---|--------|--------|
| 1 | **Request body is camelCase** | `CartAddRequest` and `CartUpdateRequest` have NO `@JsonProperty`. Jackson uses Java field names: `variantId`, `quantity`. Do NOT send `variant_id`. |
| 2 | **Response body is camelCase** | `CartItemResponse` and `CartSummaryResponse` also have NO `@JsonProperty`. All keys are camelCase: `variantId`, `productId`, `totalAmount`. Do NOT expect `total_amount`. |
| 3 | **Dual identity — JWT OR X-Session-ID** | Every endpoint requires EITHER a valid JWT `Authorization: Bearer <token>` header OR an `X-Session-ID` header. If NEITHER is present → `400 Bad Request`. |
| 4 | **JWT takes priority over session** | If both `Authorization` and `X-Session-ID` are present, the user's email (from JWT) is used and the session ID is ignored. |
| 5 | **Mutation endpoints have no `data`** | POST, PUT, DELETE all return `ApiResponse<Void>`. The `data` key is **absent** from JSON — not null. |
| 6 | **No `image_url` in cart items** | `CartItemResponse` has no image field. Fetch product image separately from `GET /api/v1/products/{id}` if needed in cart UI. |
| 7 | **`subtotal = price × quantity`** | Computed server-side. `subtotal` and `totalAmount` are always server-calculated; do not recompute on the frontend. |
| 8 | **`DELETE /clear` before `DELETE /{variantId}`** | Spring maps `DELETE /api/v1/cart/clear` to `clearCart` and `DELETE /api/v1/cart/{variantId}` to `removeCartItem`. Do NOT send `DELETE /api/v1/cart/0` to clear — use `/clear` explicitly. |

---

## Raw API Types (exact JSON shape from backend)

```typescript
// All cart response fields are camelCase — there are no @JsonProperty annotations
// in CartItemResponse or CartSummaryResponse.

interface CartItemApi {
  variantId: number;
  productId: number;
  productName: string;
  variantName: string;
  price: number;        // BigDecimal serialized as number
  quantity: number;
  subtotal: number;     // price × quantity, server-calculated
}

interface CartSummaryApi {
  items: CartItemApi[];
  totalAmount: number;  // sum of all subtotals, server-calculated
}

// Request bodies (sent TO the API) — also camelCase
interface CartAddRequestApi {
  variantId: number;    // camelCase — no @JsonProperty
  quantity: number;     // min 1
}

interface CartUpdateRequestApi {
  quantity: number;     // min 1 — replaces current quantity
}
```

---

## Frontend Types (camelCase, normalized)

No normalization needed — the API already returns camelCase. Use raw types directly.

```typescript
interface CartItem {
  variantId: number;
  productId: number;
  productName: string;
  variantName: string;
  price: number;
  quantity: number;
  subtotal: number;
}

interface CartSummary {
  items: CartItem[];
  totalAmount: number;
}
```

---

## Frontend Mapping

No normalizer needed — raw types match frontend types 1:1.

```typescript
const cart: CartSummary = res.data.data;
```

---

## Zod Schemas

```typescript
import { z } from "zod";

// Request schemas
export const CartAddSchema = z.object({
  variantId: z.number().int().positive("Variant ID is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

export const CartUpdateSchema = z.object({
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

// Response schemas
export const CartItemSchema = z.object({
  variantId: z.number(),
  productId: z.number(),
  productName: z.string(),
  variantName: z.string(),
  price: z.number(),
  quantity: z.number(),
  subtotal: z.number(),
});

export const CartSummarySchema = z.object({
  items: z.array(CartItemSchema),
  totalAmount: z.number(),
});

export type CartAddInput = z.infer<typeof CartAddSchema>;
export type CartUpdateInput = z.infer<typeof CartUpdateSchema>;
export type CartItem = z.infer<typeof CartItemSchema>;
export type CartSummary = z.infer<typeof CartSummarySchema>;
```

---

## Authentication

Every cart endpoint requires at least one of:

| Method | Header | Value |
|--------|--------|-------|
| JWT (logged-in user) | `Authorization` | `Bearer <accessToken>` |
| Guest session | `X-Session-ID` | any non-blank string (e.g. UUID) |

If **neither** is provided:

```json
{ "code": 400, "message": "Authentication token or X-Session-ID header is required" }
```

**Recommendation for frontend:**
- Logged-in users: always send `Authorization` header (from Axios interceptor)
- Guest users: generate a UUID on first cart interaction, store in `localStorage`, send as `X-Session-ID` on every request

---

## GET /api/v1/cart

Returns the current cart for the identity (user or session).

**Authentication:** JWT or X-Session-ID
**HTTP Status on success:** `200 OK`

### Full Response Snapshot — `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "items": [
      {
        "variantId": 5,
        "productId": 3,
        "productName": "Spotify Premium",
        "variantName": "1 Month",
        "price": 59000,
        "quantity": 2,
        "subtotal": 118000
      },
      {
        "variantId": 11,
        "productId": 7,
        "productName": "YouTube Premium",
        "variantName": "1 Month",
        "price": 79000,
        "quantity": 1,
        "subtotal": 79000
      }
    ],
    "totalAmount": 197000
  }
}
```

### Empty Cart — `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "items": [],
    "totalAmount": 0
  }
}
```

### Frontend Usage

```typescript
const getCart = async (): Promise<CartSummary> => {
  const res = await api.get<ApiResponse<CartSummary>>("/api/v1/cart");
  return res.data.data;
};

// With guest session (no JWT)
const getCartAsGuest = async (sessionId: string): Promise<CartSummary> => {
  const res = await api.get<ApiResponse<CartSummary>>("/api/v1/cart", {
    headers: { "X-Session-ID": sessionId },
  });
  return res.data.data;
};
```

---

## POST /api/v1/cart

Adds an item to cart. If the same `variantId` already exists, the quantity is **incremented** (not replaced).

**Authentication:** JWT or X-Session-ID
**HTTP Status on success:** `200 OK`

### Request Body

```json
{
  "variantId": 5,
  "quantity": 2
}
```

> Field names are **camelCase** — no `variant_id`. This is because `CartAddRequest` has no `@JsonProperty`.

### Full Response Snapshot — `200 OK`

```json
{
  "code": 200,
  "message": "Success"
}
```

> `data` key is **absent** — not `"data": null`. `ApiResponse<Void>` serializes null data as nothing.

### Error Responses

| Code | Condition |
|------|-----------|
| `400` | `variantId` or `quantity` missing/invalid |
| `400` | Variant does not exist |
| `400` | Insufficient stock |
| `400` | Neither JWT nor X-Session-ID provided |

```json
{ "code": 400, "message": "Insufficient stock. Available: 3" }
```

### Frontend Usage

```typescript
const addToCart = async (variantId: number, quantity: number): Promise<void> => {
  await api.post("/api/v1/cart", { variantId, quantity });
};
```

---

## PUT /api/v1/cart/{variantId}

Sets the exact quantity for a cart item (replaces, does not increment).

**Authentication:** JWT or X-Session-ID
**HTTP Status on success:** `200 OK`

### Request Body

```json
{
  "quantity": 3
}
```

### Full Response Snapshot — `200 OK`

```json
{
  "code": 200,
  "message": "Success"
}
```

> `data` key is **absent**.

### Error Responses

| Code | Condition |
|------|-----------|
| `400` | `quantity` missing or < 1 |
| `400` | Variant not in cart |
| `400` | Insufficient stock |
| `404` | Variant does not exist |

### Frontend Usage

```typescript
const updateCartItem = async (variantId: number, quantity: number): Promise<void> => {
  await api.put(`/api/v1/cart/${variantId}`, { quantity });
};
```

---

## DELETE /api/v1/cart/{variantId}

Removes a single item from the cart.

**Authentication:** JWT or X-Session-ID
**HTTP Status on success:** `200 OK`

### Full Response Snapshot — `200 OK`

```json
{
  "code": 200,
  "message": "Success"
}
```

> `data` key is **absent**.

### Frontend Usage

```typescript
const removeCartItem = async (variantId: number): Promise<void> => {
  await api.delete(`/api/v1/cart/${variantId}`);
};
```

---

## DELETE /api/v1/cart/clear

Removes all items from the cart.

**Authentication:** JWT or X-Session-ID
**HTTP Status on success:** `200 OK`

> Use this path, not `DELETE /api/v1/cart` (that path does not exist).

### Full Response Snapshot — `200 OK`

```json
{
  "code": 200,
  "message": "Success"
}
```

### Frontend Usage

```typescript
const clearCart = async (): Promise<void> => {
  await api.delete("/api/v1/cart/clear");
};
```

---

## Frontend Flow

```
1. Guest arrives → generate sessionId = crypto.randomUUID(), store in localStorage
2. User adds item → POST /api/v1/cart  (X-Session-ID: sessionId)
3. Display cart   → GET  /api/v1/cart  (X-Session-ID: sessionId)
4. User logs in   → subsequent calls use Authorization: Bearer <token>
                    (session cart is preserved server-side if session is linked)
5. User proceeds  → POST /api/v1/orders (pass same X-Session-ID header)
6. After order    → DELETE /api/v1/cart/clear (cart emptied by server on order creation,
                    but calling clear is safe as a UI cleanup)
```

---

## React Query Example

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Fetch cart
export const useCart = () =>
  useQuery({
    queryKey: ["cart"],
    queryFn: () => api.get<ApiResponse<CartSummary>>("/api/v1/cart").then(r => r.data.data),
  });

// Add to cart
export const useAddToCart = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { variantId: number; quantity: number }) =>
      api.post("/api/v1/cart", vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });
};

// Remove item
export const useRemoveCartItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (variantId: number) => api.delete(`/api/v1/cart/${variantId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cart"] }),
  });
};
```
