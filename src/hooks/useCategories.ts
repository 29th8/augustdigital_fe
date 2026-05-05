"use client";

import { useQuery } from "@tanstack/react-query";
import { CategoryService } from "@/services/category.service";

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => CategoryService.getCategories(),
    staleTime: 5 * 60 * 1000,
  });
}
