# Tài Liệu API — Module Danh Mục (Category)

**Dự án:** Shop August
**Phiên bản:** 1.0
**Cập nhật:** 2026-04-06

---

## 1. Tổng Quan

### Base URL

```
http://localhost:8080/api/v1
```

### Xác Thực

| Loại endpoint | Yêu cầu xác thực | Vai trò |
|---|---|---|
| `GET /api/v1/categories` | Không | Công khai |
| `POST /api/v1/admin/categories` | Có — Bearer Token | `ADMIN` |
| `PUT /api/v1/admin/categories/{id}` | Có — Bearer Token | `ADMIN` |
| `DELETE /api/v1/admin/categories/{id}` | Có — Bearer Token | `ADMIN` |

**Header xác thực cho endpoint Admin:**

```
Authorization: Bearer <jwt_token>
```

---

## 2. Chi Tiết Endpoint

---

### 2.1 Lấy Danh Sách Danh Mục

**Mô tả:** Trả về toàn bộ danh sách danh mục. Không yêu cầu đăng nhập.

```
GET /api/v1/categories
```

#### Headers

| Header | Bắt buộc | Giá trị |
|---|---|---|
| `Content-Type` | Không | — |
| `Authorization` | Không | — |

#### Request Body

Không có.

#### Response Thành Công — `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": [
    {
      "id": 1,
      "name": "Game Keys",
      "createdAt": "2026-04-06T10:00:00"
    },
    {
      "id": 2,
      "name": "Streaming Accounts",
      "createdAt": "2026-04-06T11:30:00"
    }
  ]
}
```

#### Mã Lỗi Thường Gặp

| Mã | Mô tả |
|---|---|
| `500` | Lỗi server nội bộ |

---

### 2.2 Tạo Danh Mục Mới

**Mô tả:** Tạo một danh mục mới. Chỉ `ADMIN` được phép thực hiện.

```
POST /api/v1/admin/categories
```

#### Headers

| Header | Bắt buộc | Giá trị |
|---|---|---|
| `Content-Type` | Có | `application/json` |
| `Authorization` | Có | `Bearer <jwt_token>` |

#### Request Body

| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `name` | `String` | Có | Không được để trống, tối đa 100 ký tự, phải là duy nhất |

```json
{
  "name": "Game Keys"
}
```

#### Response Thành Công — `201 Created`

```json
{
  "code": 201,
  "message": "Created",
  "data": {
    "id": 1,
    "name": "Game Keys",
    "createdAt": "2026-04-06T10:00:00"
  }
}
```

#### Mã Lỗi Thường Gặp

| Mã | Trường hợp | Ví dụ message |
|---|---|---|
| `400` | `name` để trống | `"Category name is required"` |
| `400` | `name` vượt 100 ký tự | `"Category name must not exceed 100 characters"` |
| `400` | `name` đã tồn tại | `"Category name already exists"` |
| `401` | Không có hoặc sai token | `"Unauthorized"` |
| `403` | Token hợp lệ nhưng không phải `ADMIN` | `"Forbidden"` |

**Ví dụ response lỗi `400` (tên trùng):**

```json
{
  "code": 400,
  "message": "Category name already exists"
}
```

**Ví dụ response lỗi `400` (validation):**

```json
{
  "code": 400,
  "message": "Validation failed",
  "errors": [
    {
      "field": "name",
      "message": "Category name is required"
    }
  ]
}
```

---

### 2.3 Cập Nhật Danh Mục

**Mô tả:** Cập nhật tên của một danh mục theo `id`. Chỉ `ADMIN` được phép thực hiện.

```
PUT /api/v1/admin/categories/{id}
```

#### Path Parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | `Long` | ID của danh mục cần cập nhật |

#### Headers

| Header | Bắt buộc | Giá trị |
|---|---|---|
| `Content-Type` | Có | `application/json` |
| `Authorization` | Có | `Bearer <jwt_token>` |

#### Request Body

| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `name` | `String` | Có | Không được để trống, tối đa 100 ký tự, phải là duy nhất |

```json
{
  "name": "PC Game Keys"
}
```

#### Response Thành Công — `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "id": 1,
    "name": "PC Game Keys",
    "createdAt": "2026-04-06T10:00:00"
  }
}
```

#### Mã Lỗi Thường Gặp

| Mã | Trường hợp | Ví dụ message |
|---|---|---|
| `400` | `name` để trống | `"Category name is required"` |
| `400` | `name` đã tồn tại ở danh mục khác | `"Category name already exists"` |
| `401` | Không có hoặc sai token | `"Unauthorized"` |
| `403` | Token hợp lệ nhưng không phải `ADMIN` | `"Forbidden"` |
| `404` | Không tìm thấy danh mục với `id` | `"Category not found"` |

---

### 2.4 Xóa Danh Mục

**Mô tả:** Xóa vĩnh viễn một danh mục theo `id`. Chỉ `ADMIN` được phép thực hiện.

```
DELETE /api/v1/admin/categories/{id}
```

#### Path Parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `id` | `Long` | ID của danh mục cần xóa |

#### Headers

| Header | Bắt buộc | Giá trị |
|---|---|---|
| `Authorization` | Có | `Bearer <jwt_token>` |

#### Request Body

Không có.

#### Response Thành Công — `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": null
}
```

#### Mã Lỗi Thường Gặp

| Mã | Trường hợp | Ví dụ message |
|---|---|---|
| `401` | Không có hoặc sai token | `"Unauthorized"` |
| `403` | Token hợp lệ nhưng không phải `ADMIN` | `"Forbidden"` |
| `404` | Không tìm thấy danh mục với `id` | `"Category not found"` |

---

## 3. Quy Tắc Nghiệp Vụ

### Tính Duy Nhất Của Tên (`name`)

- Trường `name` có ràng buộc `UNIQUE` ở cả tầng cơ sở dữ liệu (`UNIQUE` constraint) và tầng ứng dụng.
- Kiểm tra trùng lặp được thực hiện **trước khi lưu** ở cả thao tác tạo mới và cập nhật.
- Khi cập nhật: nếu tên mới **trùng với chính danh mục đang sửa**, hệ thống **không** báo lỗi — chỉ báo lỗi khi tên đã tồn tại ở danh mục **khác**.
- So sánh tên là **phân biệt chữ hoa/thường** (`"Game Keys"` và `"game keys"` được coi là khác nhau ở tầng ứng dụng, nhưng nên chuẩn hóa ở tầng frontend để tránh nhầm lẫn cho người dùng).

### Logic Xóa

- Xóa danh mục là **xóa vĩnh viễn** (hard delete) — không có cơ chế soft delete cho entity này.
- **Lưu ý quan trọng:** Nếu danh mục đang được liên kết với một hoặc nhiều `Product`, thao tác xóa sẽ bị **chặn bởi ràng buộc khóa ngoại** (`FK → categories.id`) ở tầng cơ sở dữ liệu và trả về lỗi `500`. Frontend cần kiểm tra trước khi cho phép xóa hoặc hiển thị cảnh báo phù hợp.

---

## 4. Ví Dụ Postman

### Bước 1 — Lấy token Admin (dùng cho tất cả request Admin bên dưới)

```
POST http://localhost:8080/api/v1/auth/login
Content-Type: application/json
```

```json
{
  "email": "admin@augustdigital.com",
  "password": "Admin@123"
}
```

Sao chép giá trị `data.token` từ response và dán vào header `Authorization: Bearer <token>` cho các request Admin.

---

### 4.1 GET — Lấy danh sách danh mục (Công khai)

```
GET http://localhost:8080/api/v1/categories
```

*Không cần header Authorization.*

---

### 4.2 POST — Tạo danh mục mới

```
POST http://localhost:8080/api/v1/admin/categories
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body:**

```json
{
  "name": "Game Keys"
}
```

---

### 4.3 PUT — Cập nhật danh mục (id = 1)

```
PUT http://localhost:8080/api/v1/admin/categories/1
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body:**

```json
{
  "name": "PC Game Keys"
}
```

---

### 4.4 DELETE — Xóa danh mục (id = 1)

```
DELETE http://localhost:8080/api/v1/admin/categories/1
Authorization: Bearer {{token}}
```

*Không cần body.*

---

### 4.5 Mẫu test lỗi — Tạo danh mục với tên trùng

```
POST http://localhost:8080/api/v1/admin/categories
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (tên đã tồn tại):**

```json
{
  "name": "PC Game Keys"
}
```

**Response mong đợi (`400`):**

```json
{
  "code": 400,
  "message": "Category name already exists"
}
```

---

### 4.6 Mẫu test lỗi — Xóa danh mục không tồn tại

```
DELETE http://localhost:8080/api/v1/admin/categories/9999
Authorization: Bearer {{token}}
```

**Response mong đợi (`404`):**

```json
{
  "code": 404,
  "message": "Category not found"
}
```
