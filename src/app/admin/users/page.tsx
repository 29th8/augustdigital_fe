"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Users, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserStatsCards } from "@/components/admin/users/UserStatsCards";
import { UserFilters } from "@/components/admin/users/UserFilters";
import { UserTable } from "@/components/admin/users/UserTable";
import { UserRoleDialog } from "@/components/admin/users/UserRoleDialog";
import { UserDeleteDialog } from "@/components/admin/users/UserDeleteDialog";
import { useUsers, useUserStats } from "@/hooks/useUsers";
import type { User, UserListParams } from "@/types/user";

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
const DEBOUNCE_MS = 350;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  // ── Filter / pagination state ─────────────────────────────────────────────
  const [page, setPage] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "locked">("all");

  // ── Dialog state ──────────────────────────────────────────────────────────
  const [roleTarget, setRoleTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  // ── Debounce keyword ──────────────────────────────────────────────────────
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleKeywordChange = useCallback((value: string) => {
    setKeyword(value);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedKeyword(value);
      setPage(0);
    }, DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  // ── Query params ──────────────────────────────────────────────────────────
  const listParams: UserListParams = {
    page,
    size: PAGE_SIZE,
    ...(debouncedKeyword && { keyword: debouncedKeyword }),
    ...(statusFilter === "active" && { active: true }),
    ...(statusFilter === "locked" && { active: false }),
  };

  const { data, isLoading, isFetching, isError, refetch } = useUsers(listParams);
  const stats = useUserStats();

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;

  const hasFilters = !!debouncedKeyword || statusFilter !== "all";

  // ── Handlers ──────────────────────────────────────────────────────────────

  function clearFilters() {
    setKeyword("");
    setDebouncedKeyword("");
    setStatusFilter("all");
    setPage(0);
  }

  return (
    <>
      {/* Dialogs */}
      <UserRoleDialog
        open={!!roleTarget}
        user={roleTarget}
        onClose={() => setRoleTarget(null)}
      />

      <UserDeleteDialog
        open={!!deleteTarget}
        user={deleteTarget}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Page */}
      <div className="flex flex-col gap-6 p-6 max-w-[1400px] mx-auto">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-gray-900">
              <Users className="h-6 w-6 text-blue-600 shrink-0" />
              Quản lý người dùng
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Xem và quản lý tài khoản người dùng trong hệ thống.
            </p>
          </div>
        </div>

        {/* ── Stats cards ── */}
        <UserStatsCards
          total={stats.total}
          active={stats.active}
          locked={stats.locked}
          isLoading={stats.isLoading}
        />

        {/* ── Filters ── */}
        <UserFilters
          keyword={keyword}
          onKeywordChange={handleKeywordChange}
          statusFilter={statusFilter}
          onStatusFilterChange={(v) => {
            setStatusFilter(v);
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
            <p className="text-sm text-red-700">Không thể tải danh sách người dùng.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Thử lại
            </Button>
          </div>
        )}

        {/* ── Table ── */}
        <UserTable
          items={items}
          isLoading={isLoading}
          isFetching={isFetching}
          hasFilters={hasFilters}
          onRoleChange={(u) => setRoleTarget(u)}
          onDelete={(u) => setDeleteTarget(u)}
          onClearFilters={clearFilters}
        />

        {/* ── Pagination ── */}
        <PaginationBar
          currentPage={page}
          totalPages={totalPages}
          totalElements={data?.totalElements ?? 0}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </div>
    </>
  );
}
