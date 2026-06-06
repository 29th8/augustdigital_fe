"use client";

import axios from "axios";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProductService } from "@/services/product.service";
import type { ProductListParams } from "@/types/product";

export function useProducts(initialParams: ProductListParams = {}) {
  const [params, setParams] = useState<ProductListParams>({
    page: 0,
    limit: 12,
    ...initialParams,
  });

  const query = useQuery({
    queryKey: ["products", params],
    // signal is passed straight to axios so TanStack Query can cancel the
    // in-flight HTTP request when the component unmounts or the user navigates
    // away.  TQ v5 aborts its internal AbortController → axios throws
    // CanceledError → interceptor passes it through unchanged → TQ checks
    // signal.aborted === true and does NOT set query to error state.
    queryFn: async ({ signal }) => {
      if (process.env.NODE_ENV === "development") {
        console.log("[useProducts] queryFn fired", { params, signalAborted: signal.aborted });
      }
      try {
        const result = await ProductService.getProducts(params, signal);
        if (process.env.NODE_ENV === "development") {
          console.log("[useProducts] queryFn success", {
            itemCount: result.items.length,
            pageInfo: result.page_info,
          });
        }
        return result;
      } catch (err) {
        // CanceledError = user navigated away; expected and harmless.
        // Log only real errors so the console stays clean during normal navigation.
        if (process.env.NODE_ENV === "development" && !axios.isCancel(err)) {
          console.error("[useProducts] queryFn error", err);
        }
        throw err;
      }
    },
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    // "always" bypasses the stale check — forces a refetch on every mount
    // regardless of whether the global QueryProvider staleTime (60s) would
    // otherwise consider the data fresh. Fixes the case where RQ reverted
    // the query to pending/idle but then skipped refetch because staleTime
    // hadn't expired.
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    // Inherit the cancel-safe retry function from QueryProvider.
    // DO NOT override with a numeric retry here — a number like `retry: 1`
    // has no access to the error and cannot distinguish CanceledError from
    // a real server error, causing cancelled requests to be retried and
    // producing duplicate ghost requests on navigation.
  });

  function setFilter(updates: Partial<ProductListParams>) {
    setParams((prev) => ({ ...prev, ...updates, page: 0 }));
  }

  function setPage(page: number) {
    setParams((prev) => ({ ...prev, page }));
  }

  return {
    ...query,
    params,
    setFilter,
    setPage,
  };
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: ({ signal }) => ProductService.getProductById(id, signal),
    enabled: !!id,
  });
}
