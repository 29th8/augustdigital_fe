"use client";

import { cn } from "@/lib/utils";
import type { WarrantyRequestStatus } from "@/types/warranty";

// ─── Config ───────────────────────────────────────────────────────────────────

const CONFIG: Record<WarrantyRequestStatus, { label: string; className: string }> = {
  OPEN: {
    label: "Chờ xét duyệt",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  IN_PROGRESS: {
    label: "Đang xử lý",
    className: "bg-blue-50 text-blue-700 ring-blue-200",
  },
  RESOLVED: {
    label: "Đã giải quyết",
    className: "bg-green-50 text-green-700 ring-green-200",
  },
  PENDING_STOCK: {
    label: "Chờ nhập kho",
    className: "bg-purple-50 text-purple-700 ring-purple-200",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export interface WarrantyStatusBadgeProps {
  status: WarrantyRequestStatus;
}

export default function WarrantyStatusBadge({ status }: WarrantyStatusBadgeProps) {
  const { label, className } = CONFIG[status] ?? CONFIG.OPEN;
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
