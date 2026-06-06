"use client";

import { Loader2, Eye, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import WarrantyStatusBadge from "@/components/warranty/WarrantyStatusBadge";
import type { WarrantyClaim } from "@/types/warranty";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + "…";
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3">
        <div className="h-4 w-8 bg-gray-100 rounded" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-32 bg-gray-100 rounded mb-1" />
        <div className="h-3 w-20 bg-gray-100 rounded" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-24 bg-gray-100 rounded" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-36 bg-gray-100 rounded" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-40 bg-gray-100 rounded" />
      </td>
      <td className="px-4 py-3">
        <div className="h-5 w-24 bg-gray-100 rounded-full" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-28 bg-gray-100 rounded" />
      </td>
      <td className="px-4 py-3">
        <div className="h-8 w-24 bg-gray-100 rounded" />
      </td>
    </tr>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface WarrantyTableProps {
  items: WarrantyClaim[];
  isLoading: boolean;
  onView: (claim: WarrantyClaim) => void;
  resolvingId?: number | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WarrantyTable({
  items,
  isLoading,
  onView,
  resolvingId,
}: WarrantyTableProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                ID
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                Sản phẩm
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                Mã đơn
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                Email khách
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                Mô tả
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                Trạng thái
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                Ngày tạo
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <ShieldCheck className="h-10 w-10 text-gray-200" />
                    <p className="text-sm text-gray-500">Không có yêu cầu bảo hành nào.</p>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((claim) => {
                const isResolving = resolvingId === claim.id;
                return (
                  <tr
                    key={claim.id}
                    className={cn(
                      "hover:bg-gray-50 transition-colors",
                      isResolving && "opacity-60",
                    )}
                  >
                    {/* ID */}
                    <td className="px-4 py-3 text-xs font-mono text-gray-400">
                      #{claim.id}
                    </td>

                    {/* Product */}
                    <td className="px-4 py-3 max-w-[160px]">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-gray-900 truncate">
                          {claim.productName ?? "—"}
                        </span>
                        {claim.variantName && (
                          <span className="text-xs text-gray-400 truncate">
                            {claim.variantName}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Order code */}
                    <td className="px-4 py-3 font-mono text-gray-600 whitespace-nowrap">
                      {claim.orderCode ?? "—"}
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 text-gray-600 max-w-[180px] truncate">
                      {claim.userEmail}
                    </td>

                    {/* Description */}
                    <td
                      className="px-4 py-3 text-gray-600 max-w-[220px]"
                      title={claim.description}
                    >
                      {truncate(claim.description, 60)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <WarrantyStatusBadge status={claim.status} />
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {formatDate(claim.createdAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onView(claim)}
                        disabled={isResolving}
                        className="h-8 text-xs border-gray-200 text-gray-600 hover:text-blue-700 hover:border-blue-300"
                      >
                        {isResolving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Xem &amp; Xử lý
                          </>
                        )}
                      </Button>
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
