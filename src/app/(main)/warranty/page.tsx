"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  RefreshCw,
  FileX,
  Clock,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import WarrantyStatusBadge from "@/components/warranty/WarrantyStatusBadge";
import { useMyWarranties } from "@/hooks/useWarranty";
import useAuthStore from "@/store/useAuthStore";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

function formatDateOnly(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));
}

function truncate(str: string, max: number): string {
  return str.length <= max ? str : str.slice(0, max) + "…";
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <div className="flex items-start gap-4 px-5 py-4 animate-pulse">
      <div className="h-10 w-10 rounded-xl bg-gray-100 shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <div className="h-3.5 w-40 bg-gray-100 rounded-full" />
        <div className="h-3 w-56 bg-gray-100 rounded-full" />
        <div className="h-3 w-32 bg-gray-100 rounded-full" />
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <div className="h-5 w-24 bg-gray-100 rounded-full" />
        <div className="h-3 w-20 bg-gray-100 rounded-full" />
      </div>
    </div>
  );
}

// ─── Status icon color ────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: string }) {
  const styles: Record<string, string> = {
    OPEN: "bg-amber-50 border-amber-100 text-amber-500",
    IN_PROGRESS: "bg-sky-50 border-sky-100 text-sky-500",
    RESOLVED: "bg-emerald-50 border-emerald-100 text-emerald-500",
    PENDING_STOCK: "bg-violet-50 border-violet-100 text-violet-500",
  };
  return (
    <div className={cn(
      "h-10 w-10 rounded-xl border flex items-center justify-center shrink-0",
      styles[status] ?? styles.OPEN,
    )}>
      <ShieldCheck className="h-4.5 w-4.5" />
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
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2.5">
            <div className="p-2 bg-sky-50 rounded-xl">
              <ShieldCheck className="h-5 w-5 text-sky-600" />
            </div>
            Bảo hành của tôi
          </h1>
          <p className="text-sm text-gray-400 mt-1 ml-0.5">
            {!isLoading && data ? `${totalElements} yêu cầu bảo hành` : "Theo dõi các yêu cầu bảo hành của bạn."}
          </p>
        </div>
        {isFetching && !isLoading && (
          <RefreshCw className="h-4 w-4 text-sky-400 animate-spin" />
        )}
      </div>

      {/* List card */}
      <div className={cn(
        "rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden transition-opacity",
        isFetching && !isLoading && "opacity-60",
      )}>
        {isLoading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 5 }).map((_, i) => (
              <RowSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="p-4 bg-gray-50 rounded-2xl">
              <ShieldCheck className="h-7 w-7 text-gray-200" />
            </div>
            <p className="text-sm text-gray-400">Không thể tải dữ liệu bảo hành.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="border-gray-200">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Thử lại
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="p-4 bg-gray-50 rounded-2xl">
              <FileX className="h-7 w-7 text-gray-200" />
            </div>
            <p className="text-sm text-gray-400">Bạn chưa có yêu cầu bảo hành nào.</p>
            <p className="text-xs text-gray-400">
              Yêu cầu bảo hành được gửi từ trang chi tiết đơn hàng.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map((claim, idx) => (
              <div
                key={claim.id}
                className={cn(
                  "flex items-start gap-4 px-5 py-4 transition-colors",
                  idx % 2 === 1 ? "bg-gray-50/40 hover:bg-sky-50/40" : "hover:bg-sky-50/30",
                )}
              >
                {/* Status icon */}
                <StatusIcon status={claim.status} />

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800 truncate">
                      {claim.productName ?? "—"}
                    </span>
                    {claim.variantName && (
                      <span className="text-[11px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md shrink-0">
                        {claim.variantName}
                      </span>
                    )}
                  </div>

                  {claim.orderCode && (
                    <span className="inline-flex items-center gap-1.5 w-fit">
                      <Package className="h-3 w-3 text-gray-300" />
                      <span className="font-mono text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg tracking-wide">
                        {claim.orderCode}
                      </span>
                    </span>
                  )}

                  <p className="text-xs text-gray-400 leading-relaxed mt-0.5" title={claim.description}>
                    {truncate(claim.description, 80)}
                  </p>
                </div>

                {/* Right: status + date */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <WarrantyStatusBadge status={claim.status} />
                  <div className="flex items-center gap-1 text-right">
                    <Clock className="h-3 w-3 text-gray-300" />
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-medium text-gray-500">{formatTime(claim.createdAt)}</span>
                      <span className="text-[11px] text-gray-400">{formatDateOnly(claim.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalElements > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            Trang {page + 1} / {totalPages} · {totalElements} yêu cầu
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

// ─── Login redirect ────────────────────────────────────────────────────────────

function LoginRedirect() {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
      <div className="p-5 bg-sky-50 rounded-2xl">
        <ShieldCheck className="h-8 w-8 text-sky-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-700">Đăng nhập để xem bảo hành</p>
        <p className="text-xs text-gray-400 mt-1">Bạn cần đăng nhập để theo dõi yêu cầu bảo hành.</p>
      </div>
      <Button
        className="bg-sky-600 hover:bg-sky-500 text-white"
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
