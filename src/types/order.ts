// ─── Order status ─────────────────────────────────────────────────────────────

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PROCESSING"
  | "COMPLETED"
  | "PARTIALLY_COMPLETED"
  | "PAID_PENDING_STOCK"
  | "CANCELLED" // Not in BE enum — kept for Zod schema compatibility
  | "FAILED"    // In BE enum but never set on orders — kept for Zod schema compatibility
  | "EXPIRED";

/** Statuses after which no further automatic transitions occur. */
export const TERMINAL_ORDER_STATUSES: OrderStatus[] = [
  "COMPLETED",
  "PARTIALLY_COMPLETED",
  "PAID_PENDING_STOCK",
  "FAILED",
  "EXPIRED",
];

/** Statuses that indicate an active/in-progress order needing UI polling. */
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = ["PENDING", "PAID", "PROCESSING"];

// ─── Warranty claim status ────────────────────────────────────────────────────

export type WarrantyClaimStatus = "NONE" | "CLAIMED" | "RESOLVED" | "REJECTED" | "PENDING_STOCK";

// ─── Delivery credentials (discriminated union) ───────────────────────────────

export interface KeyCredential {
  type: "KEY";
  key: string;
}

export interface AccountCredential {
  type: "ACCOUNT";
  email: string;
  password: string;
  profile?: string | null;
  pin?: string | null;
}

export type DeliveryCredential = KeyCredential | AccountCredential;

// ─── Delivery item (one delivered product instance) ──────────────────────────

export interface DeliveryItem {
  id: number;
  /** DB id of the parent OrderItem row — needed to submit warranty claims. */
  orderItemId?: number;
  variantId: number;
  variantName: string;
  productName: string;
  credential: DeliveryCredential;
  deliveredAt: string;
  warrantyStatus: WarrantyClaimStatus;
}

// ─── Order item (line in the order) ──────────────────────────────────────────

export interface OrderItem {
  variantId: number;
  variantName: string;
  productName: string;
  quantity: number;
  price: number;
  subtotal: number;
}

// ─── Base order ───────────────────────────────────────────────────────────────

export interface Order {
  orderCode: string;
  status: OrderStatus;
  totalAmount: number;
  email: string;
  phone: string;
  createdAt: string;
  items: OrderItem[];
}

// ─── Order detail (user-facing, includes deliveries) ─────────────────────────

export interface OrderDetail extends Order {
  updatedAt: string;
  paidAt?: string | null;
  expiredAt?: string | null;
  deliveries: DeliveryItem[];
  /** Number of items awaiting stock; >0 means partially delivered or pending stock. */
  pendingStockCount: number;
}

// ─── Order list item (compact for list views) ────────────────────────────────

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

// ─── Admin order list item (extra fields for admin table) ────────────────────

export interface AdminOrderListItem extends OrderListItem {
  itemCount: number;
}

// ─── Admin detail types ───────────────────────────────────────────────────────

export interface InventoryAllocation {
  variantId: number;
  variantName: string;
  requested: number;
  allocated: number;
  pending: number;
  failed: number;
}

export interface AuditLog {
  id: number;
  action: string;
  performedBy: string;
  performedAt: string;
  details?: string | null;
}

export interface AdminOrderDetail extends OrderDetail {
  customerId?: number | null;
  inventoryAllocations: InventoryAllocation[];
  auditLogs: AuditLog[];
}

// ─── Payloads ─────────────────────────────────────────────────────────────────

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

// ─── Query params ─────────────────────────────────────────────────────────────

export interface UserOrderListParams {
  page?: number;
  size?: number;
  status?: OrderStatus | "";
  keyword?: string;
  sort?: "newest" | "oldest";
}

export interface AdminOrderListParams {
  page?: number;
  size?: number;
  status?: OrderStatus | "";
  keyword?: string;
  from?: string;
  to?: string;
  sort?: string;
}

// ─── Lookup order types ───────────────────────────────────────────────────────

export interface LookupOrderItem {
  productName: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
}

export interface LookupDelivery {
  productName: string;
  credentials: string[]; // pre-formatted "Label: value" strings from API
}

export interface LookupOrderResult {
  id?: number;
  orderCode: string;
  status: OrderStatus;
  email: string;
  phone: string;
  totalAmount: number;
  createdAt: string;
  updatedAt?: string;
  paidAt?: string | null;
  expiredAt?: string | null;
  items: LookupOrderItem[];
  deliveries: LookupDelivery[];
}
