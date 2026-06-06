import apiClient from "./apiClient";
import { parseApiResponse } from "@/lib/parseApiResponse";
import { validateSafe } from "@/lib/validateSafe";
import { sessionHeader } from "@/lib/sessionId";
import {
  RawOrderSchema,
  RawOrderListItemSchema,
  RawAdminOrderListItemSchema,
  RawOrderDetailSchema,
  RawAdminOrderDetailSchema,
  RawLookupOrderSchema,
  type RawOrder,
  type RawOrderItem,
  type RawOrderCredential,
  type RawOrderDetailItem,
  type RawDeliveryItem,
  type RawOrderDetail,
  type RawAdminOrderDetail,
  type RawInventoryAllocation,
  type RawAuditLog,
  type RawLookupOrder,
  type RawLookupOrderItem,
  type RawLookupDelivery,
} from "@/schemas/order.schema";
import { PaginatedEnvelopeSchema } from "@/schemas/pagination.schema";
import type { ApiResponse, PaginatedData } from "@/types/api";
import type {
  Order,
  OrderItem,
  OrderListItem,
  AdminOrderListItem,
  OrderDetail,
  AdminOrderDetail,
  DeliveryItem,
  DeliveryCredential,
  InventoryAllocation,
  AuditLog,
  CreateOrderPayload,
  LookupOrderPayload,
  LookupOrderResult,
  LookupOrderItem,
  LookupDelivery,
  UserOrderListParams,
  AdminOrderListParams,
} from "@/types/order";

// ─── Normalizers ──────────────────────────────────────────────────────────────

function normalizeOrderItem(raw: RawOrderItem): OrderItem {
  return {
    variantId: raw.variantId,
    variantName: raw.variantName,
    productName: raw.productName,
    quantity: raw.quantity,
    price: raw.price,
    subtotal: raw.subtotal ?? raw.price * raw.quantity,
  };
}

// ─── Credential normalizer (legacy — for lookup/admin flows) ─────────────────

function normalizeDeliveryCredential(
  raw: RawDeliveryItem["credential"],
): DeliveryCredential {
  if (raw.type === "KEY") {
    return { type: "KEY", key: raw.key };
  }
  return {
    type: "ACCOUNT",
    email: raw.email,
    password: raw.password,
    profile: raw.profile ?? null,
    pin: raw.pin ?? null,
  };
}

// ─── Credential normalizer (new BE structure from OrderDetailDto) ─────────────
// BE returns: { type, value, password, profileName, pinCode }
// Maps to existing DeliveryCredential union type.

function normalizeOrderCredential(raw: RawOrderCredential): DeliveryCredential {
  if (raw.type === "KEY") {
    return { type: "KEY", key: raw.value };
  }
  return {
    type: "ACCOUNT",
    email: raw.value,
    password: raw.password ?? "",
    profile: raw.profileName ?? null,
    pin: raw.pinCode ?? null,
  };
}

// ─── Item+delivery flattener ──────────────────────────────────────────────────
// BE nests deliveries inside items. We flatten them to a top-level array so
// existing UI components (DeliveryCredentialsCard, etc.) don't need to change.

function flattenItemDeliveries(rawItems: RawOrderDetailItem[]): DeliveryItem[] {
  const deliveries: DeliveryItem[] = [];
  for (const item of rawItems) {
    for (const d of item.deliveries) {
      deliveries.push({
        id: d.deliveryId,
        orderItemId: item.orderItemId,
        variantId: item.variantId,
        variantName: item.variantName,
        productName: item.productName,
        deliveredAt: d.deliveredAt,
        warrantyStatus: item.warrantyStatus,
        credential: normalizeOrderCredential(d.credential),
      });
    }
  }
  return deliveries;
}

function normalizeOrder(raw: RawOrder): Order {
  return {
    orderCode: raw.orderCode,
    status: raw.status,
    totalAmount: raw.totalAmount,
    email: raw.email,
    phone: raw.phone,
    createdAt: raw.createdAt,
    items: raw.items.map(normalizeOrderItem),
  };
}

function normalizeOrderDetail(raw: RawOrderDetail): OrderDetail {
  const items: OrderItem[] = raw.items.map((item) => ({
    variantId: item.variantId,
    variantName: item.variantName,
    productName: item.productName,
    quantity: item.quantity,
    price: item.price,
    subtotal: item.subtotal ?? item.price * item.quantity,
  }));

  return {
    orderCode: raw.orderCode,
    status: raw.status,
    totalAmount: raw.totalAmount,
    email: raw.email,
    phone: raw.phone,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt ?? raw.createdAt,
    paidAt: raw.paidAt ?? null,
    expiredAt: raw.expiredAt ?? null,
    items,
    deliveries: flattenItemDeliveries(raw.items),
    pendingStockCount: raw.pendingStockCount ?? 0,
  };
}

function normalizeOrderListItem(raw: import("@/schemas/order.schema").RawOrderListItem): OrderListItem {
  return {
    id: raw.id,
    orderCode: raw.orderCode,
    email: raw.email,
    phone: raw.phone,
    totalAmount: raw.totalAmount,
    status: raw.status,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function normalizeAdminOrderListItem(
  raw: import("@/schemas/order.schema").RawAdminOrderListItem,
): AdminOrderListItem {
  return {
    id: raw.id,
    orderCode: raw.orderCode,
    email: raw.email,
    phone: raw.phone,
    totalAmount: raw.totalAmount,
    status: raw.status,
    itemCount: raw.itemCount,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function normalizeInventoryAllocation(raw: RawInventoryAllocation): InventoryAllocation {
  return {
    variantId: raw.variantId,
    variantName: raw.variantName,
    requested: raw.requested,
    allocated: raw.allocated,
    pending: raw.pending,
    failed: raw.failed,
  };
}

function normalizeAuditLog(raw: RawAuditLog): AuditLog {
  return {
    id: raw.id ?? 0,
    action: raw.action,
    performedBy: raw.performedBy,
    performedAt: raw.performedAt,
    details: raw.details ?? null,
  };
}

function normalizeAdminOrderDetail(raw: RawAdminOrderDetail): AdminOrderDetail {
  return {
    ...normalizeOrderDetail(raw),
    customerId: raw.customerId ?? null,
    inventoryAllocations: (raw.inventoryAllocations ?? []).map(normalizeInventoryAllocation),
    auditLogs: (raw.auditLogs ?? []).map(normalizeAuditLog),
  };
}

function normalizeLookupOrderItem(raw: RawLookupOrderItem): LookupOrderItem {
  return {
    productName: raw.product_name,
    variantName: raw.variant_name,
    quantity: raw.quantity,
    unitPrice: raw.unit_price,
  };
}

function normalizeLookupDelivery(raw: RawLookupDelivery): LookupDelivery {
  return {
    productName: raw.product_name,
    credentials: raw.credentials,
  };
}

function normalizeLookupOrder(raw: RawLookupOrder): LookupOrderResult {
  return {
    id: raw.id,
    orderCode: raw.order_code,
    status: raw.status,
    email: raw.email,
    phone: raw.phone,
    totalAmount: raw.total_amount,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    paidAt: raw.paid_at ?? null,
    expiredAt: raw.expired_at ?? null,
    items: raw.items.map(normalizeLookupOrderItem),
    deliveries: raw.deliveries.map(normalizeLookupDelivery),
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const OrderService = {
  // ── User: create & lookup ─────────────────────────────────────────────────

  /**
   * Creates an order from the caller's current cart.
   * Sends `Idempotency-Key` header for deduplication on retries/double-clicks.
   */
  async createOrder(payload: CreateOrderPayload, idempotencyKey?: string): Promise<Order> {
    const body: Record<string, unknown> = {
      email: payload.email,
      phone: payload.phone,
    };
    if (payload.discountCode) body.discountCode = payload.discountCode;

    const headers: Record<string, string> = { ...sessionHeader() };
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

    const res = await apiClient.post<ApiResponse<unknown>>("/api/v1/orders", body, { headers });
const raw = parseApiResponse(RawOrderSchema, res.data.data, "createOrder");
    return normalizeOrder(raw);
  },

  /** Guest order lookup by code + email (no JWT required). */
  async lookupOrder(payload: LookupOrderPayload, signal?: AbortSignal): Promise<LookupOrderResult> {
    const res = await apiClient.post<ApiResponse<unknown>>("/api/v1/orders/lookup", payload, { signal });
    const raw = parseApiResponse(RawLookupOrderSchema, res.data.data, "lookupOrder");
    return normalizeLookupOrder(raw);
  },

  // ── User: order list + detail (JWT required) ──────────────────────────────

  /**
   * Paginated list of the authenticated user's orders.
   * Backend filters by JWT → no userId param needed.
   *
   * Proposed endpoint: GET /api/v1/orders
   */
  async getUserOrders(
    params: UserOrderListParams = {},
    signal?: AbortSignal,
  ): Promise<PaginatedData<OrderListItem>> {
    const { page = 0, size = 10, status, keyword, sort = "newest" } = params;
    const res = await apiClient.get<ApiResponse<unknown>>("/api/v1/orders", {
      params: {
        page,
        size,
        ...(status && { status }),
        ...(keyword && { keyword }),
        sort,
      },
      signal,
    });
    const rawPage = parseApiResponse(PaginatedEnvelopeSchema, res.data.data, "getUserOrders");
    const items: OrderListItem[] = [];
    for (const rawItem of rawPage.items) {
      const valid = validateSafe(RawOrderListItemSchema, rawItem, "userOrderListItem");
      if (valid !== null) items.push(normalizeOrderListItem(valid));
    }
    return { items, page_info: rawPage.page_info };
  },

  /**
   * Full order detail with delivery credentials for the authenticated user.
   *
   * Proposed endpoint: GET /api/v1/orders/{id}
   */
  async getUserOrderDetail(id: number, signal?: AbortSignal): Promise<OrderDetail> {
    const res = await apiClient.get<ApiResponse<unknown>>(`/api/v1/orders/${id}`, { signal });
    const raw = parseApiResponse(RawOrderDetailSchema, res.data.data, "getUserOrderDetail");
    return normalizeOrderDetail(raw);
  },

  // ── Admin: orders list + detail ───────────────────────────────────────────

  /**
   * Paginated list of ALL orders for the admin dashboard.
   *
   * Endpoint: GET /api/v1/admin/orders
   */
  async getAdminOrders(
    params: AdminOrderListParams = {},
    signal?: AbortSignal,
  ): Promise<PaginatedData<AdminOrderListItem>> {
    const { page = 0, size = 20, status, keyword, from, to, sort } = params;
    const res = await apiClient.get<ApiResponse<unknown>>("/api/v1/admin/orders", {
      params: {
        page,
        size,
        ...(status && { status }),
        ...(keyword && { keyword }),
        ...(from && { from }),
        ...(to && { to }),
        ...(sort && { sort }),
      },
      signal,
    });
    const rawPage = parseApiResponse(PaginatedEnvelopeSchema, res.data.data, "getAdminOrders");
    const items: AdminOrderListItem[] = [];
    for (const rawItem of rawPage.items) {
      const valid = validateSafe(RawAdminOrderListItemSchema, rawItem, "adminOrderListItem");
      if (valid !== null) items.push(normalizeAdminOrderListItem(valid));
    }
    return { items, page_info: rawPage.page_info };
  },

  /**
   * Full order detail for admin, includes inventory allocations + audit logs.
   *
   * Proposed endpoint: GET /api/v1/admin/orders/{id}
   */
  async getAdminOrderDetail(id: number, signal?: AbortSignal): Promise<AdminOrderDetail> {
    const res = await apiClient.get<ApiResponse<unknown>>(`/api/v1/admin/orders/${id}`, { signal });
    const raw = parseApiResponse(RawAdminOrderDetailSchema, res.data.data, "getAdminOrderDetail");
    return normalizeAdminOrderDetail(raw);
  },

  // ── Admin: manual actions ─────────────────────────────────────────────────

  /**
   * Proposed endpoint: POST /api/v1/admin/orders/{id}/mark-paid
   */
  async adminMarkAsPaid(id: number): Promise<void> {
    await apiClient.post(`/api/v1/admin/orders/${id}/mark-paid`);
  },

  /**
   * Proposed endpoint: POST /api/v1/admin/orders/{id}/retry-allocation
   */
  async adminRetryAllocation(id: number): Promise<void> {
    await apiClient.post(`/api/v1/admin/orders/${id}/retry-allocation`);
  },

  /**
   * Proposed endpoint: POST /api/v1/admin/orders/{id}/cancel
   */
  async adminCancelOrder(id: number, reason?: string): Promise<void> {
    await apiClient.post(`/api/v1/admin/orders/${id}/cancel`, { reason: reason ?? null });
  },

  /**
   * Resend a specific delivery item to the customer's email.
   * Proposed endpoint: POST /api/v1/admin/deliveries/{deliveryId}/resend
   */
  async adminResendDelivery(deliveryId: number): Promise<void> {
    await apiClient.post(`/api/v1/admin/deliveries/${deliveryId}/resend`);
  },
};
