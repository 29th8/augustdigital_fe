# Tài Liệu API & Hướng Dẫn Kiểm Thử — Module Giỏ Hàng (Cart)

**Dự án:** Shop August
**Phiên bản:** 1.0
**Cập nhật:** 2026-04-06

---

## 1. Tổng Quan & Cơ Chế Xác Thực

### 1.1 Base URL

```
http://localhost:8080/api/v1/cart
```

Tất cả endpoint của module Cart đều có tiền tố `/api/v1/cart`. Không có ngoại lệ.

---

### 1.2 Cơ Chế Xác Thực Kép (Dual Authentication)

Module Cart hỗ trợ đồng thời hai loại người dùng: **đã đăng nhập** và **khách (guest)**. Hệ thống tự động nhận diện danh tính qua header.

| Loại người dùng | Header bắt buộc | Giá trị | Ghi chú |
|---|---|---|---|
| **Người dùng đã đăng nhập** | `Authorization` | `Bearer {{token}}` | Token JWT lấy từ `POST /api/v1/auth/login` |
| **Khách (Guest)** | `X-Session-ID` | `{{session_id}}` | Chuỗi định danh phiên do Frontend tự sinh (UUID khuyến nghị) |

#### Quy tắc ưu tiên

```
IF Authorization header hợp lệ
    → Hệ thống dùng user_id (lấy từ JWT)
    → X-Session-ID bị bỏ qua hoàn toàn
ELSE IF X-Session-ID header có mặt và không rỗng
    → Hệ thống dùng session_id
ELSE
    → 400 BAD REQUEST: "Authentication token or X-Session-ID header is required"
```

> **Lưu ý quan trọng:** JWT filter luôn chạy trên mọi request. Nếu token hợp lệ được gửi kèm, hệ thống **tự động** nhận diện người dùng — không cần gửi `X-Session-ID`. Endpoint `/api/v1/cart/**` được cấu hình `permitAll()` trong SecurityConfig để cho phép guest truy cập mà không bị chặn bởi Spring Security.

---

## 2. Quy Tắc Nghiệp Vụ & Luồng Xử Lý

### 2.1 Logic Upsert (Cộng Dồn Số Lượng)

`POST /api/v1/cart` thực hiện theo logic **upsert**, không phải insert đơn thuần.

```
NHẬN request: { variantId, quantity }

KIỂM TRA: CartItem với (user_id hoặc session_id) + variantId có tồn tại không?

    TRƯỜNG HỢP A — Đã tồn tại:
        new_quantity = old_quantity + request.quantity
        KIỂM TRA TỒN KHO: available_stock >= new_quantity
        → CẬP NHẬT quantity = new_quantity (không tạo record mới)

    TRƯỜNG HỢP B — Chưa tồn tại:
        KIỂM TRA TỒN KHO: available_stock >= request.quantity
        → TẠO CartItem mới
```

**Ví dụ thực tế:**

| Lần gọi | Variant ID | Quantity gửi lên | Quantity trong giỏ (kết quả) |
|---|---|---|---|
| Lần 1 | 5 | 2 | 2 (tạo mới) |
| Lần 2 | 5 | 1 | 3 (cộng dồn: 2 + 1) |
| Lần 3 | 5 | 3 | 6 (cộng dồn: 3 + 3) |

---

### 2.2 Quy Tắc Kiểm Tra Tồn Kho (Stock Validation)

Tồn kho được kiểm tra bằng cách đếm trực tiếp từ bảng `inventory_items` — không sử dụng bất kỳ field `stock` nào trên `product_variants`.

**Câu truy vấn:**
```sql
SELECT COUNT(*)
FROM inventory_items
WHERE product_variant_id = :variantId
  AND status = 'AVAILABLE'
```

**Quy tắc áp dụng:**

| Thao tác | Điều kiện hợp lệ |
|---|---|
| `POST` (thêm mới) | `available_stock >= request.quantity` |
| `POST` (upsert) | `available_stock >= old_quantity + request.quantity` |
| `PUT` (cập nhật) | `available_stock >= request.quantity` (số lượng mới tuyệt đối) |

Nếu vi phạm → `400 BAD REQUEST` với message: `"Insufficient stock. Available: {n}"`

---

### 2.3 Quy Tắc Không Giữ Chỗ Kho (No Inventory Reservation)

> **Đây là quy tắc kiến trúc quan trọng nhất của module Cart.**

```
CART  →  Chỉ KIỂM TRA tồn kho (read-only COUNT query)
          KHÔNG trừ stock
          KHÔNG khóa row (SELECT FOR UPDATE)
          KHÔNG tạo reservation record

CHECKOUT (Place Order)  →  Mới thực hiện SELECT FOR UPDATE trên inventory_items
                            Mới trừ stock thực sự
                            Mới chuyển status → 'SOLD'
```

**Lý do thiết kế:** Nếu Cart giữ chỗ kho, hàng nghìn người dùng thêm vào giỏ mà không mua sẽ khóa toàn bộ inventory, gây deadlock và làm tê liệt hệ thống. Việc khóa pessimistic (`SELECT FOR UPDATE`) chỉ xảy ra trong transaction ngắn tại bước Checkout.

**Hệ quả:** Một sản phẩm trong giỏ hàng **không đảm bảo** còn hàng khi thanh toán. Nếu tồn kho hết trước khi user checkout, lỗi sẽ xảy ra tại bước Place Order, không phải tại Cart.

---

## 3. Tài Liệu API Chi Tiết

### 3.1 Lấy Giỏ Hàng

```
GET /api/v1/cart
```

#### Headers

| Header | Bắt buộc | Mô tả |
|---|---|---|
| `Authorization` | Có* | `Bearer {{token}}` — cho người dùng đăng nhập |
| `X-Session-ID` | Có* | UUID phiên — cho khách (guest) |

*Một trong hai bắt buộc phải có.

#### Request Body

Không có.

#### Response Thành Công — `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "items": [
      {
        "variantId": 3,
        "productId": 1,
        "productName": "Netflix Premium",
        "variantName": "1 Tháng",
        "price": 120000.00,
        "quantity": 2,
        "subtotal": 240000.00
      },
      {
        "variantId": 7,
        "productId": 2,
        "productName": "Spotify",
        "variantName": "3 Tháng",
        "price": 85000.00,
        "quantity": 1,
        "subtotal": 85000.00
      }
    ],
    "totalAmount": 325000.00
  }
}
```

#### Response — Giỏ Hàng Rỗng `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "items": [],
    "totalAmount": 0.00
  }
}
```

#### Mã Lỗi

| Mã | Trường hợp |
|---|---|
| `400` | Không có `Authorization` lẫn `X-Session-ID` |

---

### 3.2 Thêm Sản Phẩm Vào Giỏ (Add / Upsert)

```
POST /api/v1/cart
```

#### Headers

| Header | Bắt buộc | Mô tả |
|---|---|---|
| `Content-Type` | Có | `application/json` |
| `Authorization` | Có* | `Bearer {{token}}` |
| `X-Session-ID` | Có* | UUID phiên — cho khách |

#### Request Body

| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `variantId` | `Long` | Có | Phải tồn tại, sản phẩm cha không bị xóa mềm |
| `quantity` | `Integer` | Có | `>= 1` |

```json
{
  "variantId": 3,
  "quantity": 2
}
```

#### Response Thành Công — `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": null
}
```

#### Mã Lỗi

| Mã | Trường hợp | Ví dụ message |
|---|---|---|
| `400` | `quantity` < 1 hoặc null | `"Quantity must be at least 1"` |
| `400` | `variantId` null | `"Variant ID is required"` |
| `400` | Tổng quantity vượt tồn kho | `"Insufficient stock. Available: 1"` |
| `400` | Thiếu cả hai header xác thực | `"Authentication token or X-Session-ID header is required"` |
| `404` | `variantId` không tồn tại hoặc sản phẩm đã xóa | `"Product variant not found"` |

**Ví dụ lỗi vượt tồn kho:**

```json
{
  "code": 400,
  "message": "Insufficient stock. Available: 1"
}
```

---

### 3.3 Cập Nhật Số Lượng (Set Exact Quantity)

```
PUT /api/v1/cart/{variantId}
```

> Thao tác này **thay thế** số lượng hiện tại bằng giá trị mới — không cộng dồn.

#### Path Parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `variantId` | `Long` | ID variant cần cập nhật trong giỏ |

#### Headers

| Header | Bắt buộc | Mô tả |
|---|---|---|
| `Content-Type` | Có | `application/json` |
| `Authorization` | Có* | `Bearer {{token}}` |
| `X-Session-ID` | Có* | UUID phiên — cho khách |

#### Request Body

| Trường | Kiểu | Bắt buộc | Ràng buộc |
|---|---|---|---|
| `quantity` | `Integer` | Có | `>= 1` |

```json
{
  "quantity": 5
}
```

#### Response Thành Công — `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": null
}
```

#### Mã Lỗi

| Mã | Trường hợp | Ví dụ message |
|---|---|---|
| `400` | `quantity` < 1 | `"Quantity must be at least 1"` |
| `400` | `quantity` vượt tồn kho hiện tại | `"Insufficient stock. Available: 3"` |
| `404` | Variant không có trong giỏ của user/session này | `"Cart item not found"` |

---

### 3.4 Xóa Một Sản Phẩm Khỏi Giỏ

```
DELETE /api/v1/cart/{variantId}
```

#### Path Parameters

| Tham số | Kiểu | Mô tả |
|---|---|---|
| `variantId` | `Long` | ID variant cần xóa |

#### Headers

| Header | Bắt buộc | Mô tả |
|---|---|---|
| `Authorization` | Có* | `Bearer {{token}}` |
| `X-Session-ID` | Có* | UUID phiên — cho khách |

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

#### Mã Lỗi

| Mã | Trường hợp | Ví dụ message |
|---|---|---|
| `404` | Variant không tồn tại trong giỏ | `"Cart item not found"` |
| `400` | Thiếu cả hai header xác thực | `"Authentication token or X-Session-ID header is required"` |

---

### 3.5 Xóa Toàn Bộ Giỏ Hàng

```
DELETE /api/v1/cart/clear
```

> Được gọi **tự động** bởi hệ thống sau khi `POST /api/v1/orders` thành công (đặt hàng xong xóa giỏ). Cũng có thể gọi thủ công bởi Frontend.

#### Headers

| Header | Bắt buộc | Mô tả |
|---|---|---|
| `Authorization` | Có* | `Bearer {{token}}` |
| `X-Session-ID` | Có* | UUID phiên — cho khách |

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

> Trả về `200 OK` ngay cả khi giỏ hàng đã rỗng từ trước — thao tác này idempotent.

#### Mã Lỗi

| Mã | Trường hợp |
|---|---|
| `400` | Thiếu cả hai header xác thực |

---

## 4. Postman Testing Playbook

### Thiết Lập Môi Trường Postman

Tạo một **Environment** trong Postman tên `Shop August - Local` với các biến sau:

| Variable | Initial Value | Mô tả |
|---|---|---|
| `base_url` | `http://localhost:8080` | Base URL của server |
| `token` | _(để trống, tự điền sau login)_ | JWT token của user |
| `session_id` | `550e8400-e29b-41d4-a716-446655440000` | UUID cố định cho test guest |
| `variant_id` | `1` | ID variant dùng để test |

---

### Bước 1 — Lấy Token (Chỉ cho luồng User)

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

**Postman Script (tab Tests) — tự động lưu token:**

```javascript
const res = pm.response.json();
pm.environment.set("token", res.data.token);
```

---

### Bước 2A — Thêm Sản Phẩm (Luồng User Đã Đăng Nhập)

**Request:**

```
POST {{base_url}}/api/v1/cart
Authorization: Bearer {{token}}
Content-Type: application/json
```

```json
{
  "variantId": 3,
  "quantity": 2
}
```

**Kết quả mong đợi:** `200 OK` — `data: null`

**Curl tương đương:**

```bash
curl -X POST http://localhost:8080/api/v1/cart \
  -H "Authorization: Bearer {{token}}" \
  -H "Content-Type: application/json" \
  -d '{"variantId": 3, "quantity": 2}'
```

---

### Bước 2B — Thêm Sản Phẩm (Luồng Guest)

**Request:**

```
POST {{base_url}}/api/v1/cart
X-Session-ID: {{session_id}}
Content-Type: application/json
```

```json
{
  "variantId": 3,
  "quantity": 2
}
```

**Kết quả mong đợi:** `200 OK` — `data: null`

**Curl tương đương:**

```bash
curl -X POST http://localhost:8080/api/v1/cart \
  -H "X-Session-ID: 550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json" \
  -d '{"variantId": 3, "quantity": 2}'
```

---

### Bước 3 — Kiểm Tra Logic Upsert (POST Cùng Variant Lần 2)

Gọi lại **cùng request** như Bước 2 với `quantity: 1`:

```
POST {{base_url}}/api/v1/cart
Authorization: Bearer {{token}}
Content-Type: application/json
```

```json
{
  "variantId": 3,
  "quantity": 1
}
```

**Kết quả mong đợi:** `200 OK`

**Xác minh bằng GET (Bước 6):** Variant ID 3 phải có `quantity: 3` (2 + 1), không phải tạo bản ghi mới.

---

### Bước 4 — Kiểm Tra Vượt Tồn Kho (400 Error)

Giả sử variant ID 3 chỉ còn 5 sản phẩm trong kho. Thử thêm số lượng lớn hơn phần còn lại:

> Nếu giỏ đang có `quantity: 3`, thêm `quantity: 10` → tổng = 13 > 5 → phải báo lỗi.

```
POST {{base_url}}/api/v1/cart
Authorization: Bearer {{token}}
Content-Type: application/json
```

```json
{
  "variantId": 3,
  "quantity": 10
}
```

**Kết quả mong đợi:** `400 BAD REQUEST`

```json
{
  "code": 400,
  "message": "Insufficient stock. Available: 5"
}
```

**Postman Test Script:**

```javascript
pm.test("Returns 400 when stock exceeded", () => {
    pm.response.to.have.status(400);
    const res = pm.response.json();
    pm.expect(res.code).to.equal(400);
    pm.expect(res.message).to.include("Insufficient stock");
});
```

---

### Bước 5 — Cập Nhật Số Lượng Chính Xác (PUT)

```
PUT {{base_url}}/api/v1/cart/3
Authorization: Bearer {{token}}
Content-Type: application/json
```

```json
{
  "quantity": 1
}
```

**Kết quả mong đợi:** `200 OK` — giỏ hàng variant ID 3 giờ có đúng `quantity: 1`, không phải cộng dồn.

**Curl tương đương:**

```bash
curl -X PUT http://localhost:8080/api/v1/cart/3 \
  -H "Authorization: Bearer {{token}}" \
  -H "Content-Type: application/json" \
  -d '{"quantity": 1}'
```

---

### Bước 6 — Xem Giỏ Hàng (GET)

```
GET {{base_url}}/api/v1/cart
Authorization: Bearer {{token}}
```

**Kết quả mong đợi:** `200 OK`

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "items": [
      {
        "variantId": 3,
        "productId": 1,
        "productName": "Netflix Premium",
        "variantName": "1 Tháng",
        "price": 120000.00,
        "quantity": 1,
        "subtotal": 120000.00
      }
    ],
    "totalAmount": 120000.00
  }
}
```

**Postman Test Script:**

```javascript
pm.test("Cart returns correct total", () => {
    pm.response.to.have.status(200);
    const data = pm.response.json().data;
    pm.expect(data.items).to.be.an("array");
    pm.expect(data.totalAmount).to.be.a("number");
    pm.expect(data.totalAmount).to.be.above(0);
});
```

**Curl tương đương:**

```bash
curl -X GET http://localhost:8080/api/v1/cart \
  -H "Authorization: Bearer {{token}}"
```

---

### Bước 7A — Xóa Một Sản Phẩm (DELETE item)

```
DELETE {{base_url}}/api/v1/cart/3
Authorization: Bearer {{token}}
```

**Kết quả mong đợi:** `200 OK`

**Curl tương đương:**

```bash
curl -X DELETE http://localhost:8080/api/v1/cart/3 \
  -H "Authorization: Bearer {{token}}"
```

---

### Bước 7B — Xóa Toàn Bộ Giỏ Hàng (DELETE clear)

```
DELETE {{base_url}}/api/v1/cart/clear
Authorization: Bearer {{token}}
```

**Kết quả mong đợi:** `200 OK` — giỏ trống, `GET /api/v1/cart` trả về `items: []`

**Curl tương đương:**

```bash
curl -X DELETE http://localhost:8080/api/v1/cart/clear \
  -H "Authorization: Bearer {{token}}"
```

---

### Tổng Hợp Test Cases

| # | Scenario | Method | Endpoint | Kết quả mong đợi |
|---|---|---|---|---|
| 1 | Lấy token | `POST` | `/auth/login` | `200` + token |
| 2a | Thêm item (user) | `POST` | `/cart` | `200` |
| 2b | Thêm item (guest) | `POST` | `/cart` | `200` |
| 3 | Upsert cùng variant | `POST` | `/cart` | `200`, quantity cộng dồn |
| 4 | Vượt tồn kho | `POST` | `/cart` | `400` + message tồn kho |
| 5 | Cập nhật exact qty | `PUT` | `/cart/{variantId}` | `200`, quantity thay thế |
| 6 | Xem giỏ hàng | `GET` | `/cart` | `200` + `totalAmount` |
| 7a | Xóa một item | `DELETE` | `/cart/{variantId}` | `200` |
| 7b | Xóa toàn bộ | `DELETE` | `/cart/clear` | `200` |
| 8 | Thiếu header xác thực | `GET` | `/cart` | `400` |
| 9 | Variant không tồn tại | `POST` | `/cart` | `404` |
| 10 | Xóa item không có trong giỏ | `DELETE` | `/cart/999` | `404` |
