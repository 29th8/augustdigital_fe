"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getAppChannel } from "@/lib/channel";
import useAuthStore from "@/store/useAuthStore";
import { CART_QUERY_KEY } from "@/hooks/useCart";

/**
 * Syncs critical state across browser tabs.
 *
 * Cart & order — BroadcastChannel (same-tab sender never receives own messages).
 * Auth logout — localStorage storage event (fires only in OTHER tabs when
 *   Zustand persist writes to the "auth-storage" key).
 *
 * Mount once in the main layout via <AppInit />.
 */

const AUTH_STORAGE_KEY = "auth-storage";

export function useCrossTabSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // ── BroadcastChannel: cart + order status ──────────────────────────────
    const unsubscribeChannel = getAppChannel().subscribe((msg) => {
      switch (msg.type) {
        case "CART_UPDATED":
          // Update cache directly — no round-trip fetch needed.
          queryClient.setQueryData(CART_QUERY_KEY, msg.cart);
          break;

        case "LOGGED_OUT":
          // Only act if this tab is still authenticated.
          if (useAuthStore.getState().isAuthenticated) {
            useAuthStore.getState().logout();
            queryClient.clear();
          }
          break;

        case "ORDER_STATUS":
          queryClient.invalidateQueries({
            queryKey: ["order-confirmation", msg.orderCode],
          });
          break;
      }
    });

    // ── localStorage storage event: auth logout sync ───────────────────────
    // "storage" fires ONLY in other tabs when localStorage changes, so there
    // is no loop risk: the tab that calls logout() does not receive this event.
    function handleStorage(event: StorageEvent) {
      if (event.key !== AUTH_STORAGE_KEY) return;
      const store = useAuthStore.getState();
      // Guard: if already logged out, do nothing to avoid a loop.
      if (!store.isAuthenticated) return;

      const parsed = event.newValue ? JSON.parse(event.newValue) : null;
      if (!parsed?.state?.token) {
        // Another tab cleared the token — mirror the logout.
        store.logout();
        queryClient.clear();
      }
    }

    window.addEventListener("storage", handleStorage);

    return () => {
      unsubscribeChannel();
      window.removeEventListener("storage", handleStorage);
    };
  }, [queryClient]);
}
