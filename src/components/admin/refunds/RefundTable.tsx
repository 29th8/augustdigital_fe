"use client";

import { Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import RefundStatusBadge from "@/components/refund/RefundStatusBadge";
import type { Refund } from "@/types/refund";

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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
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
        <div className="h-4 w-28 bg-gray-100 rounded" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-24 bg-gray-100 rounded" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-40 bg-gray-100 rounded" />
      </td>
      <td className="px-4 py-3">
        <div className="h-5 w-24 bg-gray-100 rounded-full" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-16 bg-gray-100 rounded" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-28 bg-gray-100 rounded" />
      </td>
      <td className="px-4 py-3">
        <div className="h-8 w-16 bg-gray-100 rounded" />
      </td>
    </tr>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RefundTableProps {
  items: Refund[];
  isLoading: boolean;
  isFetching: boolean;
  onProcess: (refund: Refund) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RefundTable({
  items,
  isLoading,
  isFetching,
  onProcess,
}: RefundTableProps) {
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
                Mã đơn
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                Số tiền
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                Lý do
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                Trạng thái
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                Admin ID
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap">
                Ngày tạo
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <RefreshCcw className="h-10 w-10 text-gray-200" />
                    <p className="text-sm text-gray-500">Không có yêu cầu hoàn tiền nào.</p>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((refund) => (
                <tr
                  key={refund.id}
                  className={`hover:bg-gray-50 transition-colors ${isFetching ? "opacity-70" : ""}`}
                >
                  {/* ID */}
                  <td className="px-4 py-3 text-xs font-mono text-gray-400">#{refund.id}</td>

                  {/* Order code */}
                  <td className="px-4 py-3 font-mono text-gray-700 whitespace-nowrap">
                    {refund.orderCode}
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">
                    {formatCurrency(refund.amount)}
                  </td>

                  {/* Reason */}
                  <td
                    className="px-4 py-3 text-gray-600 max-w-[220px]"
                    title={refund.reason}
                  >
                    {truncate(refund.reason, 50)}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <RefundStatusBadge status={refund.status} />
                  </td>

                  {/* Admin ID */}
                  <td className="px-4 py-3 text-xs font-mono text-gray-400">
                    {refund.adminId !== null ? `#${refund.adminId}` : "—"}
                  </td>

                  {/* Created at */}
                  <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                    {formatDate(refund.createdAt)}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {refund.status === "PENDING" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onProcess(refund)}
                        className="h-8 text-xs border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300"
                      >
                        <Loader2 className="h-3 w-3 mr-1 hidden" />
                        Xử lý
                      </Button>
                    ) : (
                      <span className="text-gray-300 text-sm">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
