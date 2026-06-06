"use client";

import { useState } from "react";
import { ShieldCheck, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
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
        <PaginationBar
          currentPage={page}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>
    </>
  );
}
