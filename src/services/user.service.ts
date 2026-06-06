import { z } from "zod";
import apiClient from "./apiClient";
import { parseApiResponse } from "@/lib/parseApiResponse";
import { validateSafe } from "@/lib/validateSafe";
import { UserApiSchema, PaginatedUserResponseApiSchema } from "@/schemas/user.schema";
import { normalizeUser, normalizePaginatedUsers } from "@/types/user";
import type { ApiResponse } from "@/types/api";
import type { User, PaginatedUsers, UserListParams, UserRole } from "@/types/user";

// ─── Internal Spring Page schema ──────────────────────────────────────────────
// Mirrors the pattern used by DiscountService / SpringPageSchema.

const SpringUserPageSchema = z.object({
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

export const UserService = {
  /**
   * GET /api/v1/admin/users
   * Query params: keyword, active, page (0-based), size.
   */
  async fetchUsers(params: UserListParams = {}): Promise<PaginatedUsers> {
    const { page = 0, size = 20, keyword, active } = params;

    const query: Record<string, string | number | boolean> = { page, size };
    if (keyword?.trim()) query.keyword = keyword.trim();
    if (active !== undefined) query.active = active;

    const res = await apiClient.get<ApiResponse<unknown>>("/api/v1/admin/users", {
      params: query,
    });

    const rawPage = parseApiResponse(SpringUserPageSchema, res.data.data, "fetchUsers");

    const validItems = rawPage.content
      .map((item) => validateSafe(UserApiSchema, item, "userItem"))
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return normalizePaginatedUsers({
      content: validItems,
      totalElements: rawPage.totalElements,
      totalPages: rawPage.totalPages,
      number: rawPage.number,
      size: rawPage.size,
      first: rawPage.first,
      last: rawPage.last,
    });
  },

  /** GET /api/v1/admin/users/{id} */
  async fetchUserById(id: number): Promise<User> {
    const res = await apiClient.get<ApiResponse<unknown>>(`/api/v1/admin/users/${id}`);
    const raw = parseApiResponse(UserApiSchema, res.data.data, "fetchUserById");
    return normalizeUser(raw);
  },

  /**
   * PATCH /api/v1/admin/users/{id}/lock
   * Locks a user account.
   */
  async lockUser(id: number): Promise<User> {
    const res = await apiClient.patch<ApiResponse<unknown>>(`/api/v1/admin/users/${id}/lock`);
    const raw = parseApiResponse(UserApiSchema, res.data.data, "lockUser");
    return normalizeUser(raw);
  },

  /**
   * PATCH /api/v1/admin/users/{id}/unlock
   * Unlocks a user account.
   */
  async unlockUser(id: number): Promise<User> {
    const res = await apiClient.patch<ApiResponse<unknown>>(`/api/v1/admin/users/${id}/unlock`);
    const raw = parseApiResponse(UserApiSchema, res.data.data, "unlockUser");
    return normalizeUser(raw);
  },

  /**
   * PATCH /api/v1/admin/users/{id}/role
   * Body: { "role": "ADMIN" | "CUSTOMER" }
   */
  async changeUserRole(id: number, role: UserRole): Promise<User> {
    const res = await apiClient.patch<ApiResponse<unknown>>(
      `/api/v1/admin/users/${id}/role`,
      { role },
    );
    const raw = parseApiResponse(UserApiSchema, res.data.data, "changeUserRole");
    return normalizeUser(raw);
  },

  /**
   * DELETE /api/v1/admin/users/{id}
   * Backend returns 400 if user has ADMIN role.
   */
  async deleteUser(id: number): Promise<void> {
    await apiClient.delete(`/api/v1/admin/users/${id}`);
  },
};
