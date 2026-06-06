import apiClient from "./apiClient";
import { parseApiResponse } from "@/lib/parseApiResponse";
import { validateSafe } from "@/lib/validateSafe";
import { RefundSchema, type RawRefund } from "@/schemas/refund.schema";
import { PaginatedEnvelopeSchema } from "@/schemas/pagination.schema";
import type { ApiResponse } from "@/types/api";
import type {
  Refund,
  PaginatedRefunds,
  CreateRefundPayload,
  ProcessRefundPayload,
  RefundListParams,
  UserCreateRefundPayload,
} from "@/types/refund";

// ─── Normalizer ───────────────────────────────────────────────────────────────

function normalizeRefund(raw: RawRefund): Refund {
  return {
    id: raw.id,
    orderId: raw.orderId,
    orderCode: raw.orderCode,
    amount: raw.amount,
    reason: raw.reason,
    status: raw.status,
    adminId: raw.adminId,
    notes: raw.notes,
    resolvedAt: raw.resolvedAt,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function parsePaginatedRefunds(rawPage: {
  items: unknown[];
  page_info: {
    current_page: number;
    total_pages: number;
    total_elements: number;
    page_size: number;
  };
}): PaginatedRefunds {
  const items = rawPage.items
    .map((item) => validateSafe(RefundSchema, item, "refund"))
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .map(normalizeRefund);
  return {
    items,
    currentPage: rawPage.page_info.current_page,
    totalPages: rawPage.page_info.total_pages,
    totalElements: rawPage.page_info.total_elements,
    pageSize: rawPage.page_info.page_size,
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const RefundService = {
  /** GET /api/v1/admin/refunds */
  async getAdminRefunds(params: RefundListParams = {}): Promise<PaginatedRefunds> {
    const { page = 0, size = 20, status } = params;
    const query: Record<string, unknown> = { page, size };
    if (status && status !== "all") query.status = status;
    const res = await apiClient.get<ApiResponse<unknown>>("/api/v1/admin/refunds", {
      params: query,
    });
const rawPage = parseApiResponse(PaginatedEnvelopeSchema, res.data.data, "getAdminRefunds");
    return parsePaginatedRefunds(rawPage);
  },

  /** GET /api/v1/admin/refunds/{id} */
  async getAdminRefundById(id: number): Promise<Refund> {
    const res = await apiClient.get<ApiResponse<unknown>>(`/api/v1/admin/refunds/${id}`);
    const raw = parseApiResponse(RefundSchema, res.data.data, "getAdminRefundById");
    return normalizeRefund(raw);
  },

  /** POST /api/v1/admin/refunds */
  async createRefund(payload: CreateRefundPayload): Promise<Refund> {
    const res = await apiClient.post<ApiResponse<unknown>>("/api/v1/admin/refunds", payload);
    const raw = parseApiResponse(RefundSchema, res.data.data, "createRefund");
    return normalizeRefund(raw);
  },

  /** PUT /api/v1/admin/refunds/{id}/process */
  async processRefund(id: number, payload: ProcessRefundPayload): Promise<Refund> {
    const res = await apiClient.put<ApiResponse<unknown>>(
      `/api/v1/admin/refunds/${id}/process`,
      payload,
    );
    const raw = parseApiResponse(RefundSchema, res.data.data, "processRefund");
    return normalizeRefund(raw);
  },

  /** POST /api/v1/refunds — user tự tạo yêu cầu hoàn tiền */
  async createUserRefund(payload: UserCreateRefundPayload): Promise<Refund> {
    const res = await apiClient.post<ApiResponse<unknown>>("/api/v1/refunds", payload);
    const raw = parseApiResponse(RefundSchema, res.data.data, "createUserRefund");
    return normalizeRefund(raw);
  },

  /** GET /api/v1/refunds/my-refunds */
  async getMyRefunds(params: RefundListParams = {}): Promise<PaginatedRefunds> {
    const { page = 0, size = 20 } = params;
    const res = await apiClient.get<ApiResponse<unknown>>("/api/v1/refunds/my-refunds", {
      params: { page, size },
    });
    const rawPage = parseApiResponse(PaginatedEnvelopeSchema, res.data.data, "getMyRefunds");
    return parsePaginatedRefunds(rawPage);
  },
};
