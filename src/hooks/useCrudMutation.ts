"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ApiErrorResponse } from "@/types/api";

interface UseCrudMutationOptions<TVariables, TData = unknown> {
  mutationFn: (vars: TVariables) => Promise<TData>;
  successMessage: string;
  errorFallback: string;
  invalidateKeys?: string[][];
  onSuccess?: (data: TData, vars: TVariables) => void;
  onError?: (err: ApiErrorResponse) => void;
}

/**
 * Thin wrapper around useMutation that handles:
 * - success toast
 * - error toast (falls back to errorFallback if API provides no message)
 * - query invalidation on success
 *
 * For mutations that need optimistic updates, use useMutation directly.
 */
export function useCrudMutation<TVariables, TData = unknown>({
  mutationFn,
  successMessage,
  errorFallback,
  invalidateKeys = [],
  onSuccess,
  onError,
}: UseCrudMutationOptions<TVariables, TData>) {
  const queryClient = useQueryClient();

  return useMutation<TData, ApiErrorResponse, TVariables>({
    mutationFn,
    onSuccess: (data, vars) => {
      toast.success(successMessage);
      invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
      onSuccess?.(data, vars);
    },
    onError: (err) => {
      toast.error(err?.message ?? errorFallback);
      onError?.(err);
    },
  });
}
