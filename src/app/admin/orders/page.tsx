"use client";

import { Suspense, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AdminOrderDetailDrawer from "@/components/admin/orders/AdminOrderDetailDrawer";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import { useAdminOrders } from "@/hooks/useOrders";
import { formatVND } from "@/lib/formatVND";
import { cn } from "@/lib/utils";
import { getOrderStatusLabel } from "@/components/orders/OrderStatusBadge";
import type { OrderStatus, AdminOrderListItem, AdminOrderListParams } from "@/types/order";

// ─── Constants ────────────────────────────────────────────────────────────────

// ─── PaginationBar ────────────────────────────────────────────────────────────

function PaginationBar({
  currentPage,
  totalPages,
  totalElements,
  pageSize,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  const from = currentPage * pageSize + 1;
  const to = Math.min((currentPage + 1) * pageSize, totalElements);

  function getPages(): (number | "...")[] {
    const pages: (number | "...")[] = [];
    const left = currentPage - 1;
    const right = currentPage + 1;
    for (let i = 0; i < totalPages; i++) {
      if (i === 0 || i === totalPages - 1 || (i >= left && i <= right)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("...");
      }
    }
    return pages;
  }

  return (
    <div className="flex items-center justify-between px-1 py-3">
      <p className="text-xs text-gray-400">
        {from}–{to} / <span className="font-medium text-gray-600">{totalElements}</span> kết quả
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={currentPage === 0}
          onClick={() => onPageChange(currentPage - 1)}
          className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        {getPages().map((p, i) =>
          p === "..." ? (
            <span key={`e-${i}`} className="h-7 w-7 flex items-center justify-center text-xs text-gray-300">···</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p as number)}
              className={`h-7 w-7 flex items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                p === currentPage ? "bg-sky-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              }`}
            >
              {(p as number) + 1}
            </button>
          )
        )}
        <button
          type="button"
          disabled={currentPage >= totalPages - 1}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

const STATUS_OPTIONS: { value: OrderStatus | ""; label: string }[] = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "PENDING", label: "Chờ thanh toán" },
  { value: "PAID", label: "Đã thanh toán" },
  { value: "PROCESSING", label: "Đang xử lý" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "PARTIALLY_COMPLETED", label: "Hoàn thành một phần" },
  { value: "PAID_PENDING_STOCK", label: "Chờ nhập kho" },
  { value: "EXPIRED", label: "Hết hạn" },
];

const PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidDate(str: string): boolean {
  if (!str || !/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str);
  return !isNaN(d.getTime());
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatDisplayDate(iso: string): string {
  if (!isValidDate(iso)) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function exportCsv(rows: AdminOrderListItem[]) {
  const header = ["Mã đơn", "Email", "Số điện thoại", "Tổng tiền", "Trạng thái", "Ngày đặt"];
  const lines = rows.map((r) =>
    [
      r.orderCode,
      r.email,
      r.phone,
      r.totalAmount,
      getOrderStatusLabel(r.status),
      new Date(r.createdAt).toLocaleString("vi-VN"),
    ].join(","),
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: 6 }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-3 bg-gray-100 rounded w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function FilterBadge({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="flex items-center justify-center h-3.5 w-3.5 rounded-full hover:bg-blue-100 transition-colors"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

function DateInput({
  value,
  onChange,
  invalid,
  max,
  min,
}: {
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  max?: string;
  min?: string;
}) {
  return (
    <div className="relative shrink-0">
      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none z-10" />
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-9 pl-9 pr-3 w-40 rounded-md border text-sm bg-white",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0",
          "[color-scheme:light]",
          invalid
            ? "border-red-300 text-red-600"
            : "border-input text-gray-700 hover:border-gray-300",
        )}
      />
    </div>
  );
}

// ─── Inner component (uses useSearchParams — requires Suspense boundary) ──────

function AdminOrdersContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // URL is the single source of truth for all filter/pagination state.
  const statusParam = (searchParams.get("status") ?? "") as OrderStatus | "";
  const fromParam = searchParams.get("from") ?? "";
  const toParam = searchParams.get("to") ?? "";
  const keywordParam = searchParams.get("keyword") ?? "";
  const pageParam = Math.max(0, Number(searchParams.get("page") ?? "0"));

  // Local state ONLY for the keyword text input (debounced before URL write).
  const [keyword, setKeyword] = useState(keywordParam);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drawer is transient UI state — not URL-persisted.
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // Date range validation.
  const fromValid = fromParam === "" || isValidDate(fromParam);
  const toValid = toParam === "" || isValidDate(toParam);
  const dateRangeInvalid =
    fromValid && toValid && fromParam !== "" && toParam !== "" && fromParam > toParam;

  // Merge updates into current URL search params and replace (no history push).
  function updateParams(updates: Record<string, string>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    // Never push page=0 into the URL (keep URLs clean).
    if (next.get("page") === "0") next.delete("page");
    router.replace(`${pathname}?${next.toString()}`);
  }

  function handleKeywordChange(value: string) {
    setKeyword(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParams({ keyword: value, page: "" });
    }, 400);
  }

  function handleStatusChange(value: string) {
    updateParams({ status: value === "_all" ? "" : value, page: "" });
  }

  function handleFromChange(value: string) {
    updateParams({ from: value, page: "" });
  }

  function handleToChange(value: string) {
    updateParams({ to: value, page: "" });
  }

  function handleClearFilters() {
    setKeyword("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    router.replace(pathname);
  }

  const hasActiveFilters = !!(statusParam || fromParam || toParam || keywordParam);
  const activeFilterCount = [statusParam, fromParam, toParam, keywordParam].filter(Boolean).length;

  // Build API params. Dates are only forwarded when the range is valid
  // (or when only one side is set — backend handles open-ended ranges).
  const params: AdminOrderListParams = {
    page: pageParam,
    size: PAGE_SIZE,
    ...(statusParam && { status: statusParam }),
    ...(keywordParam && { keyword: keywordParam }),
    ...(!dateRangeInvalid && fromParam && { from: fromParam }),
    ...(!dateRangeInvalid && toParam && { to: toParam }),
  };

  const { data, isLoading, isFetching, isError, refetch } = useAdminOrders(params);

  const orders = data?.items ?? [];
  const pageInfo = data?.page_info;
  const totalPages = pageInfo?.total_pages ?? 0;
  const totalElements = pageInfo?.total_elements ?? 0;

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản lý đơn hàng</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {totalElements > 0
                ? `${totalElements.toLocaleString("vi-VN")} đơn hàng`
                : "Tất cả đơn hàng"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isFetching && !isLoading && (
              <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportCsv(orders)}
              disabled={orders.length === 0}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Xuất CSV
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Keyword search */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tìm mã đơn, email..."
                value={keyword}
                onChange={(e) => handleKeywordChange(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>

            {/* Status */}
            <Select value={statusParam || "_all"} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-52 bg-white shrink-0">
                <Filter className="h-3.5 w-3.5 text-gray-400 mr-1 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value || "_all"} value={opt.value || "_all"}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date range */}
            <div className="flex items-center gap-1.5 shrink-0">
              <DateInput
                value={fromParam}
                onChange={handleFromChange}
                invalid={dateRangeInvalid && fromParam !== ""}
                max={toParam || undefined}
              />
              <span className="text-gray-400 text-xs font-medium select-none">—</span>
              <DateInput
                value={toParam}
                onChange={handleToChange}
                invalid={dateRangeInvalid && toParam !== ""}
                min={fromParam || undefined}
              />
            </div>

            {/* Clear button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="shrink-0 h-9 text-gray-500 hover:text-gray-900 gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Xóa bộ lọc
                {activeFilterCount > 1 && (
                  <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 text-[10px] font-semibold text-gray-600">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            )}
          </div>

          {/* Date range error */}
          {dateRangeInvalid && (
            <p className="text-xs text-red-500">
              Ngày bắt đầu phải trước hoặc bằng ngày kết thúc. Bộ lọc ngày đang bị bỏ qua.
            </p>
          )}

          {/* Active filter badges */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-1.5">
              {statusParam && (
                <FilterBadge
                  label={
                    STATUS_OPTIONS.find((o) => o.value === statusParam)?.label ?? statusParam
                  }
                  onRemove={() => updateParams({ status: "", page: "" })}
                />
              )}
              {fromParam && !dateRangeInvalid && (
                <FilterBadge
                  label={`Từ ${formatDisplayDate(fromParam)}`}
                  onRemove={() => updateParams({ from: "", page: "" })}
                />
              )}
              {toParam && !dateRangeInvalid && (
                <FilterBadge
                  label={`Đến ${formatDisplayDate(toParam)}`}
                  onRemove={() => updateParams({ to: "", page: "" })}
                />
              )}
              {keywordParam && (
                <FilterBadge
                  label={`"${keywordParam}"`}
                  onRemove={() => {
                    setKeyword("");
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    updateParams({ keyword: "", page: "" });
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Table */}
        <div
          className={cn(
            "rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden transition-opacity",
            isFetching && !isLoading && "opacity-70",
          )}
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] table-fixed text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {(
                    [
                      { label: "Mã đơn", cls: "w-36" },
                      { label: "Khách hàng", cls: "" },
                      { label: "Tổng tiền", cls: "w-32" },
                      { label: "Trạng thái", cls: "w-44" },
                      { label: "Ngày đặt", cls: "w-40" },
                      { label: "", cls: "w-20" },
                    ] as { label: string; cls: string }[]
                  ).map(({ label, cls }) => (
                    <th
                      key={label || "__action"}
                      className={`${cls} px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide`}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <TableSkeleton />
                ) : isError ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <ShoppingBag
                          className={cn(
                            "h-8 w-8",
                            isFetching ? "text-blue-300 animate-pulse" : "text-gray-200",
                          )}
                        />
                        <p className="text-sm text-gray-500">Không thể tải đơn hàng.</p>
                        {!isFetching && (
                          <Button variant="outline" size="sm" onClick={() => refetch()}>
                            Thử lại
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <ShoppingBag className="h-8 w-8 text-gray-200" />
                        <p className="text-sm text-gray-400">
                          {hasActiveFilters
                            ? "Không tìm thấy đơn hàng nào phù hợp."
                            : "Không có đơn hàng nào."}
                        </p>
                        {hasActiveFilters && (
                          <Button variant="outline" size="sm" onClick={handleClearFilters}>
                            Xóa bộ lọc
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedOrderId(order.id)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-gray-900 whitespace-nowrap">
                          {order.orderCode}
                        </span>
                      </td>
                      <td className="px-4 py-3 min-w-0">
                        <span className="text-sm text-gray-700 truncate block">{order.email}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                          {formatVND(order.totalAmount)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {formatDate(order.createdAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrderId(order.id);
                          }}
                        >
                          Chi tiết
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <PaginationBar
          currentPage={pageParam}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={PAGE_SIZE}
          onPageChange={(p) => updateParams({ page: String(p) })}
        />
      </div>

      <AdminOrderDetailDrawer
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
      />
    </>
  );
}

// ─── Page (Suspense boundary required for useSearchParams in App Router) ──────

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-8 w-52 bg-gray-100 rounded" />
      <div className="flex gap-2">
        <div className="flex-1 h-9 bg-gray-100 rounded-md" />
        <div className="w-52 h-9 bg-gray-100 rounded-md" />
        <div className="w-40 h-9 bg-gray-100 rounded-md" />
        <div className="w-40 h-9 bg-gray-100 rounded-md" />
      </div>
      <div className="h-96 bg-gray-100 rounded-xl" />
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminOrdersContent />
    </Suspense>
  );
}
