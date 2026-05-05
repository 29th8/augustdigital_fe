import apiClient from "./apiClient";
import { parseApiResponse } from "@/lib/parseApiResponse";
import { validateSafe } from "@/lib/validateSafe";
import { sessionHeader } from "@/lib/sessionId";
import {
  RawOrderSchema,
  RawOrderListItemSchema,
  type RawOrder,
  type RawOrderItem,
} from "@/schemas/order.schema";
import { PaginatedEnvelopeSchema } from "@/schemas/pagination.schema";
import type { ApiResponse, PaginatedData } from "@/types/api";
import type {
  Order,
  OrderItem,
  OrderListItem,
  CreateOrderPayload,
  LookupOrderPayload,
} from "@/types/order";

// ─── Normalizers ──────────────────────────────────────────────────────────────

function normalizeOrderItem(raw: RawOrderItem): OrderItem {
  return {
    variantId: raw.variant_id,
    variantName: raw.variant_name,
    productName: raw.product_name,
    quantity: raw.quantity,
    price: raw.price,
    subtotal: raw.subtotal,
  };
}

function normalizeOrder(raw: RawOrder): Order {
  return {
    orderCode: raw.order_code,
    status: raw.status,
    totalAmount: raw.total_amount,
    email: raw.email,
    phone: raw.phone,
    createdAt: raw.created_at,
    items: raw.items.map(normalizeOrderItem),
  };
}

function normalizeOrderListItem(raw: import("@/schemas/order.schema").RawOrderListItem): OrderListItem {
  return {
    id: raw.id,
    orderCode: raw.order_code,
    email: raw.email,
    phone: raw.phone,
    totalAmount: raw.total_amount,
    status: raw.status,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const OrderService = {
  /**
   * Creates an order from the caller's current cart.
   *
   * @param payload - email, phone, optional discount code
   * @param idempotencyKey - stable UUID generated per checkout session.
   *   Sent as `Idempotency-Key` header so the backend can detect and deduplicate
   *   re-submitted requests (e.g. from a double-click or retry after timeout).
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

  async lookupOrder(payload: LookupOrderPayload): Promise<Order> {
    const res = await apiClient.post<ApiResponse<unknown>>("/api/v1/orders/lookup", payload);
    const raw = parseApiResponse(RawOrderSchema, res.data.data, "lookupOrder");
    return normalizeOrder(raw);
  },

  async getAdminOrders(params: {
    page?: number;
    size?: number;
    status?: string;
    from?: string;
    to?: string;
  } = {}): Promise<PaginatedData<OrderListItem>> {
    const res = await apiClient.get<ApiResponse<unknown>>("/api/v1/admin/orders", { params });
    const rawPage = parseApiResponse(PaginatedEnvelopeSchema, res.data.data, "getAdminOrders");
    const items: OrderListItem[] = [];
    for (const rawItem of rawPage.items) {
      const valid = validateSafe(RawOrderListItemSchema, rawItem, "orderListItem");
      if (valid !== null) items.push(normalizeOrderListItem(valid));
    }
    return { items, page_info: rawPage.page_info };
  },
};
