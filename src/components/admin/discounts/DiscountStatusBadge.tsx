import { Archive, CheckCircle2, Clock, PauseCircle } from "lucide-react";

import type { DiscountCode, DiscountStatus } from "@/types/discount";
import { getDiscountStatus } from "@/types/discount";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DiscountStatusBadgeProps {
  /** Use directly if the status is already known. */
  status?: DiscountStatus;
  /** Compute status from a full discount object if `status` is not provided. */
  discount?: DiscountCode;
  size?: "sm" | "md";
}

// ─── Config ───────────────────────────────────────────────────────────────────

type StatusConfig = {
  label: string;
  className: string;
  Icon: React.ElementType;
};

const STATUS_CONFIG: Record<DiscountStatus, StatusConfig> = {
  ACTIVE: {
    label: "Hoạt động",
    className: "bg-green-50 text-green-700 ring-green-200",
    Icon: CheckCircle2,
  },
  DISABLED: {
    label: "Đã tắt",
    className: "bg-gray-100 text-gray-500 ring-gray-200",
    Icon: PauseCircle,
  },
  EXPIRED: {
    label: "Hết hạn",
    className: "bg-red-50 text-red-600 ring-red-200",
    Icon: Clock,
  },
  FULLY_USED: {
    label: "Đã dùng hết",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
    Icon: Archive,
  },
};

const SIZE_CLASSES = {
  sm: { badge: "px-1.5 py-0.5 text-[11px]", icon: "h-2.5 w-2.5" },
  md: { badge: "px-2 py-0.5 text-xs", icon: "h-3 w-3" },
} as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function DiscountStatusBadge({
  status,
  discount,
  size = "md",
}: DiscountStatusBadgeProps) {
  const resolvedStatus: DiscountStatus | undefined =
    status ?? (discount ? getDiscountStatus(discount) : undefined);

  if (!resolvedStatus) return null;

  const { label, className, Icon } = STATUS_CONFIG[resolvedStatus];
  const { badge: badgeSize, icon: iconSize } = SIZE_CLASSES[size];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full ring-1 ring-inset font-medium ${badgeSize} ${className}`}
    >
      <Icon className={iconSize} aria-hidden="true" />
      {label}
    </span>
  );
}
