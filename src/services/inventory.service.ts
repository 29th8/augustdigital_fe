import { z } from "zod";
import apiClient from "./apiClient";
import { parseApiResponse } from "@/lib/parseApiResponse";
import { VariantStockStatsSchema, FileImportResultSchema } from "@/schemas/inventory.schema";
import type { ApiResponse } from "@/types/api";
import type {
  VariantStockStats,
  ImportInventoryPayload,
  FileImportResult,
} from "@/types/inventory";

export const InventoryService = {
  /**
   * GET /api/v1/admin/inventory/{variantId}
   * Returns live stock counts: available, sold, total.
   */
  async getStockStats(variantId: number): Promise<VariantStockStats> {
    const res = await apiClient.get<ApiResponse<unknown>>(
      `/api/v1/admin/inventory/${variantId}`,
    );
    return parseApiResponse(VariantStockStatsSchema, res.data.data, "getStockStats");
  },

  /**
   * POST /api/v1/admin/inventory
   * Bulk-imports keys/credentials as JSON.
   * Returns the success message string from the backend.
   */
  async importKeys(payload: ImportInventoryPayload): Promise<string> {
    const res = await apiClient.post<ApiResponse<unknown>>("/api/v1/admin/inventory", {
      variantId: payload.variantId,
      type: payload.type,
      keys: payload.keys,
    });
    return parseApiResponse(z.string(), res.data.data, "importKeys");
  },

  /**
   * POST /api/v1/admin/inventory/import
   * File-based bulk import (CSV / XLSX / XLS).
   * Uses multipart/form-data — axios sets the boundary automatically.
   */
  async importFile(
    variantId: number,
    type: string,
    file: File,
  ): Promise<FileImportResult> {
    const form = new FormData();
    form.append("file", file);
    form.append("variantId", variantId.toString());
    form.append("type", type);

    const res = await apiClient.post<ApiResponse<unknown>>(
      "/api/v1/admin/inventory/import",
      form,
    );
    const raw = parseApiResponse(FileImportResultSchema, res.data.data, "importFile");
    return { imported: raw.imported, skipped: raw.skipped, totalRows: raw.total_rows };
  },

  /**
   * POST /api/v1/admin/orders/recover-stuck
   * Triggers manual stuck-order recovery.
   * Note: This is synchronous on the backend and may be slow under load.
   */
  async recoverStuckOrders(): Promise<void> {
    await apiClient.post("/api/v1/admin/orders/recover-stuck");
  },
};
