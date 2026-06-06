"use client";

import { useState } from "react";
import {
  Copy,
  Pencil,
  Trash2,
  Loader2,
  MoreHorizontal,
  PowerOff,
  Power,
  Files,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DiscountStatusBadge } from "./DiscountStatusBadge";
import { DiscountUsageProgress } from "./DiscountUsageProgress";
import { DiscountEmptyState } from "./DiscountEmptyState";
import { useToggleDiscount } from "@/hooks/useDiscounts";
import { getDiscountStatus, isDiscountDeletable, msUntilExpiry } from "@/types/discount";
import { formatVND } from "@/lib/formatVND";
import { cn } from "@/lib/utils";
import type { DiscountCode } from "@/types/discount";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DiscountTableProps {
  items: DiscountCode[];
  isLoading: boolean;
  isFetching?: boolean;
  hasFilters: boolean;
  onEdit: (d: DiscountCode) => void;
  onDelete: (d: DiscountCode) => void;
  onDuplicate: (d: DiscountCode) => void;
  onClearFilters: () => void;
  onCreateNew: () => void;
  deletingId: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatValue(type: DiscountCode["type"], value: number): string {
  return type === "PERCENT" ? `${value}%` : formatVND(value);
}

/** Expiry countdown badge — only shown when expiring within 48h */
function ExpiryCountdown({ discount }: { discount: DiscountCode }) {
  const ms = msUntilExpiry(discount);
  if (ms === null) return null;
  if (ms > 48 * 60 * 60 * 1000) return null; // Only show within 48h

  const h = Math.floor(ms / (60 * 60 * 1000));
  const label = h < 1 ? "< 1 giờ" : `${h} giờ`;

  return (
    <span className="ml-1.5 inline-flex items-center rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600 ring-1 ring-inset ring-red-200 animate-pulse">
      ⏰ {label}
    </span>
  );
}

// ─── Row skeleton ─────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-gray-100">
          {[32, 20, 24, 48, 28, 24, 28, 24, 20].map((w, j) => (
            <td key={j} className="px-4 py-3.5">
              <div
                className={`h-4 bg-gray-100 rounded animate-pulse`}
                style={{ width: `${w * 4}px` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Row actions ─────────────────────────────────────────────────────────────

function RowActions({
  discount,
  onEdit,
  onDelete,
  onDuplicate,
  deletingId,
}: {
  discount: DiscountCode;
  onEdit: (d: DiscountCode) => void;
  onDelete: (d: DiscountCode) => void;
  onDuplicate: (d: DiscountCode) => void;
  deletingId: number | null;
}) {
  const toggleMutation = useToggleDiscount();
  const isThisDeleting = deletingId === discount.id;
  const canDelete = isDiscountDeletable(discount);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(discount.code);
      toast.success(`Đã sao chép mã "${discount.code}"`);
    } catch {
      toast.error("Không thể sao chép.");
    }
  }

  function toggleActive() {
    toggleMutation.mutate({ id: discount.id, isActive: !discount.isActive });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {/* Quick copy */}
      <button
        type="button"
        title="Sao chép mã"
        onClick={copyCode}
        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>

      {/* Edit */}
      <button
        type="button"
        title="Chỉnh sửa"
        onClick={() => onEdit(discount)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>

      {/* More actions dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* Toggle active */}
          <DropdownMenuItem
            onClick={toggleActive}
            disabled={toggleMutation.isPending}
            className="gap-2 cursor-pointer"
          >
            {discount.isActive ? (
              <>
                <PowerOff className="h-3.5 w-3.5 text-gray-500" />
                Vô hiệu hóa
              </>
            ) : (
              <>
                <Power className="h-3.5 w-3.5 text-green-600" />
                Kích hoạt
              </>
            )}
          </DropdownMenuItem>

          {/* Duplicate */}
          <DropdownMenuItem
            onClick={() => onDuplicate(discount)}
            className="gap-2 cursor-pointer"
          >
            <Files className="h-3.5 w-3.5 text-gray-500" />
            Nhân đôi
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Delete */}
          <DropdownMenuItem
            onClick={() => onDelete(discount)}
            disabled={isThisDeleting}
            className={cn(
              "gap-2 cursor-pointer",
              canDelete
                ? "text-red-600 focus:text-red-600 focus:bg-red-50"
                : "text-amber-600 focus:text-amber-600 focus:bg-amber-50",
            )}
          >
            {isThisDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            {canDelete ? "Xoá" : "Xoá / Vô hiệu hóa"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────

export function DiscountTable({
  items,
  isLoading,
  isFetching = false,
  hasFilters,
  onEdit,
  onDelete,
  onDuplicate,
  onClearFilters,
  onCreateNew,
  deletingId,
}: DiscountTableProps) {
  const TH = "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap";

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/70">
              <th className={TH}>Mã Voucher</th>
              <th className={TH}>Loại</th>
              <th className={TH}>Giá trị</th>
              <th className={TH}>Lượt dùng</th>
              <th className={TH}>Còn lại</th>
              <th className={TH}>Trạng thái</th>
              <th className={TH}>Hết hạn</th>
              <th className={TH}>Tạo lúc</th>
              <th className={cn(TH, "text-right")}>Hành động</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {isLoading || (isFetching && items.length === 0) ? (
              <TableSkeleton />
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <DiscountEmptyState
                    hasFilters={hasFilters}
                    onClearFilters={onClearFilters}
                    onCreateNew={onCreateNew}
                  />
                </td>
              </tr>
            ) : (
              items.map((d) => {
                const status = getDiscountStatus(d);
                const isExpiringSoon =
                  status === "ACTIVE" && msUntilExpiry(d) !== null;

                return (
                  <tr
                    key={d.id}
                    className={cn(
                      "hover:bg-gray-50/50 transition-colors group",
                      isExpiringSoon && "bg-red-50/30",
                    )}
                  >
                    {/* Code */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-gray-900 tracking-wider text-sm">
                          {d.code}
                        </span>
                        <ExpiryCountdown discount={d} />
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "inline-flex rounded px-2 py-0.5 text-xs font-semibold",
                          d.type === "PERCENT"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-violet-50 text-violet-700",
                        )}
                      >
                        {d.type === "PERCENT" ? "%" : "VND"}
                      </span>
                    </td>

                    {/* Value */}
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-gray-900">
                        {formatValue(d.type, d.value)}
                      </span>
                    </td>

                    {/* Usage progress */}
                    <td className="px-4 py-3.5 min-w-[140px]">
                      <DiscountUsageProgress
                        usedCount={d.usedCount}
                        usageLimit={d.usageLimit}
                        remainingUses={d.remainingUses}
                        size="sm"
                      />
                    </td>

                    {/* Remaining */}
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          d.remainingUses === 0
                            ? "text-red-500"
                            : d.remainingUses <= d.usageLimit * 0.2
                              ? "text-amber-600"
                              : "text-gray-700",
                        )}
                      >
                        {d.remainingUses.toLocaleString()}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <DiscountStatusBadge status={status} />
                    </td>

                    {/* Expired at */}
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "text-xs",
                          status === "EXPIRED" ? "text-red-500" : "text-gray-400",
                        )}
                      >
                        {formatDateTime(d.expiredAt)}
                      </span>
                    </td>

                    {/* Created at */}
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-gray-400">{formatDate(d.createdAt)}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <RowActions
                        discount={d}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onDuplicate={onDuplicate}
                        deletingId={deletingId}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
