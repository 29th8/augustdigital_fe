# Tài Liệu API & Hướng Dẫn Kiểm Thử — Module Xác Thực (Auth)

**Dự án:** Shop August
**Phiên bản:** 1.0
**Cập nhật:** 2026-04-26

---

## 1. Tổng Quan

### 1.1 Base URL

```
http://localhost:8080/api/v1/auth
```

Module Auth cung cấp 3 endpoint: đăng ký tài khoản, đăng nhập, và lấy thông tin người dùng hiện tại.

---

### 1.2 Cơ Chế Xác Thực

Hệ thống sử dụng **JWT (JSON Web Token)**. Sau khi đăng nhập thành công, client nhận được `accessToken` và phải gửi kèm trong header của mọi request đến endpoint được bảo vệ:

```
Authorization: Bearer <accessToken>
```

Token được đọc và xác thực bởi `JwtAuthenticationFilter` — chạy trên mọi request trước khi đến controller.

---

### 1.3 Quy Tắc Email

- Email được chuẩn hóa về **chữ thường (lowercase)** tại thời điểm lưu vào DB.
- Mọi so sánh email dùng toán tử `=` (không dùng `ILIKE` hay `LOWER()`).
- Role luôn là `CUSTOMER` sau khi đăng ký — không thể truyền role từ request body.

---

## 2. Tài Liệu API Chi Tiết

### 2.1 Đăng Ký Tài Khoản

```
POST /api/v1/auth/register
```

Tạo tài khoản mới với role mặc định `CUSTOMER`. Email được normalize về lowercase trước khi lưu.

#### Headers

| Header         | Bắt buộc | Giá trị            |
|----------------|----------|--------------------|
| `Content-Type` | Có       | `application/json` |

#### Request Body

| Trường     | Kiểu     | Bắt buộc | Ràng buộc                        |
|------------|----------|----------|----------------------------------|
| `email`    | `String` | Có       | Định dạng email hợp lệ           |
| `password` | `String` | Có       | Tối thiểu 6 ký tự                |

```json
{
  "email": "user@augustdigital.com",
  "password": "User@123"
}
```

#### Response Thành Công — `201 CREATED`

```json
{
  "code": 201,
  "message": "Created",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer"
  }
}
```

#### Mã Lỗi

| Mã    | Trường hợp                               | Ví dụ message                          |
|-------|------------------------------------------|----------------------------------------|
| `400` | `email` trống hoặc sai định dạng        | `"Email must be a valid format"`       |
| `400` | `password` trống hoặc dưới 6 ký tự      | `"Password must be at least 6 characters"` |
| `400` | Email đã tồn tại trong hệ thống          | `"Email already registered"`           |

**Ví dụ lỗi validation:**

```json
{
  "code": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Email must be a valid format"
    },
    {
      "field": "password",
      "message": "Password must be at least 6 characters"
    }
  ]
}
```

---

### 2.2 Đăng Nhập

```
POST /api/v1/auth/login
```

Xác thực thông tin đăng nhập, trả về JWT token.

#### Headers

| Header         | Bắt buộc | Giá trị            |
|----------------|----------|--------------------|
| `Content-Type` | Có       | `application/json` |

#### Request Body

| Trường     | Kiểu     | Bắt buộc | Ràng buộc              |
|------------|----------|----------|------------------------|
| `email`    | `String` | Có       | Định dạng email hợp lệ |
| `password` | `String` | Có       | Không được trống       |

```json
{
  "email": "user@augustdigital.com",
  "password": "User@123"
}
```

#### Response Thành Công — `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer"
  }
}
```

#### Mã Lỗi

| Mã    | Trường hợp                                | Ví dụ message                    |
|-------|-------------------------------------------|----------------------------------|
| `400` | `email` trống hoặc sai định dạng         | `"Email must be a valid format"` |
| `400` | `password` trống                          | `"Password is required"`         |
| `401` | Email không tồn tại hoặc sai mật khẩu    | `"Invalid email or password"`    |

---

### 2.3 Lấy Thông Tin Người Dùng Hiện Tại

```
GET /api/v1/auth/me
```

Trả về thông tin profile của người dùng đang đăng nhập. **Endpoint được bảo vệ — yêu cầu JWT hợp lệ.**

#### Headers

| Header          | Bắt buộc | Giá trị                  |
|-----------------|----------|--------------------------|
| `Authorization` | Có       | `Bearer <accessToken>`   |

#### Request Body

Không có.

#### Response Thành Công — `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "id": 1,
    "email": "user@augustdigital.com",
    "role": "CUSTOMER",
    "createdAt": "2026-04-26T10:00:00",
    "updatedAt": "2026-04-26T10:00:00"
  }
}
```

#### Mã Lỗi

| Mã    | Trường hợp                                    |
|-------|-----------------------------------------------|
| `401` | Không có token hoặc token không hợp lệ/hết hạn |

---

## 3. Postman Testing Playbook

### Thiết Lập Môi Trường Postman

Tạo **Environment** tên `Shop August - Local` với các biến sau:

| Variable   | Initial Value              | Mô tả                                  |
|------------|----------------------------|----------------------------------------|
| `base_url` | `http://localhost:8080`    | Base URL của server                    |
| `token`    | _(để trống, tự điền sau login)_ | JWT token của user                |

---

### Bước 1 — Đăng Ký Tài Khoản

**Request:**

```
POST {{base_url}}/api/v1/auth/register
Content-Type: application/json
```

```json
{
  "email": "user@augustdigital.com",
  "password": "User@123"
}
```

**Kết quả mong đợi:** `201 CREATED` + `accessToken`

**Postman Script (tab Tests) — tự động lưu token:**

```javascript
const res = pm.response.json();
pm.environment.set("token", res.data.accessToken);
pm.test("Register returns 201", () => {
    pm.response.to.have.status(201);
    pm.expect(res.data.accessToken).to.be.a("string");
});
```

**Curl tương đương:**

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@augustdigital.com", "password": "User@123"}'
```

---

### Bước 2 — Đăng Nhập

**Request:**

```
POST {{base_url}}/api/v1/auth/login
Content-Type: application/json
```

```json
{
  "email": "user@augustdigital.com",
  "password": "User@123"
}
```

**Kết quả mong đợi:** `200 OK` + `accessToken`

**Postman Script (tab Tests):**

```javascript
const res = pm.response.json();
pm.environment.set("token", res.data.accessToken);
pm.test("Login returns 200 with token", () => {
    pm.response.to.have.status(200);
    pm.expect(res.data.accessToken).to.be.a("string");
    pm.expect(res.data.tokenType).to.equal("Bearer");
});
```

**Curl tương đương:**

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@augustdigital.com", "password": "User@123"}'
```

---

### Bước 3 — Lấy Thông Tin Profile

**Request:**

```
GET {{base_url}}/api/v1/auth/me
Authorization: Bearer {{token}}
```

**Kết quả mong đợi:** `200 OK` + thông tin user

**Postman Script (tab Tests):**

```javascript
pm.test("GET /me returns user profile", () => {
    pm.response.to.have.status(200);
    const data = pm.response.json().data;
    pm.expect(data.email).to.be.a("string");
    pm.expect(data.role).to.equal("CUSTOMER");
    pm.expect(data.id).to.be.a("number");
});
```

**Curl tương đương:**

```bash
curl -X GET http://localhost:8080/api/v1/auth/me \
  -H "Authorization: Bearer <your_token>"
```

---

### Bước 4 — Kiểm Tra Lỗi Xác Thực (401)

Gọi `/me` không có token:

```
GET {{base_url}}/api/v1/auth/me
```

**Kết quả mong đợi:** `401 UNAUTHORIZED`

**Postman Script:**

```javascript
pm.test("Returns 401 without token", () => {
    pm.response.to.have.status(401);
});
```

---

### Bước 5 — Kiểm Tra Đăng Ký Email Trùng (400)

Gọi lại đăng ký với email đã tồn tại:

```
POST {{base_url}}/api/v1/auth/register
Content-Type: application/json
```

```json
{
  "email": "user@augustdigital.com",
  "password": "AnotherPass@123"
}
```

**Kết quả mong đợi:** `400 BAD REQUEST`

```json
{
  "code": 400,
  "message": "Email already registered"
}
```

---

### Tổng Hợp Test Cases

| # | Scenario                              | Method | Endpoint          | Kết quả mong đợi              |
|---|---------------------------------------|--------|-------------------|-------------------------------|
| 1 | Đăng ký thành công                   | `POST` | `/auth/register`  | `201` + `accessToken`         |
| 2 | Đăng ký email trùng                  | `POST` | `/auth/register`  | `400` + message email trùng   |
| 3 | Đăng ký email sai định dạng          | `POST` | `/auth/register`  | `400` + validation errors     |
| 4 | Đăng ký password dưới 6 ký tự        | `POST` | `/auth/register`  | `400` + validation errors     |
| 5 | Đăng nhập thành công                 | `POST` | `/auth/login`     | `200` + `accessToken`         |
| 6 | Đăng nhập sai mật khẩu               | `POST` | `/auth/login`     | `401` + `"Invalid email or password"` |
| 7 | Đăng nhập email không tồn tại        | `POST` | `/auth/login`     | `401` + `"Invalid email or password"` |
| 8 | Lấy profile với token hợp lệ         | `GET`  | `/auth/me`        | `200` + user profile          |
| 9 | Lấy profile không có token           | `GET`  | `/auth/me`        | `401`                         |
| 10 | Lấy profile token hết hạn/sai       | `GET`  | `/auth/me`        | `401`                         |
