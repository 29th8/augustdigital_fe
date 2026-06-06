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
  { value: "PAID", label: "Đã thanh toán" },
  { value: "PROCESSING", label: "Đang xử lý" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "PARTIALLY_COMPLETED", label: "Hoàn thành một phần" },
  { value: "PAID_PENDING_STOCK", label: "Chờ nhập kho" },
  { value: "CANCELLED", label: "Đã hủy" },
  { value: "EXPIRED", label: "Hết hạn" },
];

const PAGE_SIZE = 10;

// ─── Skeleton ────────────────────────────────────────────────────────────────

function OrderRowSkeleton() {
  return (
    <div className="flex items-center justify-between px-5 py-4 animate-pulse">
      <div className="flex flex-col gap-2">
        <div className="h-3.5 w-36 bg-gray-100 rounded" />
        <div className="h-3 w-24 bg-gray-100 rounded" />
      </div>
      <div className="flex items-center gap-4">
        <div className="h-5 w-20 bg-gray-100 rounded-full" />
        <div className="h-3.5 w-24 bg-gray-100 rounded" />
        <div className="h-4 w-4 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

// ─── Date formatter ───────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
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
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Đơn hàng của tôi</h1>
          <p className="text-sm text-gray-500 mt-0.5">Theo dõi và quản lý tất cả đơn hàng.</p>
        </div>
        <div className="flex items-center gap-2">
          {isFetching && !isLoading && (
            <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLookup((v) => !v)}
            className={cn(showLookup && "bg-blue-50 border-blue-300 text-blue-700")}
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
            className="pl-9 bg-white"
          />
        </div>

        <Select
          value={status || "_all"}
          onValueChange={(v) => {
            setStatus(v === "_all" ? "" : (v as OrderStatus));
            setPage(0);
          }}
        >
          <SelectTrigger className="w-full sm:w-48 bg-white">
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
          <SelectTrigger className="w-full sm:w-40 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Mới nhất</SelectItem>
            <SelectItem value="oldest">Cũ nhất</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-gray-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <OrderRowSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <ShoppingBag
              className={cn(
                "h-10 w-10",
                isFetching ? "text-blue-300 animate-pulse" : "text-gray-300",
              )}
            />
            <p className="text-sm text-gray-500">Không thể tải đơn hàng.</p>
            {!isFetching && (
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Thử lại
              </Button>
            )}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <ShoppingBag className="h-10 w-10 text-gray-200" />
            <p className="text-sm text-gray-500">
              {debouncedKeyword || status
                ? "Không tìm thấy đơn hàng phù hợp."
                : "Bạn chưa có đơn hàng nào."}
            </p>
            {!debouncedKeyword && !status && (
              <Link href="/products">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white mt-1">
                  Mua sắm ngay
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 font-mono">
                      {order.orderCode}
                    </span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(order.createdAt)}</span>
                </div>

                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <span className="text-sm font-semibold text-gray-900">
                    {formatVND(order.totalAmount)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Trang {page + 1} / {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
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
