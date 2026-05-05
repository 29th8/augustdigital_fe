# API Documentation — Product Module

**Base URL:** `http://localhost:8080`
**API Prefix:** `/api/v1`
**Updated:** 2026-05-02

---

## Known Gotchas

> Read this before writing any code against this module.

| # | Gotcha | Detail |
|---|--------|--------|
| 1 | **`image_url` is an absolute URL** | The full `http://...` value is returned directly from the server. Do not prepend `BASE_URL`. Use as-is in `<img src>`. |
| 2 | **`image_url` is absent when null** | If no image was uploaded, the key `image_url` is **not present** in the JSON (not `null`). Your frontend type must use `string \| undefined` for the raw type, then normalize to `string \| null`. |
| 3 | **`description` is absent when null** | Same as above — omitted entirely if no description was set. |
| 4 | **Pagination is split-indexed** | Request sends `page` as **1-based**. Response returns `current_page` as **0-based**. You must add 1 to `current_page` to display the current page number. |
| 5 | **Variants replace on update** | Sending `variants` in `PUT` replaces ALL existing variants. Omit the field to keep variants unchanged. |
| 6 | **`errors[].field` is camelCase** | Validation error field names use Java field names: `categoryId`, `imageUrl` — NOT `category_id`, `image_url`. |
| 7 | **DELETE `data` field is absent** | Because of `@JsonInclude(NON_NULL)`, the response for `DELETE` has no `data` key at all — not even `"data": null`. |
| 8 | **`variants` always present in response** | `variants` is always an array (never absent), even if empty. |

---

## Raw API Types (exact JSON shape from backend)

```typescript
// These match the exact JSON keys returned by the API.
// Fields marked `?` are absent (not null) when the Java value is null.

interface ProductVariantApi {
  id: number;
  name: string;
  price: number;
  created_at: string;        // "2026-04-20T10:00:00" — no timezone suffix
}

interface ProductApi {
  id: number;
  name: string;
  category_id: number;
  category_name: string;
  description?: string;      // absent if null
  image_url?: string;        // absent if null; when present, is absolute URL
  active: boolean;
  created_at: string;
  variants: ProductVariantApi[];
}

interface PageInfoApi {
  total_elements: number;
  total_pages: number;
  current_page: number;      // 0-based: page 1 request → current_page: 0
  page_size: number;
}

interface PaginatedProductApi {
  items: ProductApi[];
  page_info: PageInfoApi;
}

// Request bodies (sent TO the API)
interface ProductVariantRequestApi {
  name: string;              // required, max 255
  price: number;             // required, > 0
}

interface ProductCreateRequestApi {
  name: string;              // required, max 255
  category_id: number;       // required
  description?: string;
  image_url?: string;
  variants: ProductVariantRequestApi[];  // required, min 1
}

interface ProductUpdateRequestApi {
  name?: string;             // max 255
  category_id?: number;
  description?: string;
  image_url?: string;
  active?: boolean;
  variants?: ProductVariantRequestApi[]; // if present: replaces all; must not be empty array
}
```

---

## Frontend Types (camelCase, normalized)

```typescript
// Use these in your components and state.
// Normalize from API types using the functions below.

interface ProductVariant {
  id: number;
  name: string;
  price: number;
  createdAt: string;
}

interface Product {
  id: number;
  name: string;
  categoryId: number;
  categoryName: string;
  description: string | null;   // normalized from absent → null
  imageUrl: string | null;       // normalized from absent → null; absolute URL
  active: boolean;
  createdAt: string;
  variants: ProductVariant[];
}

interface PageInfo {
  totalElements: number;
  totalPages: number;
  currentPage: number;           // normalized: current_page + 1 (1-based for display)
  pageSize: number;
}

interface PaginatedProduct {
  items: Product[];
  pageInfo: PageInfo;
}
```

---

## Frontend Mapping & Normalizer

```typescript
// Converts raw API shape to frontend shape.
// Call this on every product returned by the API.

function normalizeVariant(v: ProductVariantApi): ProductVariant {
  return {
    id: v.id,
    name: v.name,
    price: v.price,
    createdAt: v.created_at,
  };
}

function normalizeProduct(p: ProductApi): Product {
  return {
    id: p.id,
    name: p.name,
    categoryId: p.category_id,
    categoryName: p.category_name,
    description: p.description ?? null,  // absent → null
    imageUrl: p.image_url ?? null,        // absent → null; already absolute URL
    active: p.active,
    createdAt: p.created_at,
    variants: p.variants.map(normalizeVariant),
  };
}

function normalizePageInfo(pi: PageInfoApi): PageInfo {
  return {
    totalElements: pi.total_elements,
    totalPages: pi.total_pages,
    currentPage: pi.current_page + 1,  // convert 0-based → 1-based for display
    pageSize: pi.page_size,
  };
}

function normalizePaginatedProducts(data: PaginatedProductApi): PaginatedProduct {
  return {
    items: data.items.map(normalizeProduct),
    pageInfo: normalizePageInfo(data.page_info),
  };
}
```

---

## Public Endpoints

### GET /api/v1/products

Returns a paginated, filterable list of active, non-deleted products.

**Authentication:** None

#### Query Parameters

| Parameter     | Type     | Required | Default  | Description |
|---------------|----------|----------|----------|-------------|
| `keyword`     | `string` | No       | —        | Case-insensitive partial match on product name |
| `category_id` | `number` | No       | —        | Exact match on category ID |
| `min_price`   | `number` | No       | —        | At least one variant must have price ≥ this value |
| `max_price`   | `number` | No       | —        | At least one variant must have price ≤ this value |
| `sort`        | `string` | No       | `newest` | `newest` \| `price_asc` \| `price_desc` |
| `page`        | `number` | No       | `1`      | **1-based.** First page = `1`. |
| `limit`       | `number` | No       | `10`     | Items per page |

#### Pagination Explained

```
Request:   page=1         → first page
Response:  current_page=0 → 0-based (Spring Data)

Frontend display rule:
  displayPage = response.data.page_info.current_page + 1

Next page request:
  nextPage = currentDisplayPage + 1
  → send ?page={nextPage}
```

#### Example Request

```
GET /api/v1/products?keyword=netflix&category_id=2&sort=price_asc&page=1&limit=5
```

#### Full Response Snapshot — `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "items": [
      {
        "id": 3,
        "name": "Spotify Premium",
        "category_id": 1,
        "category_name": "Music",
        "description": "Individual plan",
        "image_url": "http://localhost:8080/uploads/products/a1b2c3d4-e5f6-7890-abcd-ef1234567890.png",
        "active": true,
        "created_at": "2026-04-20T10:00:00",
        "variants": [
          {
            "id": 5,
            "name": "1 Month",
            "price": 59000,
            "created_at": "2026-04-20T10:00:00"
          },
          {
            "id": 6,
            "name": "3 Months",
            "price": 150000,
            "created_at": "2026-04-20T10:00:00"
          }
        ]
      },
      {
        "id": 7,
        "name": "YouTube Premium",
        "category_id": 1,
        "category_name": "Music",
        "active": true,
        "created_at": "2026-04-22T14:30:00",
        "variants": [
          {
            "id": 11,
            "name": "1 Month",
            "price": 79000,
            "created_at": "2026-04-22T14:30:00"
          }
        ]
      }
    ],
    "page_info": {
      "total_elements": 42,
      "total_pages": 9,
      "current_page": 0,
      "page_size": 5
    }
  }
}
```

> Note: Product `id=7` above has no `description` or `image_url` keys — they are fully absent from JSON, not `null`.

#### Empty Result — `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "items": [],
    "page_info": {
      "total_elements": 0,
      "total_pages": 0,
      "current_page": 0,
      "page_size": 10
    }
  }
}
```

#### Frontend Usage

```typescript
const fetchProducts = async (params: {
  keyword?: string;
  categoryId?: number;
  sort?: "newest" | "price_asc" | "price_desc";
  page?: number;
  limit?: number;
}): Promise<PaginatedProduct> => {
  const res = await axios.get<ApiResponse<PaginatedProductApi>>("/api/v1/products", {
    params: {
      keyword: params.keyword,
      category_id: params.categoryId,   // API expects snake_case param name
      sort: params.sort ?? "newest",
      page: params.page ?? 1,
      limit: params.limit ?? 10,
    },
  });
  return normalizePaginatedProducts(res.data.data);
};
```

---

### GET /api/v1/products/{id}

Returns a single active, non-deleted product by ID with all variants.

**Authentication:** None

#### Full Response Snapshot — `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "id": 3,
    "name": "Spotify Premium",
    "category_id": 1,
    "category_name": "Music",
    "description": "Individual plan",
    "image_url": "http://localhost:8080/uploads/products/a1b2c3d4-e5f6-7890-abcd-ef1234567890.png",
    "active": true,
    "created_at": "2026-04-20T10:00:00",
    "variants": [
      {
        "id": 5,
        "name": "1 Month",
        "price": 59000,
        "created_at": "2026-04-20T10:00:00"
      },
      {
        "id": 6,
        "name": "3 Months",
        "price": 150000,
        "created_at": "2026-04-20T10:00:00"
      }
    ]
  }
}
```

#### Error Responses

| Code  | Condition |
|-------|-----------|
| `404` | Product not found, OR product exists but `active = false` or soft-deleted |

```json
{ "code": 404, "message": "Product not found" }
```

#### Frontend Usage

```typescript
const fetchProduct = async (id: number): Promise<Product> => {
  const res = await axios.get<ApiResponse<ProductApi>>(`/api/v1/products/${id}`);
  return normalizeProduct(res.data.data);
};
```

---

## Admin Endpoints

All `/api/v1/admin/**` endpoints require role `ADMIN`.

```
Authorization: Bearer <accessToken>
```

---

### POST /api/v1/admin/products

**HTTP Status on success:** `201 Created`

#### Request Body

```typescript
// Send with snake_case keys
{
  "name": "Netflix Premium",          // required
  "category_id": 2,                   // required
  "description": "Shared account",    // optional
  "image_url": "http://...",          // optional
  "variants": [                       // required, min 1 item
    { "name": "1 Month", "price": 80000 },
    { "name": "3 Months", "price": 210000 }
  ]
}
```

#### Full Response Snapshot — `201 Created`

```json
{
  "code": 201,
  "message": "Created",
  "data": {
    "id": 12,
    "name": "Netflix Premium",
    "category_id": 2,
    "category_name": "Video",
    "description": "Shared account",
    "image_url": "http://localhost:8080/uploads/products/netflix-banner.png",
    "active": true,
    "created_at": "2026-05-02T09:15:00",
    "variants": [
      { "id": 24, "name": "1 Month", "price": 80000, "created_at": "2026-05-02T09:15:00" },
      { "id": 25, "name": "3 Months", "price": 210000, "created_at": "2026-05-02T09:15:00" }
    ]
  }
}
```

#### Validation Error — `400 Bad Request`

```json
{
  "code": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "name", "message": "Product name is required" },
    { "field": "variants", "message": "Product must have at least one variant" }
  ]
}
```

> `errors[].field` uses **Java camelCase field names**: `categoryId`, `imageUrl` — not `category_id`, `image_url`.

#### Error Table

| Code  | Condition |
|-------|-----------|
| `400` | Validation failure |
| `401` | Missing or invalid token |
| `403` | Not ADMIN |
| `404` | `category_id` does not exist |

#### Frontend Usage

```typescript
const createProduct = async (
  payload: ProductCreateRequestApi,
  token: string
): Promise<Product> => {
  const res = await axios.post<ApiResponse<ProductApi>>(
    "/api/v1/admin/products",
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return normalizeProduct(res.data.data);
};
```

---

### PUT /api/v1/admin/products/{id}

Partial update. All fields are optional. **Only send fields you want to change.**

**HTTP Status on success:** `200 OK`

#### Request Body

```typescript
// All fields optional. Omit what you don't want to change.
{
  "name": "Netflix Premium 4K",
  "image_url": "http://localhost:8080/uploads/products/netflix-4k.png"
}
```

#### Variants Replace Behavior

```
variants field in request body:
  omitted  → existing variants kept unchanged
  []       → ERROR 400 (empty array not allowed)
  [...]    → ALL existing variants deleted, new list saved
```

#### Full Response Snapshot — `200 OK`

Same shape as `POST /api/v1/admin/products` response.

#### Error Table

| Code  | Condition |
|-------|-----------|
| `400` | `variants` provided but empty |
| `401` | Missing or invalid token |
| `403` | Not ADMIN |
| `404` | Product not found |
| `404` | `category_id` does not exist |

---

### DELETE /api/v1/admin/products/{id}

Soft-delete: sets `deleted = true`, `active = false`. The product disappears from all public endpoints.

**HTTP Status on success:** `200 OK`

#### Full Response Snapshot — `200 OK`

```json
{
  "code": 200,
  "message": "Success"
}
```

> `data` key is **absent** — not `"data": null`. This is because `@JsonInclude(NON_NULL)` omits null fields entirely.

#### Error Table

| Code  | Condition |
|-------|-----------|
| `401` | Missing or invalid token |
| `403` | Not ADMIN |
| `404` | Product not found |
