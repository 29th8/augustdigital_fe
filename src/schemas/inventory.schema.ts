import { z } from "zod";

export const VariantStockStatsSchema = z.object({
  variantId: z.number(),
  variantName: z.string(),
  available: z.number(),
  sold: z.number(),
  total: z.number(),
});

// File import returns { imported, skipped, total_rows } (snake_case from backend)
export const FileImportResultSchema = z.object({
  imported: z.number(),
  skipped: z.number(),
  total_rows: z.number(),
});

export type RawVariantStockStats = z.infer<typeof VariantStockStatsSchema>;
export type RawFileImportResult = z.infer<typeof FileImportResultSchema>;
