"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Search,
  ChevronRight,
  RefreshCw,
  Filter,
  SearchX,
  Package,
  Clock,
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
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import OrderLookupForm from "@/components/orders/OrderLookupForm";
import { useUserOrders } from "@/hooks/useOrders";
import { useOrderLookup } from "@/hooks/useOrderLookup";
import { formatVND } from "@/lib/formatVND";
import { cn } from "@/lib/utils";
import useAuthStore from "@/store/useAuthStore";
import type { OrderStatus, UserOrderListParams } from "@/types/order";
import type { LookupFormValues } from "@/components/orders/OrderLookupForm";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: OrderStatus | ""; label: string }[] = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "PENDING", label: "Chờ thanh toán" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "PAID_PENDING_STOCK", label: "Chờ nhập kho" },
  { value: "EXPIRED", label: "Hết hạn" },
];

const PAGE_SIZE = 10;

// ─── Skeleton ────────────────────────────────────────────────────────────────

function OrderRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 animate-pulse">
      <div className="h-10 w-10 rounded-xl bg-gray-100 shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <div className="h-3.5 w-44 bg-gray-100 rounded-full" />
        <div className="h-3 w-28 bg-gray-100 rounded-full" />
      </div>
      <div className="flex flex-col items-end gap-2">
        <div className="h-3.5 w-20 bg-gray-100 rounded-full" />
        <div className="h-5 w-24 bg-gray-100 rounded-full" />
      </div>
    </div>
  );
}

// ─── Date formatters ──────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

function formatDateOnly(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));
}

// ─── Error message helper ─────────────────────────────────────────────────────

function getLookupErrorMessage(err: unknown): string {
  if (!err) return "";
  const apiErr = err as { code?: number; message?: string };
  if (apiErr.code === 404) return "Không tìm thấy đơn hàng với mã này.";
  if (apiErr.code === 400) return "Email không khớp với đơn hàng. Vui lòng kiểm tra lại.";
  return apiErr.message ?? "Không thể tra cứu đơn hàng. Vui lòng thử lại.";
}

// ─── Guest lookup section ─────────────────────────────────────────────────────

function GuestLookupPage() {
  const router = useRouter();
  const [lookupParams, setLookupParams] = useState<{
    orderCode: string;
    email: string;
  } | null>(null);

  const { isLoading, isError, error, isSuccess, data } = useOrderLookup(lookupParams);

  useEffect(() => {
    if (isSuccess && data) {
      router.push(
        `/orders/${encodeURIComponent(data.orderCode)}?email=${encodeURIComponent(data.email)}`,
      );
    }
  }, [isSuccess, data, router]);

  function handleSubmit(values: LookupFormValues) {
    setLookupParams({ orderCode: values.orderCode, email: values.email });
  }

  const errorMessage = isError ? getLookupErrorMessage(error) : null;

  return (
    <div className="min-h-[calc(100vh-200px)] flex flex-col items-center justify-center px-4 py-12">
      {/* Subtle background accent */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-blue-50/40 to-transparent pointer-events-none" />

      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-8 py-8">
          <OrderLookupForm
            onSubmit={handleSubmit}
            isLoading={isLoading}
            error={errorMessage}
          />
        </div>

        {/* Auth link */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Đã có tài khoản?{" "}
          <Link
            href="/auth/login"
            className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Đăng nhập →
          </Link>
        </p>
      </div>
    </div>
  );
}

// ─── Inline lookup panel (for authenticated users) ────────────────────────────

function InlineLookupPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [lookupParams, setLookupParams] = useState<{
    orderCode: string;
    email: string;
  } | null>(null);

  const { isLoading, isError, error, isSuccess, data } = useOrderLookup(lookupParams);

  useEffect(() => {
    if (isSuccess && data) {
      router.push(
        `/orders/${encodeURIComponent(data.orderCode)}?email=${encodeURIComponent(data.email)}`,
      );
    }
  }, [isSuccess, data, router]);

  function handleSubmit(values: LookupFormValues) {
    setLookupParams({ orderCode: values.orderCode, email: values.email });
  }

  const errorMessage = isError ? getLookupErrorMessage(error) : null;

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Tra cứu đơn hàng khách</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Đóng
        </button>
      </div>
      <OrderLookupForm
        onSubmit={handleSubmit}
        isLoading={isLoading}
        error={errorMessage}
      />
    </div>
  );
}

// ─── Auth order list ──────────────────────────────────────────────────────────

function AuthOrderList() {
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [page, setPage] = useState(0);
  const [showLookup, setShowLookup] = useState(false);

  // Debounce keyword input
  const handleKeywordChange = (value: string) => {
    setKeyword(value);
    clearTimeout((handleKeywordChange as unknown as { _t: ReturnType<typeof setTimeout> })._t);
    (handleKeywordChange as unknown as { _t: ReturnType<typeof setTimeout> })._t = setTimeout(
      () => {
        setDebouncedKeyword(value);
        setPage(0);
      },
      400,
    );
  };

  const params: UserOrderListParams = {
    page,
    size: PAGE_SIZE,
    sort,
    ...(status && { status }),
    ...(debouncedKeyword && { keyword: debouncedKeyword }),
  };

  const { data, isLoading, isFetching, isError, refetch } = useUserOrders(params);

  const orders = data?.items ?? [];
  const pageInfo = data?.page_info;
  const totalPages = pageInfo?.total_pages ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2.5">
            <div className="p-2 bg-sky-50 rounded-xl">
              <ShoppingBag className="h-5 w-5 text-sky-600" />
            </div>
            Đơn hàng của tôi
          </h1>
          <p className="text-sm text-gray-400 mt-1 ml-0.5">
            {pageInfo ? `${pageInfo.total_elements ?? 0} đơn hàng` : "Theo dõi và quản lý tất cả đơn hàng."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isFetching && !isLoading && (
            <RefreshCw className="h-4 w-4 text-sky-400 animate-spin" />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLookup((v) => !v)}
            className={cn(
              "h-9 px-3 border-gray-200 text-gray-600 transition-colors",
              showLookup
                ? "bg-sky-50 border-sky-200 text-sky-700"
                : "hover:bg-sky-50 hover:border-sky-200 hover:text-sky-700",
            )}
          >
            <SearchX className="h-3.5 w-3.5 mr-1.5" />
            Tra cứu đơn
          </Button>
        </div>
      </div>

      {/* Inline lookup panel */}
      {showLookup && (
        <InlineLookupPanel onClose={() => setShowLookup(false)} />
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Tìm mã đơn hàng..."
            value={keyword}
            onChange={(e) => handleKeywordChange(e.target.value)}
            className="pl-9 bg-white border-gray-200 focus-visible:ring-sky-500/30 focus-visible:border-sky-400"
          />
        </div>

        <Select
          value={status || "_all"}
          onValueChange={(v) => {
            setStatus(v === "_all" ? "" : (v as OrderStatus));
            setPage(0);
          }}
        >
          <SelectTrigger className="w-full sm:w-48 bg-white border-gray-200">
            <Filter className="h-3.5 w-3.5 text-gray-400 mr-1" />
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

        <Select
          value={sort}
          onValueChange={(v) => setSort(v as "newest" | "oldest")}
        >
          <SelectTrigger className="w-full sm:w-40 bg-white border-gray-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Mới nhất</SelectItem>
            <SelectItem value="oldest">Cũ nhất</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className={cn(
        "rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden transition-opacity",
        isFetching && !isLoading && "opacity-60",
      )}>
        {isLoading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 5 }).map((_, i) => (
              <OrderRowSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="p-4 bg-gray-50 rounded-2xl">
              <ShoppingBag className="h-7 w-7 text-gray-200" />
            </div>
            <p className="text-sm text-gray-400">Không thể tải đơn hàng.</p>
            {!isFetching && (
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Thử lại
              </Button>
            )}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="p-4 bg-gray-50 rounded-2xl">
              <ShoppingBag className="h-7 w-7 text-gray-200" />
            </div>
            <p className="text-sm text-gray-400">
              {debouncedKeyword || status
                ? "Không tìm thấy đơn hàng phù hợp."
                : "Bạn chưa có đơn hàng nào."}
            </p>
            {!debouncedKeyword && !status && (
              <Link href="/products">
                <Button size="sm" className="bg-sky-600 hover:bg-sky-500 text-white mt-1">
                  Mua sắm ngay
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {orders.map((order, idx) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className={cn(
                  "flex items-center gap-4 px-5 py-4 transition-colors group",
                  idx % 2 === 1 ? "bg-gray-50/40 hover:bg-sky-50/50" : "hover:bg-sky-50/30",
                )}
              >
                {/* Icon */}
                <div className="shrink-0 h-10 w-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center">
                  <Package className="h-4.5 w-4.5 text-sky-500" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center font-mono text-[12px] font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-lg tracking-wide">
                      {order.orderCode}
                    </span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Clock className="h-3 w-3 text-gray-300" />
                    <span className="text-xs font-medium text-gray-500">
                      {formatTime(order.createdAt)}
                    </span>
                    <span className="text-gray-300">·</span>
                    <span className="text-xs text-gray-400">
                      {formatDateOnly(order.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Amount + arrow */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">Tổng tiền</p>
                    <p className={cn(
                      "text-sm font-bold",
                      order.totalAmount > 0 ? "text-gray-900" : "text-gray-400",
                    )}>
                      {formatVND(order.totalAmount)}
                    </p>
                  </div>
                  <div className="h-7 w-7 rounded-lg bg-gray-100 group-hover:bg-sky-100 flex items-center justify-center transition-colors">
                    <ChevronRight className="h-3.5 w-3.5 text-gray-400 group-hover:text-sky-600 transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Trang {page + 1} / {totalPages}
            {pageInfo?.total_elements ? ` · ${pageInfo.total_elements} đơn` : ""}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="border-gray-200 hover:bg-sky-50 hover:border-sky-200 hover:text-sky-700"
            >
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="border-gray-200 hover:bg-sky-50 hover:border-sky-200 hover:text-sky-700"
            >
              Tiếp
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <GuestLookupPage />;
  }

  return <AuthOrderList />;
}
