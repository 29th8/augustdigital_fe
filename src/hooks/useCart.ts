"use client";

import { useQuery } from "@tanstack/react-query";
import { CartService } from "@/services/cart.service";

export const CART_QUERY_KEY = ["cart"] as const;

export function useCart() {
  return useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: () => CartService.getCart(),
    staleTime: 0,
  });
}

export function useCartItemCount(): number {
  const { data } = useCart();
  return data?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
}
