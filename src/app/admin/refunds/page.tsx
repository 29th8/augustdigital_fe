"use client";

import { useState } from "react";
import { RefreshCcw, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import RefundFilters from "@/components/admin/refunds/RefundFilters";
import RefundTable from "@/components/admin/refunds/RefundTable";
import RefundCreateDialog from "@/components/admin/refunds/RefundCreateDialog";
import RefundProcessDialog from "@/components/admin/refunds/RefundProcessDialog";
import { useAdminRefunds } from "@/hooks/useRefunds";
import type { Refund, RefundStatus } from "@/types/refund";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

// ─── Stats card ───────────────────────────────────────────────────────────────

interface StatsCardProps {
  label: string;
  value: string | number;
  sub?: string;
}

function StatsCard({ label, value, sub }: StatsCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1.5 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminRefundsPage() {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<"all" | RefundStatus>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [processTarget, setProcessTarget] = useState<Refund | null>(null);

  const { data, isLoading, isError, isFetching, refetch } = useAdminRefunds({
    page,
    size: PAGE_SIZE,
    status: statusFilter,
  });

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  // Compute stats from current page items
  const pendingCount = items.filter((r) => r.status === "PENDING").length;
  const processedCount = items.filter((r) => r.status === "PROCESSED").length;
  const pendingTotal = items
    .filter((r) => r.status === "PENDING")
    .reduce((acc, r) => acc + r.amount, 0);

  function handleStatusChange(status: "all" | RefundStatus) {
    setStatusFilter(status);
    setPage(0);
  }

  function handleProcessClose() {
    setProcessTarget(null);
  }

  return (
    <>
      {/* Dialogs */}
      <RefundCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <RefundProcessDialog
        open={processTarget !== null}
        onClose={handleProcessClose}
        refund={processTarget}
      />

      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <RefreshCcw className="h-6 w-6 text-blue-600" />
              Quản lý hoàn tiền
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Xem xét và xử lý các yêu cầu hoàn tiền từ khách hàng.
            </p>
          </div>
          {isFetching && !isLoading && (
            <RefreshCw className="h-4 w-4 text-blue-400 animate-spin mt-1" />
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatsCard
            label="Tổng yêu cầu"
            value={totalElements}
            sub="trên toàn hệ thống"
          />
          <StatsCard
            label="Chờ xử lý (trang này)"
            value={pendingCount}
            sub={pendingTotal > 0 ? `Tổng: ${formatCurrency(pendingTotal)}` : undefined}
          />
          <StatsCard
            label="Đã hoàn tiền (trang này)"
            value={processedCount}
          />
        </div>

        {/* Filters */}
        <RefundFilters
          statusFilter={statusFilter}
          onStatusFilterChange={handleStatusChange}
          isFetching={isFetching}
          onRefresh={() => refetch()}
          onCreateNew={() => setCreateOpen(true)}
        />

        {/* Error banner */}
        {isError && (
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">Không thể tải dữ liệu hoàn tiền.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="border-red-200 text-red-600 hover:bg-red-100"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Thử lại
            </Button>
          </div>
        )}

        {/* Table */}
        {!isError && (
          <RefundTable
            items={items}
            isLoading={isLoading}
            isFetching={isFetching}
            onProcess={(refund) => setProcessTarget(refund)}
          />
        )}

        {/* Pagination */}
        {totalElements > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Trang {page + 1}
              {totalPages > 1 ? ` / ${totalPages}` : ""}{" "}
              &nbsp;&middot;&nbsp; {totalElements} yêu cầu
            </p>
            {totalPages > 1 && (
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
            )}
          </div>
        )}
      </div>
    </>
  );
}
