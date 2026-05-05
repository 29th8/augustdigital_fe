"use client";

import { useQuery } from "@tanstack/react-query";
import { AnalyticsService } from "@/services/analytics.service";
import type { ProfitParams } from "@/types/analytics";

const ANALYTICS_STALE = 60_000; // 1 minute

export function useProfit(params: ProfitParams) {
  return useQuery({
    queryKey: ["analytics-profit", params.from, params.to, params.variantId ?? null],
    queryFn: () => AnalyticsService.getProfit(params),
    staleTime: ANALYTICS_STALE,
    refetchOnWindowFocus: false,
    enabled: Boolean(params.from && params.to),
  });
}

export function useSummary() {
  return useQuery({
    queryKey: ["analytics-summary"],
    queryFn: () => AnalyticsService.getSummary(),
    staleTime: ANALYTICS_STALE,
    refetchOnWindowFocus: false,
  });
}
