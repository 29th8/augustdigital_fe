import apiClient from "./apiClient";
import { parseApiResponse } from "@/lib/parseApiResponse";
import {
  RawProfitResponseSchema,
  RawSummaryResponseSchema,
  RawVariantOrderLinesSchema,
} from "@/schemas/analytics.schema";
import type { ApiResponse } from "@/types/api";
import type { ProfitResponse, SummaryResponse, ProfitParams, VariantOrderLine, VariantOrderLinesParams } from "@/types/analytics";

// ─── Normalizers (snake_case → camelCase) ─────────────────────────────────────

function normalizeProfitResponse(raw: ReturnType<typeof RawProfitResponseSchema.parse>): ProfitResponse {
  return {
    totalRevenue: raw.total_revenue,
    totalCost: raw.total_cost,
    grossProfit: raw.gross_profit,
    grossMarginPercent: raw.gross_margin_percent,
    ordersCount: raw.orders_count,
    itemsSold: raw.items_sold,
    byVariant: raw.by_variant.map((v) => ({
      variantId: v.variant_id,
      variantName: v.variant_name,
      revenue: v.revenue,
      cost: v.cost,
      grossProfit: v.gross_profit,
      itemsSold: v.items_sold,
    })),
  };
}

function normalizeSummary(raw: ReturnType<typeof RawSummaryResponseSchema.parse>): SummaryResponse {
  return {
    revenueToday: raw.revenue_today,
    revenueWeek: raw.revenue_week,
    revenueMonth: raw.revenue_month,
    totalOrders: raw.total_orders,
    topVariants: raw.top_variants.map((v) => ({
      variantId: v.variant_id,
      variantName: v.variant_name,
      itemsSold: v.items_sold,
      revenue: v.revenue,
    })),
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const AnalyticsService = {
  /**
   * GET /api/v1/admin/analytics/profit
   * Profit report for a date range, optionally filtered to a single variant.
   */
  async getProfit(params: ProfitParams): Promise<ProfitResponse> {
    const res = await apiClient.get<ApiResponse<unknown>>(
      "/api/v1/admin/analytics/profit",
      {
        params: {
          from: params.from,
          to: params.to,
          ...(params.variantId !== undefined && { variant_id: params.variantId }),
        },
      },
    );
    const raw = parseApiResponse(RawProfitResponseSchema, res.data.data, "getProfit");
    return normalizeProfitResponse(raw);
  },

  /**
   * GET /api/v1/admin/analytics/profit/variants/{variantId}/orders
   * Per-order profit breakdown for a specific variant.
   */
  async getVariantOrderLines(params: VariantOrderLinesParams): Promise<VariantOrderLine[]> {
    const res = await apiClient.get<ApiResponse<unknown>>(
      `/api/v1/admin/analytics/profit/variants/${params.variantId}/orders`,
      { params: { from: params.from, to: params.to } },
    );
    const raw = parseApiResponse(RawVariantOrderLinesSchema, res.data.data, "getVariantOrderLines");
    return raw.map((r) => ({
      orderCode: r.order_code,
      orderedAt: r.ordered_at,
      quantity: r.quantity,
      unitPrice: r.unit_price,
      unitCost: r.unit_cost,
      effectivePrice: r.effective_price,
      revenue: r.revenue,
      cost: r.cost,
      grossProfit: r.gross_profit,
    }));
  },

  /**
   * GET /api/v1/admin/analytics/summary
   * Dashboard snapshot: today / week / month revenue + top variants.
   */
  async getSummary(): Promise<SummaryResponse> {
    const res = await apiClient.get<ApiResponse<unknown>>(
      "/api/v1/admin/analytics/summary",
    );
    const raw = parseApiResponse(RawSummaryResponseSchema, res.data.data, "getSummary");
    return normalizeSummary(raw);
  },
};
