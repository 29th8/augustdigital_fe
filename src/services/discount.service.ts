import { z } from "zod";
import apiClient from "./apiClient";
import { parseApiResponse } from "@/lib/parseApiResponse";
import { validateSafe } from "@/lib/validateSafe";
import { RawDiscountCodeSchema } from "@/schemas/discount.schema";
import { normalizeDiscountCode, normalizePaginatedDiscountCodes } from "@/types/discount";
import type { ApiResponse } from "@/types/api";
import type {
  DiscountCode,
  PaginatedDiscountCodes,
  DiscountListParams,
  DiscountCodeCreateRequestApi,
  DiscountCodeUpdateRequestApi,
} from "@/types/discount";

// ─── Discount preview ─────────────────────────────────────────────────────────

const DiscountPreviewSchema = z.object({
  code: z.string(),
  discountType: z.string().nullable(),
  discountValue: z.number().nullable(),
  discountAmount: z.number(),
  finalAmount: z.number(),
  isValid: z.boolean(),
  message: z.string().nullable(),
});

export type DiscountPreview = z.infer<typeof DiscountPreviewSchema>;

// ─── Spring Page schema ───────────────────────────────────────────────────────
// Spring Boot with default Jackson config returns camelCase pagination metadata.

const SpringPageSchema = z.object({
  content: z.array(z.unknown()),
  totalElements: z.number(),
  totalPages: z.number(),
  number: z.number(), // 0-based current page
  size: z.number(),
  first: z.boolean().optional(),
  last: z.boolean().optional(),
  numberOfElements: z.number().optional(),
  empty: z.boolean().optional(),
});

// ─── Service ──────────────────────────────────────────────────────────────────

export const DiscountService = {
  /**
   * GET /api/v1/admin/discounts
   * Query params: keyword, isActive, type, page (0-based), size, sort.
   */
  async fetchDiscounts(params: DiscountListParams = {}): Promise<PaginatedDiscountCodes> {
    const { page = 0, size = 10, isActive, type, sort = "createdAt,desc", keyword } = params;

    const query: Record<string, string | number | boolean> = { page, size, sort };
    if (isActive !== undefined) query.isActive = isActive;
    if (type) query.type = type;
    if (keyword?.trim()) query.keyword = keyword.trim();

    const res = await apiClient.get<ApiResponse<unknown>>("/api/v1/admin/discounts", {
      params: query,
    });

const rawPage = parseApiResponse(SpringPageSchema, res.data.data, "discountList");

    const validItems = rawPage.content
      .map((item) => validateSafe(RawDiscountCodeSchema, item, "discountCode"))
      .filter((item): item is NonNullable<typeof item> => item !== null);

    console.log(
      `[DiscountService] parsed ${validItems.length}/${rawPage.content.length} items, totalElements=${rawPage.totalElements}`,
    );

    return normalizePaginatedDiscountCodes({
      content: validItems,
      totalElements: rawPage.totalElements,
      totalPages: rawPage.totalPages,
      number: rawPage.number,
      size: rawPage.size,
      first: rawPage.first,
      last: rawPage.last,
    });
  },

  /** GET /api/v1/admin/discounts/{id} */
  async fetchDiscountById(id: number): Promise<DiscountCode> {
    const res = await apiClient.get<ApiResponse<unknown>>(`/api/v1/admin/discounts/${id}`);
    const raw = parseApiResponse(RawDiscountCodeSchema, res.data.data, "discountGetById");
    return normalizeDiscountCode(raw);
  },

  /**
   * POST /api/v1/admin/discounts
   * Backend auto-uppercases `code`. `usedCount` must NOT be in payload.
   */
  async createDiscount(payload: DiscountCodeCreateRequestApi): Promise<DiscountCode> {
    const res = await apiClient.post<ApiResponse<unknown>>("/api/v1/admin/discounts", payload);
    const raw = parseApiResponse(RawDiscountCodeSchema, res.data.data, "discountCreate");
    return normalizeDiscountCode(raw);
  },

  /**
   * PUT /api/v1/admin/discounts/{id}
   * Partial update — only send fields that changed.
   * `usedCount` must NOT be included.
   *
   * GOTCHA: Use `{ isActive: false }` to deactivate instead of deleting
   * when usedCount > 0.
   */
  async updateDiscount(id: number, payload: DiscountCodeUpdateRequestApi): Promise<DiscountCode> {
    const res = await apiClient.put<ApiResponse<unknown>>(
      `/api/v1/admin/discounts/${id}`,
      payload,
    );
    const raw = parseApiResponse(RawDiscountCodeSchema, res.data.data, "discountUpdate");
    return normalizeDiscountCode(raw);
  },

  /** POST /api/v1/discounts/preview — no JWT required */
  async previewDiscount(code: string, totalAmount: number): Promise<DiscountPreview> {
    const res = await apiClient.post<ApiResponse<unknown>>("/api/v1/discounts/preview", {
      code,
      totalAmount,
    });
    return parseApiResponse(DiscountPreviewSchema, res.data.data, "previewDiscount");
  },

  /**
   * DELETE /api/v1/admin/discounts/{id}
   * Backend blocks this if usedCount > 0 with a 409.
   *
   * GOTCHA: The UI must disable Delete and offer Deactivate instead when
   * usedCount > 0 — deleting a used code breaks historical order integrity.
   */
  async deleteDiscount(id: number): Promise<void> {
    await apiClient.delete(`/api/v1/admin/discounts/${id}`);
  },
};
