"use client";

interface StockBadgeProps {
  /** Backend-confirmed stock count. `undefined` = never checked (unknown). */
  stock: number | undefined;
}

const LOW_STOCK_THRESHOLD = 5;

/**
 * Displays a stock hint sourced from backend error responses.
 * Renders nothing when stock is unknown (never attempted an add-to-cart).
 */
export function StockBadge({ stock }: StockBadgeProps) {
  if (stock === undefined) return null;

  if (stock === 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">
        Hết hàng
      </span>
    );
  }

  if (stock <= LOW_STOCK_THRESHOLD) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        Sắp hết hàng (còn {stock})
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
      Còn hàng
    </span>
  );
}
