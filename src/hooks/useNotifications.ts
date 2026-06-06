"use client";

import { useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { NotificationService } from "@/services/notification.service";
import { getAppChannel } from "@/lib/channel";
import { enrichAll, groupNotifications } from "@/lib/notificationUtils";
import useAuthStore from "@/store/useAuthStore";
import type {
  NotificationsPage,
  RichNotificationItem,
  NotificationDisplayItem,
} from "@/types/notification";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;

export const notificationsPageKey = (page: number, size: number) =>
  ["notifications-history", page, size] as const;

const POLL_INTERVAL = 10_000;

// ─── Primary polling hook ─────────────────────────────────────────────────────

/**
 * The single source of truth for the bell's notification data.
 *
 * Pass `paused=true` to suspend polling while the dropdown is open — this
 * prevents background refetches from triggering re-renders that can cause
 * the dropdown to flicker or unexpectedly close.
 *
 * All other consumers that need reactive access to the cached data should use
 * `useEnrichedNotifications()` which subscribes to the cache without creating
 * a competing polling observer.
 */
export function useNotifications(paused = false) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();

  // Cross-tab sync: another tab marked notifications as read.
  useEffect(() => {
    return getAppChannel().subscribe((msg) => {
      if (msg.type === "NOTIFICATIONS_READ") {
        qc.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      }
    });
  }, [qc]);

  return useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => NotificationService.getNotifications(0, 50),
    enabled: isAuthenticated,
    // Pause while the dropdown is open so background refetches don't cause
    // re-renders inside an open Radix DropdownMenuContent.
    refetchInterval: isAuthenticated && !paused ? POLL_INTERVAL : false,
    refetchOnWindowFocus: !paused,
    staleTime: 5_000,
  });
}

// ─── Cache subscriber — no additional fetch observer ─────────────────────────

/**
 * Enriches and groups cached notifications **without** creating a second
 * fetch observer. `enabled: false` means this hook only subscribes to cache
 * updates written by `useNotifications()`; it never initiates network calls
 * itself and never affects the `refetchInterval` negotiation.
 */
export function useEnrichedNotifications(): {
  rich: RichNotificationItem[];
  grouped: NotificationDisplayItem[];
  unreadCount: number;
  hasHigh: boolean;
} {
  const { data } = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: () => NotificationService.getNotifications(0, 50),
    enabled: false,       // never fetches — reads only
    staleTime: Infinity,  // never marks stale
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });

  return useMemo(() => {
    const rich = enrichAll(data?.items ?? []);
    return {
      rich,
      grouped: groupNotifications(rich),
      unreadCount: rich.filter((n) => !n.isRead).length,
      hasHigh: rich.some((n) => !n.isRead && n.priority === "high"),
    };
  }, [data?.items]);
}

// ─── History page query ───────────────────────────────────────────────────────

export function useNotificationsPage(page: number, size = 20) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: notificationsPageKey(page, size),
    queryFn: () => NotificationService.getNotifications(page, size),
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
    staleTime: 30_000,
  });
}

// ─── Unread count (cheap, cache-only) ────────────────────────────────────────

export function useUnreadCount(): number {
  const qc = useQueryClient();
  const data = qc.getQueryData<NotificationsPage>(NOTIFICATIONS_QUERY_KEY);
  return data?.items.filter((n) => !n.isRead).length ?? 0;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useMarkAsRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => NotificationService.markAsRead(id),

    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      const prev = qc.getQueryData<NotificationsPage>(NOTIFICATIONS_QUERY_KEY);
      qc.setQueryData<NotificationsPage>(NOTIFICATIONS_QUERY_KEY, (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
        };
      });
      return { prev };
    },

    onError: (_err, _id, ctx) => {
      qc.setQueryData(NOTIFICATIONS_QUERY_KEY, ctx?.prev);
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      getAppChannel().post({ type: "NOTIFICATIONS_READ" });
    },
  });
}

export function useMarkAllAsRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => NotificationService.markAllAsRead(),

    onMutate: async () => {
      await qc.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      const prev = qc.getQueryData<NotificationsPage>(NOTIFICATIONS_QUERY_KEY);
      qc.setQueryData<NotificationsPage>(NOTIFICATIONS_QUERY_KEY, (old) => {
        if (!old) return old;
        return { ...old, items: old.items.map((n) => ({ ...n, isRead: true })) };
      });
      return { prev };
    },

    onError: (_err, _v, ctx) => {
      qc.setQueryData(NOTIFICATIONS_QUERY_KEY, ctx?.prev);
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      getAppChannel().post({ type: "NOTIFICATIONS_READ" });
    },
  });
}
