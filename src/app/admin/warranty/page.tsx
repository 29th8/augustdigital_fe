"use client";

import { useState } from "react";
import { ShieldCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import WarrantyFilters, {
  type WarrantyStatusFilter,
} from "@/components/admin/warranty/WarrantyFilters";
import WarrantyTable from "@/components/admin/warranty/WarrantyTable";
import WarrantyDetailDrawer from "@/components/admin/warranty/WarrantyDetailDrawer";
import { useAdminWarranties } from "@/hooks/useWarranty";
import type { WarrantyClaim } from "@/types/warranty";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminWarrantyPage() {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<WarrantyStatusFilter>("all");
  const [selectedClaim, setSelectedClaim] = useState<WarrantyClaim | null>(null);

  const { data, isLoading, isError, isFetching, refetch } = useAdminWarranties({
    page,
    size: PAGE_SIZE,
    status: statusFilter,
  });

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  function handleStatusChange(status: WarrantyStatusFilter) {
    setStatusFilter(status);
    setPage(0);
  }

  function handleDrawerClose() {
    setSelectedClaim(null);
  }

  function handleResolved() {
    // Keep drawer open to show updated state; invalidation happens in hook
  }

  return (
    <>
      {/* Detail drawer */}
      <WarrantyDetailDrawer
        claim={selectedClaim}
        onClose={handleDrawerClose}
        onResolved={handleResolved}
      />

      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-blue-600" />
              Quản lý bảo hành
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Xem xét và xử lý các yêu cầu bảo hành từ khách hàng.
            </p>
          </div>
          {isFetching && !isLoading && (
            <RefreshCw className="h-4 w-4 text-blue-400 animate-spin mt-1" />
          )}
        </div>

        {/* Filters */}
        <WarrantyFilters
          status={statusFilter}
          onStatusChange={handleStatusChange}
          onRefresh={() => refetch()}
          isRefreshing={isFetching}
        />

        {/* Error banner */}
        {isError && (
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">Không thể tải dữ liệu bảo hành.</p>
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
          <WarrantyTable
            items={items}
            isLoading={isLoading}
            onView={(claim) => setSelectedClaim(claim)}
          />
        )}

        {/* Pagination */}
        {totalElements > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Trang {page + 1} / {totalPages} &nbsp;&middot;&nbsp; {totalElements} yêu cầu
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
    </>
  );
}
