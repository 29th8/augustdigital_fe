"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CategoryService } from "@/services/category.service";
import { useCategories } from "./useCategories";
import { useCrudMutation } from "./useCrudMutation";
import { TOAST } from "@/lib/toastMessages";
import type { Category } from "@/types/category";
import type { ApiErrorResponse } from "@/types/api";

export function useCategoryMutations() {
  const queryClient = useQueryClient();
  const categoriesQuery = useCategories();

  // ─── Create ────────────────────────────────────────────────────────────────
  const createMutation = useCrudMutation({
    mutationFn: (name: string) => CategoryService.createCategory(name),
    successMessage: TOAST.CATEGORY_CREATED,
    errorFallback: TOAST.CATEGORY_CREATE_ERROR,
    invalidateKeys: [["categories"]],
  });

  // ─── Update (optimistic) ───────────────────────────────────────────────────
  const updateMutation = useMutation<
    Category,
    ApiErrorResponse,
    { id: number; name: string },
    { previous: Category[] | undefined }
  >({
    mutationFn: ({ id, name }) => CategoryService.updateCategory(id, name),
    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: ["categories"] });
      const previous = queryClient.getQueryData<Category[]>(["categories"]);
      queryClient.setQueryData<Category[]>(["categories"], (old) =>
        old ? old.map((c) => (c.id === id ? { ...c, name } : c)) : []
      );
      return { previous };
    },
    onSuccess: () => toast.success(TOAST.CATEGORY_UPDATED),
    onError: (err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["categories"], context.previous);
      toast.error(err?.message ?? TOAST.CATEGORY_UPDATE_ERROR);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  // ─── Delete (optimistic) ───────────────────────────────────────────────────
  const deleteMutation = useMutation<
    void,
    ApiErrorResponse,
    number,
    { previous: Category[] | undefined }
  >({
    mutationFn: (id) => CategoryService.deleteCategory(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["categories"] });
      const previous = queryClient.getQueryData<Category[]>(["categories"]);
      queryClient.setQueryData<Category[]>(["categories"], (old) =>
        old ? old.filter((c) => c.id !== id) : []
      );
      return { previous };
    },
    onSuccess: () => toast.success(TOAST.CATEGORY_DELETED),
    onError: (err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(["categories"], context.previous);
      toast.error(err?.message ?? TOAST.CATEGORY_DELETE_ERROR);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  return {
    ...categoriesQuery,
    createCategory: (name: string) => createMutation.mutateAsync(name),
    updateCategory: (id: number, name: string) => updateMutation.mutateAsync({ id, name }),
    deleteCategory: (id: number) => deleteMutation.mutate(id),
    deletingId: deleteMutation.isPending ? deleteMutation.variables : null,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
