"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CartService } from "@/services/cart.service";
import { getAppChannel } from "@/lib/channel";
import { useCartStore } from "@/store/useCartStore";
import { CART_QUERY_KEY } from "@/hooks/useCart";
import { TOAST } from "@/lib/toastMessages";
import type { ApiErrorResponse } from "@/types/api";
import type { Cart } from "@/types/cart";

// ─── Network resilience helper ────────────────────────────────────────────────
// Retry on 5xx (server error) or code === 500 when there's no response (network
// error). Do NOT retry on 4xx — those are caller faults that won't self-heal.

function shouldRetry(failureCount: number, err: ApiErrorResponse): boolean {
  return failureCount < 2 && err.code >= 500;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCartMutations() {
  const queryClient = useQueryClient();
  const openCart = useCartStore((s) => s.open);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });

  /** Publish cart update to other tabs after a successful mutation. */
  function broadcastCart(cart: Cart) {
    getAppChannel().post({ type: "CART_UPDATED", cart });
  }

  // ── Add ──────────────────────────────────────────────────────────────────
  const addMutation = useMutation<
    void,
    ApiErrorResponse,
    { variantId: number; quantity: number }
  >({
    mutationFn: ({ variantId, quantity }) =>
      CartService.addToCart(variantId, quantity),
    retry: shouldRetry,
    retryDelay: 1000,
    onSuccess: () => {
      // API returns no cart data — refetch to get the authoritative cart state.
      invalidate();
      toast.success(TOAST.CART_ADDED);
      openCart();
    },
    onError: (err) => {
      // Stock errors (400 + "Insufficient stock") are handled by the caller
      // with proper Vietnamese UX — skip the generic toast to avoid duplicates.
      if (err.code === 400 && err.message?.includes("Insufficient stock")) return;
      toast.error(err?.message ?? TOAST.CART_ADD_ERROR);
    },
  });

  // ── Update quantity ───────────────────────────────────────────────────────
  const updateMutation = useMutation<
    Cart,
    ApiErrorResponse,
    { variantId: number; quantity: number }
  >({
    mutationFn: ({ variantId, quantity }) =>
      CartService.updateCartItem(variantId, quantity),
    retry: shouldRetry,
    retryDelay: 1000,
    onSuccess: (updatedCart) => {
      queryClient.setQueryData(CART_QUERY_KEY, updatedCart);
      broadcastCart(updatedCart);
    },
    onError: (err) => {
      toast.error(err?.message ?? TOAST.CART_UPDATE_ERROR);
      invalidate(); // revert optimistic display to server truth
    },
  });

  // ── Remove item ───────────────────────────────────────────────────────────
  const removeMutation = useMutation<void, ApiErrorResponse, number>({
    mutationFn: (variantId) => CartService.removeFromCart(variantId),
    retry: shouldRetry,
    retryDelay: 1000,
    onSuccess: () => {
      invalidate();
      toast.success(TOAST.CART_REMOVED);
    },
    onError: () => {
      toast.error(TOAST.CART_REMOVE_ERROR);
      invalidate();
    },
  });

  // ── Clear all ─────────────────────────────────────────────────────────────
  const clearMutation = useMutation<void, ApiErrorResponse>({
    mutationFn: () => CartService.clearCart(),
    retry: shouldRetry,
    retryDelay: 1000,
    onSuccess: () => {
      const emptyCart: Cart = { items: [], totalAmount: 0 };
      queryClient.setQueryData(CART_QUERY_KEY, emptyCart);
      broadcastCart(emptyCart);
      toast.success(TOAST.CART_CLEARED);
    },
    onError: (err) => {
      toast.error(err?.message ?? TOAST.CART_UPDATE_ERROR);
    },
  });

  return { addMutation, updateMutation, removeMutation, clearMutation };
}
