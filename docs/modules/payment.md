# MODULE: PAYMENT & WEBHOOK

---

## 1. ENTITIES (Trích từ ERD)

- **Payment** (`id`, `order_id`, `method`: VNPAY/MOMO, `transaction_code`, `amount`, `status`: PENDING/SUCCESS/FAILED, `created_at`)
- **Order** (Để join lấy thông tin kiểm tra giá tiền và cập nhật status)

---

## 2. API ENDPOINTS

**(Public)**
- `POST /api/payments/create` (Khởi tạo URL/QR thanh toán)
- `POST /api/payments/webhook` (Nhận kết quả từ VNPAY/MoMo)

---

## 3. FEATURES & LOGIC

- Tạo link thanh toán giả lập (VNPAY Sandbox hoặc mock URL).
- Xử lý Webhook bất đồng bộ (Async).
- Bảo mật Webhook bằng Signature (Chữ ký số).

---

## 4. VALIDATION RULES

- `order_code`: Bắt buộc tồn tại trong DB.
- `amount`: Bắt buộc **TRÙNG KHỚP 100%** với `total_amount` của Order.
- `signature` (CỰC QUAN TRỌNG): Request webhook bắt buộc phải có chuỗi mã hóa hợp lệ để xác minh nguồn gốc (Cần có logic chặn request giả mạo).

---

## 5. BUSINESS RULES & STRICT LOGIC (CRITICAL)

- **`transaction_code` UNIQUE:** Cột `transaction_code` trong bảng Payment phải là UNIQUE.
- **Idempotency (Lũy đẳng):** Khi Webhook gọi tới, thực hiện `INSERT` vào bảng Payment trước. Nếu xảy ra lỗi `DataIntegrityViolationException` (trùng `transaction_code`), lập tức bỏ qua logic xử lý và return `200 OK`.
- **State Check:** Nếu `Order.status` KHÔNG PHẢI là `PENDING` (ví dụ: đã `PAID`, `COMPLETED`, `EXPIRED`), lập tức return `200 OK`, KHÔNG xử lý tiếp.
- **Cập nhật trạng thái:** Nếu hợp lệ -> Update `Payment.status = SUCCESS` VÀ `Order.status = PAID`.
- **Non-blocking Webhook:** Ngay sau khi update status thành công, GỌI hàm `@Async` cấp phát kho (ví dụ: `inventoryAllocationService.allocateInventory(orderId)`) và lập tức **RETURN 200 OK** cho Cổng thanh toán. TUYỆT ĐỐI không đợi cấp phát xong mới return.

---

## 6. DEVELOPMENT RULES

- **Tách biệt nghiệp vụ:** KHÔNG viết logic xử lý kho hàng (Inventory) trong class này.
- **Tối ưu hiệu năng:** Controller Webhook phải cực kỳ nhẹ (Lightweight). Toàn bộ logic Database phải nằm trong `@Transactional`.

---

## 7. OUTPUT REQUIREMENTS

Hãy sinh ra code cho:
- `Payment` Entity & `PaymentRepository`.
- `PaymentService` & `PaymentController`.
- **DTOs:** `PaymentCreateRequest`, `WebhookRequest`, `PaymentUrlResponse`.