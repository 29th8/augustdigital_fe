"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefundService } from "@/services/refund.service";
import type { RefundListParams, CreateRefundPayload, ProcessRefundPayload, UserCreateRefundPayload } from "@/types/refund";
import type { ApiErrorResponse } from "@/types/api";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const adminRefundsKey = (params: RefundListParams) =>
  ["admin-refunds", params] as const;

export const myRefundsKey = (params: RefundListParams) =>
  ["my-refunds-list", params] as const;

export const ADMIN_REFUNDS_ROOT = ["admin-refunds"] as const;
export const MY_REFUNDS_ROOT = ["my-refunds-list"] as const;

// ─── Query hooks ──────────────────────────────────────────────────────────────

export function useAdminRefunds(params: RefundListParams = {}) {
  return useQuery({
    queryKey: adminRefundsKey(params),
    queryFn: () => RefundService.getAdminRefunds(params),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useMyRefunds(params: RefundListParams = {}) {
  return useQuery({
    queryKey: myRefundsKey(params),
    queryFn: () => RefundService.getMyRefunds(params),
    staleTime: 30_000,
  });
}

// ─── Mutation hooks ───────────────────────────────────────────────────────────

export function useCreateRefund(onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation<unknown, ApiErrorResponse, CreateRefundPayload>({
    mutationFn: (payload) => RefundService.createRefund(payload),
    onSuccess: () => {
      toast.success("Đã tạo yêu cầu hoàn tiền thành công.");
      qc.invalidateQueries({ queryKey: ADMIN_REFUNDS_ROOT });
      onSuccess?.();
    },
    onError: (err) => toast.error(err?.message ?? "Không thể tạo yêu cầu hoàn tiền."),
  });
}

export function useCreateUserRefund(onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation<unknown, ApiErrorResponse, UserCreateRefundPayload>({
    mutationFn: (payload) => RefundService.createUserRefund(payload),
    onSuccess: () => {
      toast.success("Yêu cầu hoàn tiền đã được gửi. Chúng tôi sẽ xử lý trong thời gian sớm nhất.");
      qc.invalidateQueries({ queryKey: MY_REFUNDS_ROOT });
      onSuccess?.();
    },
    onError: (err) => toast.error(err?.message ?? "Không thể gửi yêu cầu hoàn tiền."),
  });
}

export function useProcessRefund(onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation<unknown, ApiErrorResponse, { id: number; payload: ProcessRefundPayload }>({
    mutationFn: ({ id, payload }) => RefundService.processRefund(id, payload),
    onSuccess: (_, { payload }) => {
      const label = payload.status === "PROCESSED" ? "duyệt" : "từ chối";
      toast.success(`Đã ${label} yêu cầu hoàn tiền.`);
      qc.invalidateQueries({ queryKey: ADMIN_REFUNDS_ROOT });
      onSuccess?.();
    },
    onError: (err) => toast.error(err?.message ?? "Không thể xử lý yêu cầu hoàn tiền."),
  });
}
