# API Documentation — Error Handling

**Updated:** 2026-05-02

---

## Known Gotchas

| # | Gotcha | Detail |
|---|--------|--------|
| 1 | **`data` is absent on errors, not null** | `@JsonInclude(NON_NULL)` removes any null field from JSON. Error responses have no `data` key at all. Check `res.data.data` will return `undefined`, not `null`. |
| 2 | **`errors` is absent on non-validation errors** | Only `400 Validation failed` responses include `errors[]`. All other errors have only `code` and `message`. |
| 3 | **`errors[].field` is camelCase** | Validation field names are Java field names: `categoryId`, `imageUrl`, `accessToken` — NOT their JSON keys like `category_id`, `image_url`. |
| 4 | **HTTP status matches `code` field** | The HTTP status code always equals `response.data.code`. You can use either to branch logic. |
| 5 | **Non-null fields omitted globally** | `@JsonInclude(NON_NULL)` applies to ALL responses — success and error. Any field that is `null` disappears from JSON. |

---

## Raw API Types

```typescript
// Unified type that covers both success and error shapes.
// Fields marked `?` may be absent from the JSON entirely.

interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;             // absent on errors (not null — completely missing from JSON)
  errors?: FieldError[]; // only present on 400 validation failures
}

interface FieldError {
  field: string;    // Java camelCase field name — NOT the JSON key
  message: string;  // constraint message from backend annotation
}
```

---

## HTTP Status Code Reference

| HTTP | `code` field | Meaning | When |
|------|-------------|---------|------|
| `200` | `200` | Success | GET, PUT, DELETE |
| `201` | `201` | Created | POST (register, create product, upload) |
| `400` | `400` | Bad Request | Validation failure, business rule violation |
| `401` | `401` | Unauthorized | No token, invalid token, expired token, wrong credentials |
| `403` | `403` | Forbidden | Valid token, wrong role |
| `404` | `404` | Not Found | Resource doesn't exist |
| `500` | `500` | Server Error | Unexpected backend error |

---

## Response Shapes by Status

### Success — `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": { ... }
}
```

### Created — `201 Created`

```json
{
  "code": 201,
  "message": "Created",
  "data": { ... }
}
```

### Delete success — `200 OK`

```json
{
  "code": 200,
  "message": "Success"
}
```

> `data` key is **absent** — not `"data": null`. This is because `@JsonInclude(NON_NULL)` drops null fields.

---

## 400 — Validation Error

Returned when bean validation (`@Valid`) fails on a request body field.

```json
{
  "code": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "name", "message": "Product name is required" },
    { "field": "categoryId", "message": "Category ID is required" },
    { "field": "variants", "message": "Product must have at least one variant" }
  ]
}
```

### Field Name Mapping for `errors[].field`

The `field` value is the **Java field name** — not the JSON key:

| JSON key sent in request | `errors[].field` value |
|--------------------------|------------------------|
| `category_id`            | `categoryId`           |
| `image_url`              | `imageUrl`             |
| `name`                   | `name`                 |
| `variants`               | `variants`             |
| `email`                  | `email`                |
| `password`               | `password`             |

```typescript
// To map errors to a form with snake_case field names:
const fieldMap: Record<string, string> = {
  categoryId: "category_id",
  imageUrl: "image_url",
};

const formErrors = Object.fromEntries(
  (data.errors ?? []).map((e) => [
    fieldMap[e.field] ?? e.field,  // convert java name → json key if needed
    e.message,
  ])
);
```

---

## 400 — Business Rule Error

Single-message errors, no `errors[]` array.

```json
{ "code": 400, "message": "File must not be empty" }
```

```json
{ "code": 400, "message": "File size must not exceed 5MB" }
```

```json
{ "code": 400, "message": "Only jpg, jpeg, png, webp images are allowed" }
```

```json
{ "code": 400, "message": "Insufficient stock. Available: 3" }
```

```json
{ "code": 400, "message": "Email already registered" }
```

---

## 401 — Unauthorized

```json
{
  "code": 401,
  "message": "Unauthorized: Full authentication is required to access this resource"
}
```

```json
{
  "code": 401,
  "message": "Invalid email or password"
}
```

---

## 403 — Forbidden

```json
{
  "code": 403,
  "message": "Forbidden: Access Denied"
}
```

---

## 404 — Not Found

```json
{ "code": 404, "message": "Product not found" }
```

```json
{ "code": 404, "message": "Category not found" }
```

---

## 500 — Internal Server Error

```json
{ "code": 500, "message": "Internal server error" }
```

---

## Frontend: Shared Types & Axios Setup

```typescript
// types/api.ts

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
  errors?: FieldError[];
}

export interface FieldError {
  field: string;
  message: string;
}

// Convenience: check if response is an error
export const isApiError = (res: ApiResponse): boolean => res.code >= 400;

// Convenience: extract field error map (Java camelCase keys)
export const toFieldErrors = (errors?: FieldError[]): Record<string, string> =>
  Object.fromEntries((errors ?? []).map((e) => [e.field, e.message]));
```

---

## Frontend: Global Axios Interceptor

```typescript
// lib/axios.ts

import axios from "axios";
import type { ApiResponse } from "@/types/api";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const data: ApiResponse = error.response?.data;
    const status: number = error.response?.status;

    if (status === 401) {
      localStorage.removeItem("accessToken");
      delete api.defaults.headers.common["Authorization"];
      window.location.href = "/login";
    }

    if (status === 403) {
      window.location.href = "/unauthorized";
    }

    return Promise.reject(error);
  }
);

export default api;
```

---

## Frontend: Per-Request Error Handling Pattern

```typescript
// In a form submit handler

try {
  await api.post("/api/v1/admin/products", payload);
  router.push("/admin/products");
} catch (err) {
  if (!axios.isAxiosError(err)) throw err;

  const data: ApiResponse = err.response?.data;

  if (err.response?.status === 400 && data.errors?.length) {
    // Validation error — map to form fields
    const fieldErrors = toFieldErrors(data.errors);
    // fieldErrors = { categoryId: "Category ID is required", ... }
    setErrors(fieldErrors);
  } else {
    // Business rule or other 400 — show message toast
    setGlobalError(data.message);
  }
}
```
