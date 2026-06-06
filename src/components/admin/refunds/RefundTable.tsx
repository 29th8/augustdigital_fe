"use client";

import { RefreshCcw, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import RefundStatusBadge from "@/components/refund/RefundStatusBadge";
import { cn } from "@/lib/utils";
import type { Refund } from "@/types/refund";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

function truncate(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max) + "…";
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className="border-b border-gray-50 last:border-0" style={{ opacity: 1 - i * 0.12 }}>
          {[10, 28, 20, 48, 22, 14, 24, 10].map((w, j) => (
            <td key={j} className="px-4 py-4">
              <div className="h-3.5 bg-gray-100 rounded-full animate-pulse" style={{ width: `${w + Math.random() * 10}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export interface RefundTableProps {
  items: Refund[];
  isLoading: boolean;
  isFetching: boolean;
  onProcess: (refund: Refund) => void;
}

export default function RefundTable({ items, isLoading, isFetching, onProcess }: RefundTableProps) {
  const TH = "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap";

  return (
    <div className={cn("bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-opacity", isFetching && !isLoading && "opacity-60")}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              <th className={TH}>ID</th>
              <th className={TH}>Mã đơn</th>
              <th className={TH}>Số tiền</th>
              <th className={TH}>Lý do</th>
              <th className={TH}>Trạng thái</th>
              <th className={TH}>Admin</th>
              <th className={TH}>Ngày tạo</th>
              <th className={TH} />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton />
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <div className="p-4 bg-gray-50 rounded-2xl">
                      <RefreshCcw className="h-7 w-7 text-gray-200" />
                    </div>
                    <p className="text-sm text-gray-400">Không có yêu cầu hoàn tiền nào.</p>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((refund, idx) => (
                <tr key={refund.id} className={cn("border-b border-gray-50 last:border-0 transition-colors group", idx % 2 === 1 ? "bg-gray-50/30 hover:bg-sky-50/30" : "hover:bg-sky-50/20")}>
                  {/* ID */}
                  <td className="px-4 py-4">
                    <span className="text-[11px] font-mono text-gray-400">#{refund.id}</span>
                  </td>

                  {/* Order code */}
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center font-mono text-[11px] font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded-lg tracking-wide whitespace-nowrap">
                      {refund.orderCode}
                    </span>
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-4">
                    <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
                      {formatCurrency(refund.amount)}
                    </span>
                  </td>

                  {/* Reason */}
                  <td className="px-4 py-4 max-w-[220px]" title={refund.reason}>
                    <span className="text-sm text-gray-600">{truncate(refund.reason, 50)}</span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <RefundStatusBadge status={refund.status} />
                  </td>

                  {/* Admin ID */}
                  <td className="px-4 py-4">
                    <span className="text-xs font-mono text-gray-400">
                      {refund.adminId !== null ? `#${refund.adminId}` : "—"}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
                        {new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(refund.createdAt))}
                      </span>
                      <span className="text-[11px] text-gray-400 whitespace-nowrap">
                        {new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(refund.createdAt))}
                      </span>
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-4 py-4 text-right whitespace-nowrap">
                    {refund.status === "PENDING" ? (
                      <Button
                        size="sm"
                        onClick={() => onProcess(refund)}
                        className="h-7 px-3 text-xs bg-sky-600 hover:bg-sky-500 text-white shadow-sm"
                      >
                        <ArrowRight className="h-3 w-3 mr-1" />
                        Xử lý
                      </Button>
                    ) : (
                      <span className="text-gray-200 text-sm">—</span>
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
