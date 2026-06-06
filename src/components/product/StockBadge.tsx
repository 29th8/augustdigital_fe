"use client";

import { PackageX, AlertTriangle, CheckCircle2 } from "lucide-react";

interface StockBadgeProps {
  stock: number | undefined;
}

const LOW_STOCK_THRESHOLD = 5;

export function StockBadge({ stock }: StockBadgeProps) {
  // undefined/null = BE không trả stock info → mặc định hiện "Còn hàng"
  if (stock == null) {
    return (
      <div className="flex items-center gap-2 w-fit rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
        <span className="text-xs font-semibold text-emerald-700">Còn hàng</span>
      </div>
    );
  }

  if (stock === 0) {
    return (
      <div className="flex items-center gap-2 w-fit rounded-lg bg-red-50 border border-red-200 px-3 py-1.5">
        <PackageX className="h-3.5 w-3.5 text-red-500 shrink-0" />
        <span className="text-xs font-semibold text-red-600">Hết hàng</span>
      </div>
    );
  }

  if (stock <= LOW_STOCK_THRESHOLD) {
    return (
      <div className="flex items-center gap-2 w-fit rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
        <span className="text-xs font-semibold text-amber-700">Sắp hết · còn {stock}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 w-fit rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
      <span className="text-xs font-semibold text-emerald-700">Còn hàng</span>
    </div>
  );
}
