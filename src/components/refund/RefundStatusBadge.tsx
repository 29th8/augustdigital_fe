"use client";

import { cn } from "@/lib/utils";
import type { RefundStatus } from "@/types/refund";

// ─── Config ───────────────────────────────────────────────────────────────────

const CONFIG: Record<RefundStatus, { label: string; className: string }> = {
  PENDING: { label: "Chờ xử lý", className: "bg-amber-50 text-amber-700 ring-amber-200" },
  PROCESSED: { label: "Đã hoàn tiền", className: "bg-green-50 text-green-700 ring-green-200" },
  REJECTED: { label: "Đã từ chối", className: "bg-red-50 text-red-600 ring-red-200" },
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RefundStatusBadgeProps {
  status: RefundStatus;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RefundStatusBadge({ status }: RefundStatusBadgeProps) {
  const { label, className } = CONFIG[status] ?? CONFIG.PENDING;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        className,
      )}
    >
      {label}
    </span>
  );
}
