export const TOAST = {
  // Category
  CATEGORY_CREATED: "Đã tạo danh mục.",
  CATEGORY_UPDATED: "Đã cập nhật danh mục.",
  CATEGORY_DELETED: "Đã xóa danh mục.",
  CATEGORY_CREATE_ERROR: "Không thể tạo danh mục.",
  CATEGORY_UPDATE_ERROR: "Không thể cập nhật danh mục.",
  CATEGORY_DELETE_ERROR: "Không thể xóa danh mục. Có thể danh mục đang được sử dụng.",

  // Product
  PRODUCT_CREATED: "Đã tạo sản phẩm.",
  PRODUCT_UPDATED: "Đã cập nhật sản phẩm.",
  PRODUCT_DELETED: "Đã xóa sản phẩm.",
  PRODUCT_CREATE_ERROR: "Không thể tạo sản phẩm.",
  PRODUCT_UPDATE_ERROR: "Không thể cập nhật sản phẩm.",
  PRODUCT_DELETE_ERROR: "Không thể xóa sản phẩm.",

  // Cart
  CART_ADDED: "Đã thêm vào giỏ hàng.",
  CART_UPDATED: "Đã cập nhật giỏ hàng.",
  CART_REMOVED: "Đã xóa khỏi giỏ hàng.",
  CART_CLEARED: "Đã xóa toàn bộ giỏ hàng.",
  CART_ADD_ERROR: "Không thể thêm vào giỏ hàng.",
  CART_UPDATE_ERROR: "Không thể cập nhật giỏ hàng.",
  CART_REMOVE_ERROR: "Không thể xóa khỏi giỏ hàng.",

  // Order
  ORDER_CREATED: "Đặt hàng thành công!",
  ORDER_CREATE_ERROR: "Không thể đặt hàng.",

  // Admin order actions
  ORDER_MARKED_PAID: "Đã đánh dấu đơn hàng là đã thanh toán.",
  ORDER_MARK_PAID_ERROR: "Không thể đánh dấu thanh toán.",
  ORDER_ALLOCATION_RETRIED: "Đã kích hoạt phân bổ lại kho hàng.",
  ORDER_ALLOCATION_RETRY_ERROR: "Không thể phân bổ lại kho hàng.",
  ORDER_CANCELLED: "Đã hủy đơn hàng.",
  ORDER_CANCEL_ERROR: "Không thể hủy đơn hàng.",
  ORDER_DELIVERY_RESENT: "Đã gửi lại thông tin sản phẩm.",
  ORDER_DELIVERY_RESEND_ERROR: "Không thể gửi lại thông tin sản phẩm.",

  // Payment
  PAYMENT_CREATE_ERROR: "Không thể tạo liên kết thanh toán.",

  // Discount codes
  DISCOUNT_CREATED: "Đã tạo mã giảm giá.",
  DISCOUNT_UPDATED: "Đã cập nhật mã giảm giá.",
  DISCOUNT_DELETED: "Đã xóa mã giảm giá.",
  DISCOUNT_CREATE_ERROR: "Không thể tạo mã giảm giá.",
  DISCOUNT_UPDATE_ERROR: "Không thể cập nhật mã giảm giá.",
  DISCOUNT_DELETE_ERROR: "Không thể xóa mã giảm giá.",

  // Users
  USER_LOCKED: "Đã khoá tài khoản.",
  USER_UNLOCKED: "Đã mở khoá tài khoản.",
  USER_ROLE_CHANGED: "Đã thay đổi quyền người dùng.",
  USER_DELETED: "Đã xoá người dùng.",
  USER_LOCK_ERROR: "Không thể khoá tài khoản.",
  USER_UNLOCK_ERROR: "Không thể mở khoá tài khoản.",
  USER_ROLE_CHANGE_ERROR: "Không thể thay đổi quyền người dùng.",
  USER_DELETE_ERROR: "Không thể xoá người dùng.",

  // Copy
  COPIED: "Đã sao chép.",
} as const;
