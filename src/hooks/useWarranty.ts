"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { WarrantyService } from "@/services/warranty.service";
import type {
  WarrantyListParams,
  SubmitWarrantyPayload,
  ResolveWarrantyPayload,
} from "@/types/warranty";
import type { ApiErrorResponse } from "@/types/api";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const myWarrantiesKey = (params: WarrantyListParams) =>
  ["my-warranties", params] as const;

export const adminWarrantiesKey = (params: WarrantyListParams) =>
  ["admin-warranties", params] as const;

export const adminWarrantyDetailKey = (id: number) =>
  ["admin-warranty-detail", id] as const;

export const ADMIN_WARRANTIES_ROOT = ["admin-warranties"] as const;
export const MY_WARRANTIES_ROOT = ["my-warranties"] as const;

// ─── Query hooks ──────────────────────────────────────────────────────────────

export function useMyWarranties(params: WarrantyListParams = {}) {
  return useQuery({
    queryKey: myWarrantiesKey(params),
    queryFn: () => WarrantyService.getMyWarranties(params),
    staleTime: 30_000,
  });
}

export function useAdminWarranties(params: WarrantyListParams = {}) {
  return useQuery({
    queryKey: adminWarrantiesKey(params),
    queryFn: () => WarrantyService.getAdminWarranties(params),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}

export function useAdminWarrantyDetail(id: number | null) {
  return useQuery({
    queryKey: adminWarrantyDetailKey(id ?? 0),
    queryFn: () => WarrantyService.getAdminWarrantyById(id!),
    enabled: id !== null,
    staleTime: 0,
    refetchOnMount: "always",
  });
}

// ─── Mutation hooks ───────────────────────────────────────────────────────────

export function useSubmitWarranty(onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation<unknown, ApiErrorResponse, SubmitWarrantyPayload>({
    mutationFn: (payload) => WarrantyService.submitClaim(payload),
    onSuccess: () => {
      toast.success("Yêu cầu bảo hành đã được gửi thành công.");
      qc.invalidateQueries({ queryKey: MY_WARRANTIES_ROOT });
      onSuccess?.();
    },
    onError: (err) => {
      const msg = err?.message ?? "Không thể gửi yêu cầu bảo hành.";
      toast.error(msg);
    },
  });
}

export function useResolveWarranty(onSuccess?: () => void) {
  const qc = useQueryClient();
  return useMutation<void, ApiErrorResponse, { id: number; payload?: ResolveWarrantyPayload }>({
    mutationFn: ({ id, payload }) => WarrantyService.resolveWarranty(id, payload),
    onSuccess: (_, { id }) => {
      toast.success("Đã khởi động quy trình xử lý bảo hành.");
      qc.invalidateQueries({ queryKey: ADMIN_WARRANTIES_ROOT });
      qc.invalidateQueries({ queryKey: adminWarrantyDetailKey(id) });
      onSuccess?.();
    },
    onError: (err) => {
      const msg = err?.message ?? "Không thể xử lý yêu cầu bảo hành.";
      toast.error(msg);
    },
  });
}
