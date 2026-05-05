# MODULE: CART

---

## 1. ENTITIES (Trích từ ERD)

- **CartItem** (`id`, `user_id`, `session_id`, `product_variant_id`, `quantity`)
- **ProductVariant** (Để join lấy thông tin giá, stock, tên gói)
- **Product** (Để join lấy tên sản phẩm gốc)

---

## 2. API ENDPOINTS

- `POST /api/cart` (Thêm mới hoặc cộng dồn)
- `PUT /api/cart/{variant_id}` (Cập nhật số lượng chính xác)
- `DELETE /api/cart/{variant_id}` (Xóa 1 item)
- `DELETE /api/cart/clear` (Xóa toàn bộ giỏ hàng của user/session)
- `GET /api/cart` (Lấy chi tiết giỏ hàng)

---

## 3. FEATURES & LOGIC

- **Hỗ trợ cả 2 luồng:** Có đăng nhập (dùng `user_id` lấy từ JWT Token) và Không đăng nhập (dùng `session_id` truyền từ Header `X-Session-ID`).
- **Xóa toàn bộ giỏ:** API Clear rất cần thiết để gọi tự động sau khi user đặt hàng (Place Order) thành công.

---

## 4. VALIDATION RULES

- `variant_id`: Bắt buộc phải tồn tại và `is_deleted = false`.
- `quantity`: Bắt buộc `> 0`.
- `session_id`: Bắt buộc truyền (Header hoặc tham số) nếu user chưa login.

---

## 5. BUSINESS RULES & STRICT LOGIC (CRITICAL)

- **KHÔNG giữ chỗ kho (No inventory reservation):** Chỉ check tồn kho, không trừ stock trong bảng variant.
- **Logic Upsert (Cộng dồn):** API `POST /api/cart` nếu `variant_id` đã tồn tại trong giỏ của user/session, thì KHÔNG tạo record mới mà thực hiện cộng dồn: `new_quantity = old_quantity + request_quantity`.
- **Validate Stock:** (Số lượng đang có trong giỏ + số lượng add thêm) **KHÔNG ĐƯỢC VƯỢT QUÁ** `stock` hiện tại của `ProductVariant`. Trả về `BusinessException(400)` nếu vượt.

---

## 6. DEVELOPMENT RULES

- **Repository:** Cần viết các hàm `findByUserId(Long userId)` và `findBySessionId(String sessionId)`.
- **Dữ liệu trả về:** API `GET /api/cart` phải tính toán sẵn `total_cart_amount` (tổng tiền) và trả về thông tin chi tiết (Tên sản phẩm, Tên variant, Giá, Số lượng) để Frontend dễ render.

---

## 7. OUTPUT REQUIREMENTS

Hãy sinh ra code cho:
- `CartItem` Entity.
- `CartItemRepository`.
- `CartService` & `CartController`.
- **DTOs:** `CartAddRequest`, `CartUpdateRequest`, `CartItemResponse` (chứa detail product/variant), `CartSummaryResponse` (chứa `List<CartItemResponse>` và `total_amount`).