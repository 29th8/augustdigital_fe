"use client";

import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { OrderService } from "@/services/order.service";
import type { ApiErrorResponse } from "@/types/api";
import type { LookupOrderResult } from "@/types/order";

// ─── Retry helper ─────────────────────────────────────────────────────────────

/**
 * Retry once on 5xx server errors; never retry on 4xx (not found / email mismatch).
 * Never retry on cancelled requests.
 */
function shouldRetryLookup(failureCount: number, err: unknown): boolean {
  if (axios.isCancel(err)) return false;
  const apiErr = err as ApiErrorResponse;
  const code = apiErr?.code ?? 500;
  // Retry once on 5xx only
  return failureCount < 1 && code >= 500;
}

// ─── Query key ────────────────────────────────────────────────────────────────

export const orderLookupKey = (orderCode: string, email: string) =>
  ["order-lookup", orderCode, email] as const;

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseOrderLookupParams {
  orderCode: string;
  email: string;
}

/**
 * Looks up an order by code + email for guest users (no JWT required).
 * Pass `null` to disable the query.
 *
 * - Retries once on 5xx server errors
 * - Never retries on 4xx (order not found / email mismatch)
 * - Cancels on AbortSignal when params change
 */
export function useOrderLookup(params: UseOrderLookupParams | null) {
  return useQuery<LookupOrderResult, ApiErrorResponse>({
    queryKey: params
      ? orderLookupKey(params.orderCode, params.email)
      : (["order-lookup", null, null] as const),
    queryFn: ({ signal }) =>
      OrderService.lookupOrder(
        { order_code: params!.orderCode, email: params!.email },
        signal,
      ),
    enabled: !!params?.orderCode && !!params?.email,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: shouldRetryLookup,
  });
}
