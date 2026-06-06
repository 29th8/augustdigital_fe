"use client";

import { Loader2, Eye, ShieldCheck, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import WarrantyStatusBadge from "@/components/warranty/WarrantyStatusBadge";
import type { WarrantyClaim } from "@/types/warranty";
import { cn } from "@/lib/utils";

function truncate(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max) + "…";
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-gray-50 last:border-0" style={{ opacity: 1 - i * 0.12 }}>
          {[10, 28, 22, 32, 44, 20, 24, 14].map((w, j) => (
            <td key={j} className="px-4 py-4">
              <div className="h-3.5 bg-gray-100 rounded-full animate-pulse" style={{ width: `${w + Math.random() * 10}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export interface WarrantyTableProps {
  items: WarrantyClaim[];
  isLoading: boolean;
  onView: (claim: WarrantyClaim) => void;
  resolvingId?: number | null;
}

export default function WarrantyTable({ items, isLoading, onView, resolvingId }: WarrantyTableProps) {
  const TH = "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              <th className={TH}>ID</th>
              <th className={TH}>Sản phẩm</th>
              <th className={TH}>Mã đơn</th>
              <th className={TH}>Email khách</th>
              <th className={TH}>Mô tả</th>
              <th className={TH}>Trạng thái</th>
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
                      <ShieldCheck className="h-7 w-7 text-gray-200" />
                    </div>
                    <p className="text-sm text-gray-400">Không có yêu cầu bảo hành nào.</p>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((claim, idx) => {
                const isResolving = resolvingId === claim.id;
                return (
                  <tr
                    key={claim.id}
                    className={cn(
                      "border-b border-gray-50 last:border-0 transition-colors",
                      isResolving && "opacity-60",
                      idx % 2 === 1 ? "bg-gray-50/30 hover:bg-sky-50/30" : "hover:bg-sky-50/20",
                    )}
                  >
                    {/* ID */}
                    <td className="px-4 py-4">
                      <span className="text-[11px] font-mono text-gray-400">#{claim.id}</span>
                    </td>

                    {/* Product */}
                    <td className="px-4 py-4 max-w-[160px]">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-gray-800 truncate text-sm">{claim.productName ?? "—"}</span>
                        {claim.variantName && (
                          <span className="text-[11px] text-gray-400 truncate">{claim.variantName}</span>
                        )}
                      </div>
                    </td>

                    {/* Order code */}
                    <td className="px-4 py-4">
                      {claim.orderCode ? (
                        <span className="inline-flex items-center font-mono text-[11px] font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded-lg tracking-wide whitespace-nowrap">
                          {claim.orderCode}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    {/* Email */}
                    <td className="px-4 py-4 max-w-[180px]">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                          <Mail className="h-2.5 w-2.5 text-sky-500" />
                        </div>
                        <span className="text-sm text-gray-700 truncate">{claim.userEmail}</span>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="px-4 py-4 max-w-[220px]" title={claim.description}>
                      <span className="text-sm text-gray-600">{truncate(claim.description, 60)}</span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <WarrantyStatusBadge status={claim.status} />
                    </td>

                    {/* Date */}
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
                          {new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(claim.createdAt))}
                        </span>
                        <span className="text-[11px] text-gray-400 whitespace-nowrap">
                          {new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(claim.createdAt))}
                        </span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onView(claim)}
                        disabled={isResolving}
                        className="h-7 px-3 text-xs border-gray-200 text-gray-500 hover:text-sky-700 hover:border-sky-200 hover:bg-sky-50 transition-colors"
                      >
                        {isResolving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            Xem
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
