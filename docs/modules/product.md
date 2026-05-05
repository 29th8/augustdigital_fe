# MODULE: PRODUCT

---

## 1. ENTITIES (Trích từ ERD)

- **Category** (`id`, `name`, `created_at`)
- **Product** (`id`, `name`, `category_id`, `description`, `is_active`, `is_deleted`, `created_at`)
- **ProductVariant** (`id`, `product_id`, `name`, `price`, `stock`, `created_at`)

---

## 2. API ENDPOINTS

**(Public)**
- `GET /api/products` (Lấy danh sách có phân trang + Lọc)
- `GET /api/products/{id}` (Kèm danh sách variants)

**(Admin - Yêu cầu Token & Role ADMIN)**
- `POST /api/admin/products`
- `PUT /api/admin/products/{id}`
- `DELETE /api/admin/products/{id}`

---

## 3. FEATURES & QUERY PARAMS

- `GET /api/products` hỗ trợ các query params:
    - `keyword` (tìm theo tên sản phẩm)
    - `category_id`
    - `min_price`, `max_price`
    - `sort` (`price_asc`, `price_desc`, `newest`)
    - `page`, `limit`

---

## 4. VALIDATION RULES

- `Product name`: required, không được để trống.
- `category_id`: bắt buộc phải tồn tại trong DB.
- `Variants list`: không được rỗng (Mỗi sản phẩm phải có ít nhất 1 variant).
- `Variant price`: > 0.
- `Variant stock`: >= 0.

---

## 5. BUSINESS RULES & STRICT LOGIC

- Xóa mềm (Soft Delete - CỰC QUAN TRỌNG): API DELETE chỉ cập nhật `is_deleted = true`. KHÔNG DÙNG hàm `repository.delete()`.
- Lọc hiển thị: API Public (`GET /api/products`) CHỈ trả về các sản phẩm có `is_active = true` VÀ `is_deleted = false`.
- Nested Payload: API POST/PUT Product phải nhận vào DTO bao gồm thông tin Product VÀ một `List<ProductVariantRequest>` để lưu cùng lúc.

---

## 6. DEVELOPMENT RULES

- Sử dụng Spring Data JPA Specification hoặc `@Query` để xử lý dynamic filter (tìm kiếm đa điều kiện).
- Áp dụng Pagination (Pageable của Spring) trả về cấu trúc PaginationResponse chuẩn.
- Map DTO cẩn thận để tránh vòng lặp vô hạn (Infinite Recursion) giữa Product và ProductVariant khi parse JSON.

---

## 7. OUTPUT REQUIREMENTS

Hãy sinh ra code cho:
- `Category`, `Product`, `ProductVariant` Entity.
- `ProductRepository` (kèm Specification nếu cần), `CategoryRepository`, `ProductVariantRepository`.
- `ProductService` & `ProductController` (Tách rõ Public Controller và Admin Controller nếu cần).
- DTOs: `ProductCreateRequest`, `ProductResponse` (chứa `List<VariantResponse>`), `ProductFilterRequest`.