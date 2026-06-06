"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, RefreshCw, FileX } from "lucide-react";
import { Button } from "@/components/ui/button";
import WarrantyStatusBadge from "@/components/warranty/WarrantyStatusBadge";
import { useMyWarranties } from "@/hooks/useWarranty";
import useAuthStore from "@/store/useAuthStore";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="grid grid-cols-6 gap-4 px-5 py-4 animate-pulse">
          <div className="h-4 bg-gray-100 rounded col-span-2" />
          <div className="h-4 bg-gray-100 rounded" />
          <div className="h-4 bg-gray-100 rounded" />
          <div className="h-5 w-24 bg-gray-100 rounded-full" />
          <div className="h-4 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  );
}

// ─── Auth-required content ────────────────────────────────────────────────────

function WarrantyList() {
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, refetch, isFetching } = useMyWarranties({
    page,
    size: PAGE_SIZE,
  });

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-blue-600" />
            Bảo hành của tôi
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Theo dõi các yêu cầu bảo hành của bạn.
          </p>
        </div>
        {isFetching && !isLoading && (
          <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />
        )}
      </div>

      {/* Table card */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="hidden sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 border-b border-gray-100 px-5 py-3 bg-gray-50">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Sản phẩm
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Mã đơn
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Trạng thái
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 col-span-2">
            Mô tả
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Ngày tạo
          </span>
        </div>

        {isLoading ? (
          <TableSkeleton />
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <ShieldCheck className="h-10 w-10 text-gray-200" />
            <p className="text-sm text-gray-500">Không thể tải dữ liệu bảo hành.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Thử lại
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <FileX className="h-10 w-10 text-gray-200" />
            <p className="text-sm text-gray-500">Bạn chưa có yêu cầu bảo hành nào.</p>
            <p className="text-xs text-gray-400">
              Yêu cầu bảo hành được gửi từ trang chi tiết đơn hàng.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((claim) => (
              <div
                key={claim.id}
                className="flex flex-col sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-2 sm:gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                {/* Product */}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {claim.productName ?? "—"}
                  </span>
                  {claim.variantName && (
                    <span className="text-xs text-gray-400 truncate">{claim.variantName}</span>
                  )}
                </div>

                {/* Order code */}
                <span className="text-sm font-mono text-gray-600">
                  {claim.orderCode ?? "—"}
                </span>

                {/* Status */}
                <div>
                  <WarrantyStatusBadge status={claim.status} />
                </div>

                {/* Description */}
                <span
                  className={cn("text-sm text-gray-600 col-span-2 line-clamp-2")}
                  title={claim.description}
                >
                  {claim.description}
                </span>

                {/* Date */}
                <span className="text-xs text-gray-400">{formatDate(claim.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalElements > 0 && totalPages > 1 && (
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

// ─── Redirect guard ───────────────────────────────────────────────────────────

function LoginRedirect() {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <ShieldCheck className="h-12 w-12 text-gray-200" />
      <p className="text-sm text-gray-500">Vui lòng đăng nhập để xem bảo hành.</p>
      <Button
        className="bg-blue-600 hover:bg-blue-700 text-white"
        onClick={() => router.push("/auth/login")}
      >
        Đăng nhập
      </Button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WarrantyPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <LoginRedirect />;
  }

  return <WarrantyList />;
}
