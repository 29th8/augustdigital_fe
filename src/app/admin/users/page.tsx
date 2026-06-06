"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Users, RefreshCw } from "lucide-react";
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
        {data && data.totalElements > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Trang{" "}
              <span className="font-medium text-gray-700">{page + 1}</span>
              {" / "}
              <span className="font-medium text-gray-700">{totalPages}</span>
              <span className="text-gray-400">
                {" "}· {data.totalElements.toLocaleString()} người dùng
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
