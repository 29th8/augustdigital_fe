import { z } from "zod";
import apiClient from "./apiClient";
import { parseApiResponse } from "@/lib/parseApiResponse";
import { validateSafe } from "@/lib/validateSafe";
import { CategorySchema } from "@/schemas/category.schema";
import type { ApiResponse } from "@/types/api";
import type { Category } from "@/types/category";

export const CategoryService = {
  async getCategories(): Promise<Category[]> {
    const res = await apiClient.get<ApiResponse<unknown>>("/api/v1/categories");

    // Hard-validate that the response is an array.
    const rawList = parseApiResponse(z.array(z.unknown()), res.data.data, "getCategories");

    // Soft-validate each category — malformed entries are warned and filtered.
    return rawList
      .map((raw) => validateSafe(CategorySchema, raw, "category"))
      .filter((item): item is Category => item !== null);
  },

  async createCategory(name: string): Promise<Category> {
    const res = await apiClient.post<ApiResponse<unknown>>("/api/v1/admin/categories", { name });
    return parseApiResponse(CategorySchema, res.data.data, "createCategory");
  },

  async updateCategory(id: number, name: string): Promise<Category> {
    const res = await apiClient.put<ApiResponse<unknown>>(`/api/v1/admin/categories/${id}`, { name });
    return parseApiResponse(CategorySchema, res.data.data, "updateCategory");
  },

  async deleteCategory(id: number): Promise<void> {
    await apiClient.delete(`/api/v1/admin/categories/${id}`);
  },
};
