import apiClient from "./apiClient";
import { parseApiResponse } from "@/lib/parseApiResponse";
import { validateSafe } from "@/lib/validateSafe";
import { WarrantyClaimSchema, type RawWarrantyClaim } from "@/schemas/warranty.schema";
import { PaginatedEnvelopeSchema } from "@/schemas/pagination.schema";
import type { ApiResponse } from "@/types/api";
import type {
  WarrantyClaim,
  PaginatedWarrantyClaims,
  SubmitWarrantyPayload,
  ResolveWarrantyPayload,
  WarrantyListParams,
} from "@/types/warranty";

// ─── Normalizer ───────────────────────────────────────────────────────────────

function normalizeWarrantyClaim(raw: RawWarrantyClaim): WarrantyClaim {
  return {
    id: raw.id,
    orderItemId: raw.order_item_id,
    productName: raw.product_name ?? null,
    variantName: raw.variant_name ?? null,
    orderCode: raw.order_code ?? null,
    userId: raw.user_id ?? null,
    userEmail: raw.user_email,
    description: raw.description,
    status: raw.status,
    logs: raw.logs.map((l) => ({
      id: l.id,
      adminId: l.admin_id,
      action: l.action,
      createdAt: l.created_at,
    })),
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const WarrantyService = {
  /** POST /api/v1/warranty — submit a claim (auth or guest) */
  async submitClaim(payload: SubmitWarrantyPayload): Promise<WarrantyClaim> {
    const res = await apiClient.post<ApiResponse<unknown>>("/api/v1/warranty", payload);
    const raw = parseApiResponse(WarrantyClaimSchema, res.data.data, "submitWarranty");
    return normalizeWarrantyClaim(raw);
  },

  /** GET /api/v1/warranty — customer's own claims */
  async getMyWarranties(params: WarrantyListParams = {}): Promise<PaginatedWarrantyClaims> {
    const { page = 0, size = 20 } = params;
    const res = await apiClient.get<ApiResponse<unknown>>("/api/v1/warranty", {
      params: { page, size },
    });
    const rawPage = parseApiResponse(PaginatedEnvelopeSchema, res.data.data, "getMyWarranties");
    const items = rawPage.items
      .map((item) => validateSafe(WarrantyClaimSchema, item, "warrantyClaim"))
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .map(normalizeWarrantyClaim);
    return {
      items,
      currentPage: rawPage.page_info.current_page,
      totalPages: rawPage.page_info.total_pages,
      totalElements: rawPage.page_info.total_elements,
      pageSize: rawPage.page_info.page_size,
    };
  },

  /** GET /api/v1/admin/warranty — all claims (admin) */
  async getAdminWarranties(params: WarrantyListParams = {}): Promise<PaginatedWarrantyClaims> {
    const { page = 0, size = 20, status } = params;
    const query: Record<string, unknown> = { page, size };
    if (status && status !== "all") query.status = status;
    const res = await apiClient.get<ApiResponse<unknown>>("/api/v1/admin/warranty", {
      params: query,
    });
    const rawPage = parseApiResponse(PaginatedEnvelopeSchema, res.data.data, "getAdminWarranties");
    const items = rawPage.items
      .map((item) => validateSafe(WarrantyClaimSchema, item, "warrantyClaimAdmin"))
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .map(normalizeWarrantyClaim);
    return {
      items,
      currentPage: rawPage.page_info.current_page,
      totalPages: rawPage.page_info.total_pages,
      totalElements: rawPage.page_info.total_elements,
      pageSize: rawPage.page_info.page_size,
    };
  },

  /** GET /api/v1/admin/warranty/{id} — single claim detail (admin) */
  async getAdminWarrantyById(id: number): Promise<WarrantyClaim> {
    const res = await apiClient.get<ApiResponse<unknown>>(`/api/v1/admin/warranty/${id}`);
    const raw = parseApiResponse(WarrantyClaimSchema, res.data.data, "getAdminWarrantyById");
    return normalizeWarrantyClaim(raw);
  },

  /** PUT /api/v1/admin/warranty/{id}/resolve — resolve claim (admin) */
  async resolveWarranty(id: number, payload: ResolveWarrantyPayload = {}): Promise<void> {
    await apiClient.put(`/api/v1/admin/warranty/${id}/resolve`, payload);
  },
};
