# API Documentation — Auth Module

**Base URL:** `http://localhost:8080`
**Updated:** 2026-05-02

---

## Known Gotchas

| # | Gotcha | Detail |
|---|--------|--------|
| 1 | **`accessToken` and `tokenType` are camelCase** | `AuthResponse` has no `@JsonProperty`. Jackson uses Java field names directly: `accessToken`, `tokenType`. Do NOT look for `access_token`. |
| 2 | **`createdAt` / `updatedAt` are camelCase** | `UserProfileResponse` also has no `@JsonProperty`. All fields are camelCase. |
| 3 | **Register always assigns `CUSTOMER` role** | The role cannot be set via API. No field for it exists in the request body. |
| 4 | **No refresh token** | Token expires after 24 hours. User must re-login. Handle 401 by redirecting to login page. |
| 5 | **Register returns `201`, login returns `200`** | Register uses `ApiResponse.created()` → `201`. Login uses `ApiResponse.success()` → `200`. |
| 6 | **Email is normalized to lowercase** | The backend stores and compares emails in lowercase. `User@Example.com` and `user@example.com` are the same account. |

---

## Raw API Types

```typescript
// Exact JSON keys from the API

// POST /auth/register → 201 Created
// POST /auth/login    → 200 OK
interface AuthResponseApi {
  accessToken: string;   // camelCase — JWT string
  tokenType: string;     // always "Bearer"
}

// GET /auth/me → 200 OK
interface UserProfileApi {
  id: number;
  email: string;
  role: "ADMIN" | "CUSTOMER";
  createdAt: string;     // camelCase — ISO 8601 datetime
  updatedAt: string;     // camelCase — ISO 8601 datetime
}

// Request bodies
interface LoginRequestApi {
  email: string;     // required, valid email format
  password: string;  // required
}

interface RegisterRequestApi {
  email: string;     // required, valid email format
  password: string;  // required, min 6 characters
}
```

---

## Frontend Types

```typescript
// No snake_case conversion needed for auth — all fields are already camelCase.
// These types match the raw API types directly.

type UserRole = "ADMIN" | "CUSTOMER";

interface AuthResult {
  accessToken: string;
  tokenType: string;
}

interface UserProfile {
  id: number;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}
```

---

## Frontend Mapping

No normalizer needed — raw types match frontend types 1:1 for auth responses.

```typescript
const authResult: AuthResult = res.data.data;
const profile: UserProfile = res.data.data;
```

---

## Token Usage

Store the token after login/register and attach to all protected requests:

```typescript
// Store
localStorage.setItem("accessToken", authResult.accessToken);

// Attach to axios globally
const token = localStorage.getItem("accessToken");
axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

// Or per-request
const res = await axios.get("/api/v1/auth/me", {
  headers: { Authorization: `Bearer ${token}` },
});
```

**Header format:** `Authorization: Bearer <accessToken>`
No `tokenType` prefix logic is needed — the value is always `"Bearer"`.

---

## POST /api/v1/auth/register

Creates a new account. Role is always `CUSTOMER`.

**Authentication:** None
**HTTP Status on success:** `201 Created`

### Request Body

```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

### Full Response Snapshot — `201 Created`

```json
{
  "code": 201,
  "message": "Created",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyQGV4YW1wbGUuY29tIiwiaWF0IjoxNzE0NjQwMDAwLCJleHAiOjE3MTQ3MjY0MDB9.abc123",
    "tokenType": "Bearer"
  }
}
```

### Error Responses

**Validation error — `400`:**

```json
{
  "code": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Email must be a valid format" },
    { "field": "password", "message": "Password must be at least 6 characters" }
  ]
}
```

**Duplicate email — `400`:**

```json
{
  "code": 400,
  "message": "Email already registered"
}
```

| Code | Condition |
|------|-----------|
| `400` | Blank/invalid email |
| `400` | Password blank or < 6 chars |
| `400` | Email already registered |

### Frontend Usage

```typescript
const register = async (email: string, password: string): Promise<AuthResult> => {
  const res = await axios.post<ApiResponse<AuthResponseApi>>("/api/v1/auth/register", {
    email: email.toLowerCase().trim(),  // normalize before sending
    password,
  });
  // res.data.code === 201
  return res.data.data;
};
```

---

## POST /api/v1/auth/login

Authenticates and returns a JWT token.

**Authentication:** None
**HTTP Status on success:** `200 OK`

### Request Body

```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

### Full Response Snapshot — `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyQGV4YW1wbGUuY29tIiwiaWF0IjoxNzE0NjQwMDAwLCJleHAiOjE3MTQ3MjY0MDB9.abc123",
    "tokenType": "Bearer"
  }
}
```

### Error Responses

**Wrong credentials — `401`:**

```json
{
  "code": 401,
  "message": "Invalid email or password"
}
```

| Code | Condition |
|------|-----------|
| `400` | Blank/invalid email or password |
| `401` | Email not found, or wrong password |

### Frontend Usage

```typescript
const login = async (email: string, password: string): Promise<AuthResult> => {
  const res = await axios.post<ApiResponse<AuthResponseApi>>("/api/v1/auth/login", {
    email,
    password,
  });
  // res.data.code === 200
  const { accessToken } = res.data.data;
  localStorage.setItem("accessToken", accessToken);
  axios.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
  return res.data.data;
};
```

---

## GET /api/v1/auth/me

Returns the profile of the currently authenticated user.

**Authentication:** Required (any valid token, any role)

### Full Response Snapshot — `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "id": 7,
    "email": "user@example.com",
    "role": "CUSTOMER",
    "createdAt": "2026-04-20T10:30:00",
    "updatedAt": "2026-04-20T10:30:00"
  }
}
```

### Admin user response — same shape, different role

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "id": 1,
    "email": "admin@augustdigital.com",
    "role": "ADMIN",
    "createdAt": "2026-04-01T08:00:00",
    "updatedAt": "2026-04-01T08:00:00"
  }
}
```

### Error Response — `401`

```json
{
  "code": 401,
  "message": "Unauthorized: Full authentication is required to access this resource"
}
```

### Frontend Usage

```typescript
const getProfile = async (): Promise<UserProfile> => {
  const res = await axios.get<ApiResponse<UserProfileApi>>("/api/v1/auth/me");
  return res.data.data;  // no normalization needed
};

// Guard admin routes
const isAdmin = (profile: UserProfile): boolean => profile.role === "ADMIN";
```

---

## Token Expiry & Session Management

```
Token lifetime: 24 hours (86,400,000 ms)
Expiry behavior: server returns 401 on expired token

Recommended frontend pattern:
1. On 401 response → clear token → redirect to /login
2. On app init → call GET /api/v1/auth/me to verify token is still valid
3. No refresh token endpoint exists
```

```typescript
// axios interceptor for auto-logout on 401
axios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("accessToken");
      delete axios.defaults.headers.common["Authorization"];
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
```

---

## Role-Based Access Summary

| Role | Can access |
|------|------------|
| `CUSTOMER` | All public endpoints + `/api/v1/auth/me` + authenticated customer endpoints |
| `ADMIN` | Everything above + all `/api/v1/admin/**` endpoints |

`role` is set by the backend at registration. It cannot be changed via API.
