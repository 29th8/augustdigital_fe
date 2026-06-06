import { z } from "zod";
import apiClient from "./apiClient";
import { parseApiResponse } from "@/lib/parseApiResponse";
import { VariantStockStatsSchema, FileImportResultSchema } from "@/schemas/inventory.schema";
import type { ApiResponse } from "@/types/api";
import type {
  VariantStockStats,
  ImportInventoryPayload,
  FileImportResult,
  ImportInventoryResult,
  ImportProfilesPayload,
  InventoryItemDetail,
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
  async importKeys(payload: ImportInventoryPayload): Promise<ImportInventoryResult> {
    const res = await apiClient.post<ApiResponse<unknown>>("/api/v1/admin/inventory", {
      variantId: payload.variantId,
      type: payload.type,
      keys: payload.keys,
    });
    const schema = z.object({
      inventoryItemIds: z.array(z.number()).default([]),
      imported: z.number().default(0),
    });
    return parseApiResponse(schema, res.data.data, "importKeys");
  },

  /**
   * POST /api/v1/admin/inventory/profiles
   * Adds profiles (slots) to an existing ACCOUNT inventory item.
   */
  async importProfiles(payload: ImportProfilesPayload): Promise<void> {
    await apiClient.post("/api/v1/admin/inventory/profiles", payload);
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
   * GET /api/v1/admin/inventory/{variantId}/items
   * Lists all inventory items for a variant with profile stats.
   */
  async listItems(variantId: number): Promise<InventoryItemDetail[]> {
    const profileSchema = z.preprocess(
      (raw) => {
        if (typeof raw !== "object" || raw === null) return raw;
        const o = raw as Record<string, unknown>;
        return {
          id:            o.id,
          profileName:   o.profileName   ?? o.profile_name   ?? "",
          pinCode:       o.pinCode       ?? o.pin_code       ?? null,
          maxSlots:      o.maxSlots      ?? o.max_slots      ?? 1,
          assignedSlots: o.assignedSlots ?? o.assigned_slots ?? 0,
          status:        o.status        ?? "AVAILABLE",
        };
      },
      z.object({
        id:            z.number(),
        profileName:   z.string(),
        pinCode:       z.string().nullable(),
        maxSlots:      z.number().default(1),
        assignedSlots: z.number().default(0),
        status:        z.enum(["AVAILABLE", "ASSIGNED", "IN_USE"]),
      }),
    );
    const itemSchema = z.preprocess(
      (raw) => {
        if (typeof raw !== "object" || raw === null) return raw;
        const o = raw as Record<string, unknown>;
        return {
          id:           o.id,
          type:         o.type,
          value:        o.value,
          status:       o.status,
          profileCount: o.profileCount ?? o.profile_count ?? 0,
          usedSlots:    o.usedSlots    ?? o.used_slots    ?? 0,
          profiles:     o.profiles     ?? [],
        };
      },
      z.object({
        id:           z.number(),
        type:         z.enum(["KEY", "ACCOUNT"]),
        value:        z.string().nullable(),
        status:       z.enum(["AVAILABLE", "IN_USE", "SOLD", "REVOKED"]),
        profileCount: z.number().default(0),
        usedSlots:    z.number().default(0),
        profiles:     z.array(profileSchema).default([]),
      }),
    );
    const schema = z.array(itemSchema);
    const res = await apiClient.get<ApiResponse<unknown>>(
      `/api/v1/admin/inventory/${variantId}/items`,
    );
    if (res.data.code !== 200) {
      throw new Error(res.data.message ?? "Không thể tải danh sách hàng");
    }
    return parseApiResponse(schema, res.data.data, "listItems") as InventoryItemDetail[];
  },

  /**
   * POST /api/v1/admin/inventory/re-encrypt
   * Migrates plaintext inventory values to encrypted format.
   * Idempotent — safe to run multiple times.
   */
  async reEncrypt(): Promise<{ items_fixed: number; items_skipped: number; pins_fixed: number; pins_skipped: number; total_items: number; total_pins: number }> {
    const schema = z.object({
      items_fixed:   z.number(),
      items_skipped: z.number(),
      pins_fixed:    z.number(),
      pins_skipped:  z.number(),
      total_items:   z.number(),
      total_pins:    z.number(),
    });
    const res = await apiClient.post<ApiResponse<unknown>>("/api/v1/admin/inventory/re-encrypt");
    return parseApiResponse(schema, res.data.data, "reEncrypt");
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
