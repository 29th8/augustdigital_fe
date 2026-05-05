import { z } from "zod";

const safeNum = z.coerce.number().default(0);

export const RawVariantProfitSchema = z.object({
  variant_id: z.number(),
  variant_name: z.string(),
  revenue: safeNum,
  cost: safeNum,
  gross_profit: safeNum,
  items_sold: safeNum,
});

export const RawProfitResponseSchema = z.object({
  total_revenue: safeNum,
  total_cost: safeNum,
  gross_profit: safeNum,
  gross_margin_percent: safeNum,
  orders_count: safeNum,
  items_sold: safeNum,
  by_variant: z.array(RawVariantProfitSchema).default([]),
});

export const RawTopVariantSchema = z.object({
  variant_id: z.number(),
  variant_name: z.string(),
  items_sold: safeNum,
  revenue: safeNum,
});

export const RawSummaryResponseSchema = z.object({
  revenue_today: safeNum,
  revenue_week: safeNum,
  revenue_month: safeNum,
  total_orders: safeNum,
  top_variants: z.array(RawTopVariantSchema).default([]),
});

export type RawProfitResponse = z.infer<typeof RawProfitResponseSchema>;
export type RawSummaryResponse = z.infer<typeof RawSummaryResponseSchema>;
