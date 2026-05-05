export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "COMPLETED"
  | "PARTIALLY_COMPLETED"
  | "PAID_PENDING_STOCK"
  | "FAILED"
  | "EXPIRED";

export const TERMINAL_ORDER_STATUSES: OrderStatus[] = [
  "COMPLETED",
  "PARTIALLY_COMPLETED",
  "PAID_PENDING_STOCK",
  "FAILED",
  "EXPIRED",
];

export interface OrderItem {
  variantId: number;
  variantName: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Order {
  orderCode: string;
  status: OrderStatus;
  totalAmount: number;
  email: string;
  phone: string;
  createdAt: string;
  items: OrderItem[];
}

export interface OrderListItem {
  id: number;
  orderCode: string;
  email: string;
  phone: string;
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderPayload {
  email: string;
  phone: string;
  discountCode?: string;
}

export interface LookupOrderPayload {
  order_code: string;
  email: string;
}

export interface PaymentInfo {
  paymentUrl: string;
  method: string;
  amount: number;
  expiredAt: string;
}
