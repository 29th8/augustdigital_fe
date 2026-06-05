"use client";

import axios from "axios";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { OrderService } from "@/services/order.service";
import { getAppChannel } from "@/lib/channel";
import { TOAST } from "@/lib/toastMessages";
import useAuthStore from "@/store/useAuthStore";
import { ACTIVE_ORDER_STATUSES } from "@/types/order";
import type { ApiErrorResponse } from "@/types/api";
import type { UserOrderListParams, AdminOrderListParams } from "@/types/order";

// ─── Retry helper ─────────────────────────────────────────────────────────────

function shouldRetry(failureCount: number, err: unknown): boolean {
  if (axios.isCancel(err)) return false;
  const apiErr = err as ApiErrorResponse;
  return failureCount < 1 && (apiErr?.code ?? 500) >= 500;
}

// ─── Query keys ───────────────────────────────────────────────────────────────

export const userOrdersKey = (params: UserOrderListParams) =>
  ["user-orders", params] as const;

export const userOrderDetailKey = (id: number) =>
  ["user-order-detail", id] as const;

export const adminOrdersKey = (params: AdminOrderListParams) =>
  ["admin-orders", params] as const;

export const adminOrderDetailKey = (id: number) =>
  ["admin-order-detail", id] as const;

/** Used to invalidate ALL user-orders queries regardless of params. */
export const USER_ORDERS_ROOT_KEY = ["user-orders"] as const;

/** Used to invalidate ALL admin-orders queries regardless of params. */
export const ADMIN_ORDERS_ROOT_KEY = ["admin-orders"] as const;

// ─── User hooks ───────────────────────────────────────────────────────────────

/**
 * Paginated list of the authenticated user's orders.
 */
export function useUserOrders(params: UserOrderListParams = {}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: userOrdersKey(params),
    queryFn: ({ signal }) => OrderService.getUserOrders(params, signal),
    enabled: isAuthenticated,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    // Poll every 5s while any order in the list is still in an active status
    // so the list updates automatically after the PayOS webhook arrives.
    refetchInterval: (query) => {
      const hasActive = query.state.data?.items.some((item) =>
        ACTIVE_ORDER_STATUSES.includes(item.status),
      );
      return hasActive ? 5_000 : false;
    },
    refetchIntervalInBackground: false,
  });
}

/**
 * Full order detail for the authenticated user, with delivery credentials.
 *
 * Polls every 5 seconds while the order is in an ACTIVE status
 * (PENDING / PAID / PROCESSING) so the UI reacts to backend transitions
 * without requiring a manual refresh.
 */
export function useOrderDetail(id: number) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();

  // Cross-tab sync: another tab moved this order to a new status.
  useEffect(() => {
    return getAppChannel().subscribe((msg) => {
      if (msg.type === "ORDER_STATUS") {
        qc.invalidateQueries({ queryKey: userOrderDetailKey(id) });
      }
    });
  }, [id, qc]);

  return useQuery({
    queryKey: userOrderDetailKey(id),
    queryFn: ({ signal }) => OrderService.getUserOrderDetail(id, signal),
    enabled: isAuthenticated && !!id,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: "always",
    // Poll while order is ACTIVE; resolved automatically when data changes.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status) return false;
      return ACTIVE_ORDER_STATUSES.includes(status) ? 5_000 : false;
    },
    refetchIntervalInBackground: false,
  });
}

// ─── Admin hooks ──────────────────────────────────────────────────────────────

/**
 * Paginated list of all orders for the admin dashboard.
 */
export function useAdminOrders(params: AdminOrderListParams = {}) {
  return useQuery({
    queryKey: adminOrdersKey(params),
    queryFn: ({ signal }) => OrderService.getAdminOrders(params, signal),
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}

/**
 * Full admin order detail — includes inventory allocations + audit logs.
 * Polls for ACTIVE orders.
 */
export function useAdminOrderDetail(id: number | null) {
  const qc = useQueryClient();

  useEffect(() => {
    return getAppChannel().subscribe((msg) => {
      if (msg.type === "ORDER_STATUS" && id !== null) {
        qc.invalidateQueries({ queryKey: adminOrderDetailKey(id) });
      }
    });
  }, [id, qc]);

  return useQuery({
    queryKey: adminOrderDetailKey(id ?? 0),
    queryFn: ({ signal }) => OrderService.getAdminOrderDetail(id!, signal),
    enabled: id !== null,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: "always",
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status) return false;
      return ACTIVE_ORDER_STATUSES.includes(status) ? 5_000 : false;
    },
    refetchIntervalInBackground: false,
  });
}

// ─── Admin mutations ──────────────────────────────────────────────────────────

/**
 * All admin actions for a single order.
 * Pass `onSuccess` to close a drawer / refresh a parent list.
 */
export function useAdminOrderMutations(orderId: number, onSuccess?: () => void) {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: adminOrderDetailKey(orderId) });
    qc.invalidateQueries({ queryKey: ADMIN_ORDERS_ROOT_KEY });
  };

  const markAsPaid = useMutation<void, ApiErrorResponse>({
    mutationFn: () => OrderService.adminMarkAsPaid(orderId),
    retry: shouldRetry,
    onSuccess: () => {
      toast.success(TOAST.ORDER_MARKED_PAID);
      invalidate();
      onSuccess?.();
    },
    onError: (err) => toast.error(err?.message ?? TOAST.ORDER_MARK_PAID_ERROR),
  });

  const retryAllocation = useMutation<void, ApiErrorResponse>({
    mutationFn: () => OrderService.adminRetryAllocation(orderId),
    retry: shouldRetry,
    onSuccess: () => {
      toast.success(TOAST.ORDER_ALLOCATION_RETRIED);
      invalidate();
      onSuccess?.();
    },
    onError: (err) => toast.error(err?.message ?? TOAST.ORDER_ALLOCATION_RETRY_ERROR),
  });

  const cancelOrder = useMutation<void, ApiErrorResponse, { reason?: string }>({
    mutationFn: ({ reason }) => OrderService.adminCancelOrder(orderId, reason),
    retry: shouldRetry,
    onSuccess: () => {
      toast.success(TOAST.ORDER_CANCELLED);
      invalidate();
      onSuccess?.();
    },
    onError: (err) => toast.error(err?.message ?? TOAST.ORDER_CANCEL_ERROR),
  });

  const resendDelivery = useMutation<void, ApiErrorResponse, { deliveryId: number }>({
    mutationFn: ({ deliveryId }) => OrderService.adminResendDelivery(deliveryId),
    retry: shouldRetry,
    onSuccess: () => toast.success(TOAST.ORDER_DELIVERY_RESENT),
    onError: (err) => toast.error(err?.message ?? TOAST.ORDER_DELIVERY_RESEND_ERROR),
  });

  return { markAsPaid, retryAllocation, cancelOrder, resendDelivery };
}
