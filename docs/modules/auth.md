# MODULE: AUTH

---

## 1. ENTITIES

- **User**
    - **Fields:**
        - `id` (BIGINT, PK)
        - `email` (VARCHAR, UNIQUE)
        - `password` (VARCHAR)
        - `role` (ENUM: ADMIN, CUSTOMER)
        - `created_at` (DATETIME)
        - `updated_at` (DATETIME)

---

## 2. API ENDPOINTS

- `POST /api/auth/register` (Public)
- `POST /api/auth/login` (Public)
- `GET /api/auth/me` (Protected - Yêu cầu Token)

---

## 3. FEATURES

- Đăng ký tài khoản mới.
- Đăng nhập, sinh chuỗi JWT Token (Access Token).
- Lấy thông tin user đang đăng nhập (Profile).

---

## 4. VALIDATION RULES

- `email`: required, định dạng email chuẩn.
- `password`: required, tối thiểu 6 ký tự.

---

## 5. BUSINESS RULES

- Password bắt buộc phải mã hóa bằng BCrypt trước khi lưu.
- Email phải là Unique. Trả về lỗi `BusinessException(400)` nếu email đã tồn tại.
- Lỗ hổng bảo mật (CRITICAL): Mọi user gọi API Register LUÔN LUÔN được gán mặc định `role = CUSTOMER`. Không cho phép nhận role từ Request Body.
- Trả về Access Token có thời hạn hợp lý (ví dụ: 1 ngày).

---

## 6. DEVELOPMENT RULES

- Sử dụng Spring Security và thư viện `jjwt`.
- Mật khẩu tuyệt đối KHÔNG ĐƯỢC trả về trong bất kỳ Response nào (kể cả API `/me`).
- Mọi Request/Response phải dùng DTO. Response thống nhất bọc trong `ApiResponse<T>`.

---

## 7. OUTPUT REQUIREMENTS

Hãy sinh ra code cho:
- `User` Entity & `UserRepository`.
- `AuthController` & `AuthService`.
- Các class DTO: `RegisterRequest`, `LoginRequest`, `AuthResponse`, `UserProfileResponse`.
- `JwtTokenProvider` & `JwtAuthenticationFilter`.
- `SecurityConfig` (cấu hình public 2 API register/login, chặn các API khác).