# MODULE: ORDER

---

## 1. ENTITIES (Trích từ ERD)

- **Order** (`id`, `order_code`, `user_id`, `email`, `phone`, `total_amount`, `status`, `created_at`)
- **OrderItem** (`id`, `order_id`, `product_variant_id`, `quantity`, `price`)
- **DiscountCode** (`id`, `code`, `type`, `value`, `usage_limit`, `used_count`, `expired_at`)
- **ProductVariant** (Để join lấy giá gốc)
- **CartItem** (Nguồn dữ liệu item — đọc từ bảng này thay vì nhận từ request body)

---

## 2. API ENDPOINTS

**(Public)**
- `POST /api/v1/orders` (Tạo đơn hàng mới — đọc items từ cart_items theo user_id hoặc session_id)
- `POST /api/v1/orders/buy-now` (Tạo đơn hàng trực tiếp từ 1 variant — bỏ qua giỏ hàng)
- `POST /api/v1/orders/lookup` (Xem chi tiết đơn — yêu cầu email xác thực)

**(Admin - Yêu cầu Token & Role ADMIN)**
- `GET /api/v1/admin/orders` (Lấy danh sách đơn hàng có phân trang + Lọc theo `status`/`date`)

---

### Lookup Endpoint — Request & Security

**`POST /api/v1/orders/lookup`**

Request body:
```json
{
  "order_code": "string (required)",
  "email":      "string (required)"
}
```

Security rules:
- `order_code` not found → `404 Not Found`
- `order_code` found but `email` does not match → `403 Forbidden` (email gate — prevents unauthorized access even if order_code is leaked)
- Both match → `200 OK` with full `OrderResponse`
- Email comparison is case-insensitive: emails are stored lowercase at write time; the lookup normalizes input to lowercase before comparison (plain `=`, not `ILIKE`)

---

## 3. FEATURES & LOGIC

- Tạo đơn hàng (Guest & Customer) — items đọc từ giỏ hàng của user/session, không nhận từ client.
- Tính toán tổng tiền an toàn (Bảo mật).
- Áp dụng mã giảm giá (Discount).
- Sinh mã đơn hàng tự động (Ví dụ: `ORD-20260404-XXXX`).

---

## 4. VALIDATION RULES

- `email`: Bắt buộc, định dạng email chuẩn.
- `phone`: Bắt buộc.
- **Cart must not be empty**: Backend đọc `cart_items` theo `user_id` (nếu có JWT) hoặc `session_id` (nếu là guest). Nếu không có item nào trong giỏ → `400 Bad Request` với message `"Cart is empty"`.
- `discount_code`: (Optional) Nếu có truyền lên thì phải tồn tại và hợp lệ.

> **Removed:** `items` field no longer exists in the request body. Items are always read from the
> `cart_items` table. The client must add items to the cart before calling this endpoint.

---

## 5. BUSINESS RULES & STRICT LOGIC (CRITICAL)

- **KHÔNG trừ kho (No Inventory Deduction):** Tuyệt đối không gọi DB trừ stock ở API này.
- **Trạng thái mặc định:** Order status luôn khởi tạo là `PENDING`.
- **Bảo mật Giá (Price Snapshot):** TUYỆT ĐỐI KHÔNG tin tưởng giá từ Request Body. Backend phải query bảng `product_variants` để lấy giá chuẩn hiện tại.
- **Lưu giá lịch sử:** Phải lưu giá bán tại thời điểm mua vào trường `price` của bảng `order_items`.
- **Xử lý Mã giảm giá:** Nếu có `discount_code`:
    - Check tồn tại, check `expired_at` (hạn dùng), check `used_count < usage_limit`.
    - Tính toán `total_amount` cuối cùng sau khi giảm. (Lưu ý: Không được giảm dưới 0đ).
- **Dọn dẹp giỏ hàng:** Khi insert Order thành công, thực hiện xóa toàn bộ `CartItem` của `user_id` hoặc `session_id` tương ứng — **trong cùng một `@Transactional`**.
- **Nguồn items:** Items được đọc từ `cart_items` theo `user_id` (authenticated) hoặc `session_id` (guest). Client KHÔNG được gửi items trong request body.

---

## 6. DEVELOPMENT RULES

- **Tính nguyên tử:** Toàn bộ thao tác Insert Order, Insert OrderItems, Update DiscountCode (tăng `used_count`), và Delete CartItems phải nằm trong **1 `@Transactional`**.
- **Xử lý danh tính:** Nếu request có chứa Header Authorization (JWT Token), tự động gán `user_id` vào Order. Nếu không có (Guest), để `user_id = null`.
- **Header X-Session-ID:** Bắt buộc với guest checkout để đọc cart và xóa cart sau khi tạo order thành công.

---

## 7. CREATE ORDER — REQUEST BODY

```json
{
  "email": "customer@example.com",
  "phone": "0901234567",
  "discountCode": "SAVE10"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | Yes | Contact email. Stored lowercase. |
| `phone` | string | Yes | Contact phone number. |
| `discountCode` | string | No | Discount voucher code. Validated server-side. |

> **No `items` field.** The backend reads items directly from `cart_items` WHERE `user_id = ?`
> or `session_id = ?`. Items must be in the cart before this endpoint is called.

---

---

## 8. BUY NOW — REQUEST BODY & LOGIC

**`POST /api/v1/orders/buy-now`** — Public (permitAll). Guest + authenticated.

Request body:
```json
{
  "variant_id":    4,
  "quantity":      1,
  "email":         "customer@example.com",
  "phone":         "0901234567",
  "discount_code": "SAVE10"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `variant_id` | Long | Yes | The variant to purchase. |
| `quantity` | Integer | Yes | Min 1. |
| `email` | string | Yes | Contact email. Stored lowercase. |
| `phone` | string | Yes | Contact phone number. |
| `discount_code` | string | No | Validated server-side. |

**Key differences from `POST /api/v1/orders`:**
- Items come from the request body, not the cart.
- Cart is **NOT cleared** after a buy-now order.
- Stock check uses `inventory_items` count (same source of truth as §17).
- Price is always read from `product_variants.price` (never trusted from client).
- Variant + product existence validated via `findByIdWithActiveProduct` (respects soft-delete on product).

**Error cases:**
- Variant not found or parent product is deleted → `404 Not Found`
- Available stock < requested quantity → `400 Bad Request` (BusinessException)
- Invalid/expired/exhausted discount code → `400 Bad Request` (BusinessException)

**Response:** same `OrderResponse` as `POST /api/v1/orders`. Status is always `PENDING` on creation.

---

## 10. OUTPUT REQUIREMENTS

Hãy sinh ra code cho:
- `Order`, `OrderItem`, `DiscountCode` Entity.
- `OrderRepository`, `OrderItemRepository`, `DiscountCodeRepository`.
- `OrderService` & `OrderController` (Tách Public và Admin).
- **DTOs:** `OrderCreateRequest` (chỉ `email`, `phone`, `discountCode`), `OrderResponse`, `OrderItemResponse`, `OrderListResponse` (cho Admin).
