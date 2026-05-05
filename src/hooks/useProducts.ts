"use client";

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
    queryFn: () => ProductService.getProducts(params),
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
    queryFn: () => ProductService.getProductById(id),
    enabled: !!id,
  });
}
