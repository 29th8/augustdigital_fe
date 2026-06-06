"use client";

import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { DiscountService } from "@/services/discount.service";
import { TOAST } from "@/lib/toastMessages";
import type { ApiErrorResponse } from "@/types/api";
import { getDiscountStatus } from "@/types/discount";
import type {
  DiscountCode,
  PaginatedDiscountCodes,
  DiscountListParams,
  DiscountCodeCreateRequestApi,
  DiscountCodeUpdateRequestApi,
} from "@/types/discount";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const DISCOUNTS_KEY = ["admin", "discounts"] as const;

export const discountListKey = (params: DiscountListParams) =>
  [...DISCOUNTS_KEY, "list", params] as const;

export const discountDetailKey = (id: number) =>
  [...DISCOUNTS_KEY, "detail", id] as const;

export const discountStatsKey = (filter?: string) =>
  [...DISCOUNTS_KEY, "stats", filter ?? "all"] as const;

// ─── Retry: server errors only ────────────────────────────────────────────────

function shouldRetry(failureCount: number, err: ApiErrorResponse): boolean {
  return failureCount < 2 && err.code >= 500;
}

// ─── Query hooks ──────────────────────────────────────────────────────────────

/**
 * Paginated, filtered list of discount codes.
 * Uses keepPreviousData so the table doesn't blank out between page navigations.
 */
export function useDiscounts(params: DiscountListParams = {}) {
  return useQuery<PaginatedDiscountCodes, ApiErrorResponse>({
    queryKey: discountListKey(params),
    queryFn: ({ signal }) => {
      // Pass AbortSignal so TanStack Query can cancel in-flight requests
      // on parameter change / unmount.
      void signal;
      return DiscountService.fetchDiscounts(params);
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: shouldRetry,
  });
}

/** Fetch a single discount code. Skips when id is undefined. */
export function useDiscountById(id: number | undefined) {
  return useQuery<DiscountCode, ApiErrorResponse>({
    queryKey: id !== undefined ? discountDetailKey(id) : ([...DISCOUNTS_KEY, "detail", null] as const),
    queryFn: () => DiscountService.fetchDiscountById(id!),
    enabled: id !== undefined,
    staleTime: 60_000,
    retry: shouldRetry,
  });
}

/**
 * Stats query — fetches up to 500 discounts and computes status counts client-side.
 * This is the only way to get accurate EXPIRED count since the backend doesn't
 * filter by expiry date — it only knows isActive.
 */
export function useDiscountStats() {
  const query = useQuery<PaginatedDiscountCodes, ApiErrorResponse>({
    queryKey: discountStatsKey("all"),
    queryFn: () => DiscountService.fetchDiscounts({ page: 0, size: 500, sort: "createdAt,desc" }),
    staleTime: 2 * 60_000,
    retry: shouldRetry,
  });

  const items = query.data?.items ?? [];

  return {
    total: query.data?.totalElements,
    active: items.filter((d) => getDiscountStatus(d) === "ACTIVE").length,
    expired: items.filter((d) => getDiscountStatus(d) === "EXPIRED").length,
    disabled: items.filter((d) => getDiscountStatus(d) === "DISABLED").length,
    isLoading: query.isLoading,
  };
}

// ─── Mutation hooks ───────────────────────────────────────────────────────────

/** Create a new discount code. Invalidates the entire list on success. */
export function useCreateDiscount() {
  const queryClient = useQueryClient();

  return useMutation<DiscountCode, ApiErrorResponse, DiscountCodeCreateRequestApi>({
    mutationFn: (payload) => DiscountService.createDiscount(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DISCOUNTS_KEY });
      toast.success(TOAST.DISCOUNT_CREATED);
    },
    onError: (err) => {
      // Field-level errors are handled in the form dialog — only show toast for
      // non-validation errors (network, 5xx, etc.)
      if (!err.errors?.length) {
        toast.error(err?.message ?? TOAST.DISCOUNT_CREATE_ERROR);
      }
    },
  });
}

/** Update an existing discount code. Updates detail cache immediately. */
export function useUpdateDiscount() {
  const queryClient = useQueryClient();

  return useMutation<
    DiscountCode,
    ApiErrorResponse,
    { id: number; payload: DiscountCodeUpdateRequestApi }
  >({
    mutationFn: ({ id, payload }) => DiscountService.updateDiscount(id, payload),
    onSuccess: (updated, { id }) => {
      // Immediately update the detail cache — no refetch needed
      queryClient.setQueryData(discountDetailKey(id), updated);
      queryClient.invalidateQueries({ queryKey: DISCOUNTS_KEY });
      toast.success(TOAST.DISCOUNT_UPDATED);
    },
    onError: (err) => {
      if (!err.errors?.length) {
        toast.error(err?.message ?? TOAST.DISCOUNT_UPDATE_ERROR);
      }
    },
  });
}

/**
 * Toggle is_active inline from the table row.
 * Uses optimistic update for instant feedback.
 */
export function useToggleDiscount() {
  const queryClient = useQueryClient();

  return useMutation<
    DiscountCode,
    ApiErrorResponse,
    { id: number; isActive: boolean },
    { previousData: Map<string, PaginatedDiscountCodes> }
  >({
    mutationFn: ({ id, isActive }) =>
      DiscountService.updateDiscount(id, { isActive }),

    // Optimistically flip isActive in every cached list page
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ queryKey: DISCOUNTS_KEY });

      const queryCache = queryClient.getQueriesData<PaginatedDiscountCodes>({
        queryKey: DISCOUNTS_KEY,
      });
      const previousData = new Map(
        queryCache.map(([key, data]) => [JSON.stringify(key), data!]),
      );

      queryCache.forEach(([key, data]) => {
        if (!data) return;
        queryClient.setQueryData(key, {
          ...data,
          items: data.items.map((item) =>
            item.id === id ? { ...item, isActive } : item,
          ),
        });
      });

      return { previousData };
    },

    onError: (_err, _vars, context) => {
      // Roll back optimistic update
      context?.previousData.forEach((data, keyStr) => {
        queryClient.setQueryData(JSON.parse(keyStr), data);
      });
      toast.error("Không thể thay đổi trạng thái.");
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: DISCOUNTS_KEY });
    },
  });
}

/**
 * Delete a discount code.
 * Only callable when usedCount === 0 (enforced by UI AND backend).
 */
export function useDeleteDiscount() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiErrorResponse, number>({
    mutationFn: (id) => DiscountService.deleteDiscount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DISCOUNTS_KEY });
      toast.success(TOAST.DISCOUNT_DELETED);
    },
    onError: (err) => {
      // Backend returns a specific message when used_count > 0
      const msg = err?.message ?? "";
      if (msg.toLowerCase().includes("used") || err.code === 409) {
        toast.warning("Voucher đã được sử dụng. Hãy vô hiệu hóa thay vì xoá.");
      } else {
        toast.error(msg || TOAST.DISCOUNT_DELETE_ERROR);
      }
    },
  });
}

// ─── Convenience bundle ───────────────────────────────────────────────────────

/** All mutations in one object — for pages that need multiple operations. */
export function useDiscountMutations() {
  const create = useCreateDiscount();
  const update = useUpdateDiscount();
  const toggle = useToggleDiscount();
  const remove = useDeleteDiscount();

  return {
    createDiscount: (p: DiscountCodeCreateRequestApi) => create.mutateAsync(p),
    updateDiscount: (id: number, p: DiscountCodeUpdateRequestApi) =>
      update.mutateAsync({ id, payload: p }),
    toggleDiscount: (id: number, isActive: boolean) =>
      toggle.mutate({ id, isActive }),
    deleteDiscount: (id: number) => remove.mutate(id),
    isCreating: create.isPending,
    isUpdating: update.isPending,
    isToggling: toggle.isPending,
    deletingId: remove.isPending ? remove.variables : null,
    createMutation: create,
    updateMutation: update,
  };
}

// ─── Backward-compat alias ────────────────────────────────────────────────────

/** @deprecated Use useDiscounts */
export const useDiscountList = useDiscounts;
