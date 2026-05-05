# MODULE: WARRANTY (BẢO HÀNH & HẬU MÃI)

---

## 1. ENTITIES (Trích từ ERD)

- **WarrantyRequest** (`id`, `order_item_id`, `user_email`, `description`, `status`, `created_at`)
- **WarrantyLog** (`id`, `warranty_id`, `action`, `created_at`)
- **OrderItem** & **Order** (Để xác thực quyền sở hữu và lấy `product_variant_id`)
- **InventoryItem** & **Delivery** (Để thu hồi key cũ và cấp phát key mới)

---

## 2. API ENDPOINTS

**(Public)**
- `POST /api/warranty` (User tạo yêu cầu bảo hành)
- `GET /api/warranty` (User xem danh sách yêu cầu của mình)

**(Admin - Yêu cầu Role ADMIN)**
- `GET /api/admin/warranty` (Xem danh sách ticket bảo hành)
- `PUT /api/admin/warranty/{id}/resolve` (Admin xử lý và chốt bảo hành)

---

## 3. FEATURES & LOGIC

- **Báo lỗi:** Khách hàng chủ động báo lỗi sản phẩm số đã mua.
- **Xử lý tập trung:** Admin kiểm tra, ghi log và tiến hành đổi trả (Cấp phát lại).
- **Tự động hóa:** Hệ thống hỗ trợ luồng thu hồi key cũ và giao key mới qua Email/Hệ thống.

---

## 4. VALIDATION RULES

- `order_item_id`: Bắt buộc tồn tại trong hệ thống.
- **Ownership Check (CRITICAL):** User gọi API bắt buộc phải là chủ nhân của đơn hàng chứa `order_item_id` đó (Dựa vào `user_id` trong JWT hoặc `email` đơn hàng).
- `description`: Mô tả chi tiết lỗi, không được để trống.

---

## 5. BUSINESS RULES & STRICT LOGIC

- **Trạng thái mặc định:** Khi tạo mới, `WarrantyRequest.status = 'OPEN'`. Tự động tạo 1 record trong `WarrantyLog`: "Khách hàng yêu cầu bảo hành: [description]".
- **Phản hồi nhanh (Non-blocking):** API `POST /api/warranty` chỉ lưu DB và return 200 OK ngay lập tức để tối ưu trải nghiệm UI.
- **Logic Xử lý (Resolve):** Khi Admin gọi PUT để resolve, hệ thống kích hoạt hàm `@Async allocate_inventory_for_warranty(order_item_id)`.
- **Luồng cấp phát bảo hành (Async Warranty Allocation):**
    - **Khóa dữ liệu:** Sử dụng `SELECT FOR UPDATE` giống hệt luồng mua hàng mới để tránh tranh chấp.
    - **Trường hợp ĐỦ HÀNG:** - Cập nhật Key cũ trong `InventoryItem` thành 'BANNED' hoặc 'REVOKED'.
        - Lấy Key mới: cập nhật status thành 'SOLD', update thông tin vào bảng `Delivery`.
        - Cập nhật `WarrantyRequest = 'RESOLVED'`.
        - Ghi log: "Đã cấp phát sản phẩm thay thế thành công".
    - **Trường hợp HẾT HÀNG:** - Cập nhật `WarrantyRequest = 'PENDING_STOCK'`.
        - Ghi log: "Tạm thời hết hàng đổi trả, đang chờ nhập kho để xử lý tiếp".

---

## 6. DEVELOPMENT RULES

- **Tính toàn vẹn:** Việc cấp phát lại phải nằm hoàn toàn trong **1 `@Transactional`** để tránh rác dữ liệu khi có lỗi xảy ra.
- **Tính minh bạch:** Mọi thao tác thay đổi trạng thái của `WarrantyRequest` (từ phía User hay Admin) ĐỀU PHẢI ghi lại một dòng vào `WarrantyLog`.
- **Trải nghiệm Frontend:** DTO Response trả về cần join các bảng liên quan để hiển thị rõ tên sản phẩm đang bảo hành và toàn bộ lịch sử các log xử lý.

---

## 7. OUTPUT REQUIREMENTS

Hãy sinh ra code cho:
- `WarrantyRequest` & `WarrantyLog` Entity.
- Các Repository tương ứng (`WarrantyRepository`, `WarrantyLogRepository`).
- `WarrantyService` & `WarrantyController` (Tách biệt rõ ràng Resource cho Public và Admin).
- **DTOs:** `WarrantyCreateRequest`, `WarrantyResolveRequest`, `WarrantyResponse` (chứa `List<WarrantyLogResponse>`).