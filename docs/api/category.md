# API Documentation — Category Module

**Base URL:** `http://localhost:8080`
**Updated:** 2026-05-02

---

## Known Gotchas

| # | Gotcha | Detail |
|---|--------|--------|
| 1 | **`createdAt` is camelCase** | This is the only response DTO in the project where the timestamp field is **not** annotated with `@JsonProperty`. Jackson serializes it as `createdAt` (camelCase), NOT `created_at` (snake_case). |
| 2 | **No pagination** | Returns all categories as a flat array. No `page_info`, no `items` wrapper. `data` is directly `CategoryApi[]`. |
| 3 | **`createdAt` is rarely useful on FE** | For UI purposes, you typically only need `id` and `name`. |

---

## Raw API Types

```typescript
// Exact JSON shape returned by the API
// Note: createdAt is camelCase — this is intentional and consistent with backend source code.

interface CategoryApi {
  id: number;
  name: string;
  createdAt: string;   // camelCase ("createdAt"), NOT "created_at" — no @JsonProperty on this field
}
```

---

## Frontend Types

```typescript
// No snake_case → camelCase conversion needed.
// CategoryApi fields are already camelCase in the JSON response.

interface Category {
  id: number;
  name: string;
  createdAt: string;  // ISO 8601
}
```

---

## Frontend Mapping

No normalizer needed — the raw type matches the frontend type directly.

```typescript
// Direct usage — no transformation required
const categories: Category[] = res.data.data;
```

---

## GET /api/v1/categories

Returns the complete list of categories. No filtering, no pagination.

**Authentication:** None (public endpoint)

---

### Full Response Snapshot — `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": [
    {
      "id": 1,
      "name": "Music",
      "createdAt": "2026-04-01T08:00:00"
    },
    {
      "id": 2,
      "name": "Video",
      "createdAt": "2026-04-01T08:00:00"
    },
    {
      "id": 3,
      "name": "Software",
      "createdAt": "2026-04-01T08:00:00"
    }
  ]
}
```

### Empty State — `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": []
}
```

---

### Frontend Usage

```typescript
// Fetch and use categories in a select dropdown

const fetchCategories = async (): Promise<Category[]> => {
  const res = await axios.get<ApiResponse<CategoryApi[]>>("/api/v1/categories");
  return res.data.data;  // no normalization needed
};

// Build a dropdown option list
const options = categories.map((c) => ({
  value: c.id,     // send this as category_id in product create/update
  label: c.name,
}));
```

---

### Cross-Module Relationship

When creating or updating a product, send the category `id` as `category_id` in the request body:

```typescript
// Product create request
{
  "name": "Spotify Premium",
  "category_id": 1,    // ← id from GET /api/v1/categories
  ...
}
```

If `category_id` does not match an existing category, the backend returns `404 Not Found`.
