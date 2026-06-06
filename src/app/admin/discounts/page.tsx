"use client";

import { useState, useCallback } from "react";
import { Plus, RefreshCw, Ticket, Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";
import { DiscountFormDialog } from "@/components/admin/discounts/DiscountFormDialog";
import { DiscountDeleteDialog } from "@/components/admin/discounts/DiscountDeleteDialog";
import { DiscountTable } from "@/components/admin/discounts/DiscountTable";
import { DiscountFilters } from "@/components/admin/discounts/DiscountFilters";
import { DiscountStatsCards } from "@/components/admin/discounts/DiscountStatsCards";
import {
  useDiscounts,
  useDiscountStats,
  useDiscountMutations,
} from "@/hooks/useDiscounts";
import { getDiscountStatus } from "@/types/discount";
import type { DiscountCode, DiscountListParams, DiscountStatus } from "@/types/discount";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

// ─── XLSX export ──────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Hoạt động",
  EXPIRED: "Hết hạn",
  DISABLED: "Đã tắt",
  FULLY_USED: "Đã dùng hết",
};

function formatExportValue(type: DiscountCode["type"], value: number): string {
  if (type === "PERCENT") return `${value}%`;
  return new Intl.NumberFormat("vi-VN").format(value) + " đ";
}

function formatExportDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

function exportToXLSX(items: DiscountCode[]) {
  const rows = items.map((d) => ({
    "Mã": d.code,
    "Loại": d.type === "PERCENT" ? "Phần trăm" : "Số tiền",
    "Giá trị": formatExportValue(d.type, d.value),
    "Đã dùng": d.usedCount,
    "Tổng": d.usageLimit,
    "Còn lại": d.remainingUses,
    "Trạng thái": STATUS_LABEL[getDiscountStatus(d)] ?? getDiscountStatus(d),
    "Hết hạn": formatExportDate(d.expiredAt),
    "Tạo lúc": formatExportDate(d.createdAt),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Fixed column widths (characters)
  worksheet["!cols"] = [
    { wch: 20 }, // Mã
    { wch: 14 }, // Loại
    { wch: 16 }, // Giá trị
    { wch: 10 }, // Đã dùng
    { wch: 8  }, // Tổng
    { wch: 10 }, // Còn lại
    { wch: 14 }, // Trạng thái
    { wch: 18 }, // Hết hạn
    { wch: 16 }, // Tạo lúc
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Discount Codes");

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const filename = `discount-codes-${new Date().toISOString().slice(0, 10)}.xlsx`;
  saveAs(blob, filename);
  toast.success("Đã xuất file Excel thành công.");
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDiscountsPage() {
  // ── Filter / pagination state ─────────────────────────────────────────────
  const [page, setPage] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired" | "disabled">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "PERCENT" | "FIXED">("all");

  // ── Dialog state ──────────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<DiscountCode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DiscountCode | null>(null);

  // ── Debounce keyword ──────────────────────────────────────────────────────
  const handleKeywordChange = useCallback((value: string) => {
    setKeyword(value);
    clearTimeout((handleKeywordChange as unknown as { _t: ReturnType<typeof setTimeout> })._t);
    (handleKeywordChange as unknown as { _t: ReturnType<typeof setTimeout> })._t = setTimeout(
      () => {
        setDebouncedKeyword(value);
        setPage(0);
      },
      350,
    );
  }, []);

  // ── Query params ──────────────────────────────────────────────────────────
  // type + keyword + isActive(active/disabled) → server-side.
  // status=expired → no isActive filter (fetch all, filter client-side for expiry).
  const listParams: DiscountListParams = {
    page,
    size: PAGE_SIZE,
    ...(debouncedKeyword && { keyword: debouncedKeyword }),
    ...(typeFilter !== "all" && { type: typeFilter }),
    ...(statusFilter === "active" && { isActive: true }),
    ...(statusFilter === "disabled" && { isActive: false }),
  };

  const { data, isLoading, isFetching, isError, refetch } = useDiscounts(listParams);
  const stats = useDiscountStats();
  const { deletingId } = useDiscountMutations();

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;

  const hasFilters = !!debouncedKeyword || statusFilter !== "all" || typeFilter !== "all";

  // Client-side status filter only — needed because "expired" has no server-side equivalent.
  // type and keyword are already filtered server-side.
  const filteredItems =
    statusFilter === "all"
      ? items
      : items.filter((d) => getDiscountStatus(d) === (statusFilter.toUpperCase() as DiscountStatus));

  // ── Handlers ──────────────────────────────────────────────────────────────

  function openCreate() {
    setEditTarget(null);
    setFormOpen(true);
  }

  function openEdit(d: DiscountCode) {
    setEditTarget(d);
    setFormOpen(true);
  }

  function openDelete(d: DiscountCode) {
    setDeleteTarget(d);
  }

  /** Duplicate: open create form pre-filled with same values but code + "_COPY" */
  function openDuplicate(d: DiscountCode) {
    setEditTarget({
      ...d,
      id: -1, // sentinel → create mode in dialog
      code: d.code + "_COPY",
      usedCount: 0,
      remainingUses: d.usageLimit,
    });
    setFormOpen(true);
  }

  function clearFilters() {
    setKeyword("");
    setDebouncedKeyword("");
    setStatusFilter("all");
    setTypeFilter("all");
    setPage(0);
  }

  return (
    <>
      {/* Dialogs */}
      <DiscountFormDialog
        key={editTarget ? `edit-${editTarget.id}` : "create"}
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditTarget(null);
        }}
        initialData={editTarget ?? undefined}
      />

      <DiscountDeleteDialog
        open={!!deleteTarget}
        discount={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Page */}
      <div className="flex flex-col gap-6 p-6 max-w-[1400px] mx-auto">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-gray-900">
              <Ticket className="h-6 w-6 text-cyan-600 shrink-0" />
              Mã giảm giá
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Tạo và quản lý các voucher khuyến mãi cho khách hàng.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Export CSV */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportToXLSX(filteredItems)}
              disabled={filteredItems.length === 0}
              className="hidden sm:flex"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Xuất Excel
            </Button>

            {/* Create */}
            <Button
              onClick={openCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Tạo mã mới</span>
              <span className="sm:hidden">Tạo</span>
            </Button>
          </div>
        </div>

        {/* ── Stats cards ── */}
        <DiscountStatsCards
          total={stats.total}
          active={stats.active}
          expired={stats.expired}
          disabled={stats.disabled}
          isLoading={stats.isLoading}
        />

        {/* ── Filters ── */}
        <DiscountFilters
          keyword={keyword}
          onKeywordChange={handleKeywordChange}
          statusFilter={statusFilter}
          onStatusFilterChange={(v) => {
            setStatusFilter(v);
            setPage(0);
          }}
          typeFilter={typeFilter}
          onTypeFilterChange={(v) => {
            setTypeFilter(v);
            setPage(0);
          }}
          isFetching={isFetching}
          onRefresh={() => refetch()}
          onClearFilters={clearFilters}
          hasActiveFilters={hasFilters}
        />

        {/* ── Error banner ── */}
        {isError && !isLoading && (
          <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">Không thể tải danh sách mã giảm giá.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Thử lại
            </Button>
          </div>
        )}

        {/* ── Table ── */}
        <DiscountTable
          items={filteredItems}
          isLoading={isLoading}
          isFetching={isFetching}
          hasFilters={hasFilters}
          onEdit={openEdit}
          onDelete={openDelete}
          onDuplicate={openDuplicate}
          onClearFilters={clearFilters}
          onCreateNew={openCreate}
          deletingId={deletingId ?? null}
        />

        {/* ── Pagination ── */}
        {data && data.totalElements > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Trang{" "}
              <span className="font-medium text-gray-700">{page + 1}</span>
              {" / "}
              <span className="font-medium text-gray-700">{totalPages}</span>
              <span className="text-gray-400">
                {" "}· {data.totalElements.toLocaleString()} mã
              </span>
            </p>

            {totalPages > 1 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0 || isFetching}
                  onClick={() => setPage((p) => p - 1)}
                >
                  ← Trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages - 1 || isFetching}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Tiếp →
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
