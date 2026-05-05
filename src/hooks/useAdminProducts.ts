"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ProductService } from "@/services/product.service";
import { useProducts } from "./useProducts";
import type { ApiErrorResponse } from "@/types/api";

export function useAdminProducts() {
  const queryClient = useQueryClient();
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const productQuery = useProducts({ limit: 50 });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => ProductService.deleteProduct(id),
    onSuccess: () => {
      toast.success("Đã xóa sản phẩm.");
      setConfirmDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: ApiErrorResponse) => {
      toast.error(err?.message ?? "Không thể xóa sản phẩm.");
      setConfirmDeleteId(null);
    },
  });

  return {
    ...productQuery,
    confirmDeleteId,
    setConfirmDeleteId,
    deleteProduct: (id: number) => deleteMutation.mutate(id),
    isDeleting: deleteMutation.isPending,
  };
}
