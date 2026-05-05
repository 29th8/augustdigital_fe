"use client";

import { useEffect } from "react";
import { toast } from "sonner";

// ─── Storage helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY = "pending-order";
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface PendingOrder {
  orderCode: string;
  email: string;
  createdAt: number;
}

export function savePendingOrder(order: PendingOrder): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
}

export function clearPendingOrder(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function getPendingOrder(): PendingOrder | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const order = JSON.parse(raw) as PendingOrder;
    if (Date.now() - order.createdAt > MAX_AGE_MS) {
      clearPendingOrder();
      return null;
    }
    return order;
  } catch {
    clearPendingOrder();
    return null;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * On app load, checks localStorage for an unresolved order.
 * If found (and not older than 24 h), shows a persistent toast prompting the
 * user to resume tracking their order.
 *
 * Skipped when the user is already on an order-confirmation page.
 * Runs once per layout mount (empty deps array; layout is persistent in
 * Next.js App Router).
 */
export function usePendingOrderRecovery() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Don't show the recovery toast when the user is already on the page.
    if (window.location.pathname.startsWith("/order-confirmation")) return;

    const pending = getPendingOrder();
    if (!pending) return;

    toast.info(`Đơn hàng đang chờ thanh toán: ${pending.orderCode}`, {
      duration: 12000,
      action: {
        label: "Kiểm tra ngay",
        onClick: () => {
          window.location.href = `/order-confirmation/${pending.orderCode}?email=${encodeURIComponent(pending.email)}`;
        },
      },
    });
  }, []); // intentionally run once on mount
}
