"use client";

import {
  Lock,
  Unlock,
  UserCog,
  Trash2,
  MoreHorizontal,
  Loader2,
  Users,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToggleUserLock } from "@/hooks/useUsers";
import { cn } from "@/lib/utils";
import type { User } from "@/types/user";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserTableProps {
  items: User[];
  isLoading: boolean;
  isFetching?: boolean;
  hasFilters: boolean;
  onRoleChange: (u: User) => void;
  onDelete: (u: User) => void;
  onClearFilters: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso));
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: User["role"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        role === "ADMIN"
          ? "bg-blue-100 text-blue-700 ring-1 ring-inset ring-blue-200"
          : "bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-200",
      )}
    >
      {role === "ADMIN" ? "Quản trị viên" : "Khách hàng"}
    </span>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        isActive
          ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200"
          : "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          isActive ? "bg-green-500" : "bg-red-500",
        )}
      />
      {isActive ? "Hoạt động" : "Bị khoá"}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-gray-100">
          {[48, 20, 20, 24, 20].map((w, j) => (
            <td key={j} className="px-4 py-3.5">
              <div
                className="h-4 bg-gray-100 rounded animate-pulse"
                style={{ width: `${w * 4}px` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  hasFilters,
  onClearFilters,
}: {
  hasFilters: boolean;
  onClearFilters: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      {hasFilters ? (
        <>
          <UserX className="h-10 w-10 text-gray-200" />
          <p className="text-sm text-gray-500">Không tìm thấy người dùng phù hợp.</p>
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            Xóa bộ lọc
          </Button>
        </>
      ) : (
        <>
          <Users className="h-10 w-10 text-gray-200" />
          <p className="text-sm text-gray-500">Chưa có người dùng nào.</p>
        </>
      )}
    </div>
  );
}

// ─── Row actions ──────────────────────────────────────────────────────────────

function RowActions({
  user,
  onRoleChange,
  onDelete,
}: {
  user: User;
  onRoleChange: (u: User) => void;
  onDelete: (u: User) => void;
}) {
  const toggleLockMutation = useToggleUserLock();
  const isToggling =
    toggleLockMutation.isPending &&
    toggleLockMutation.variables?.id === user.id;

  function handleToggleLock() {
    toggleLockMutation.mutate({ id: user.id, isCurrentlyActive: user.isActive });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {/* Lock / Unlock inline button */}
      <button
        type="button"
        title={user.isActive ? "Khoá tài khoản" : "Mở khoá tài khoản"}
        onClick={handleToggleLock}
        disabled={isToggling}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
          user.isActive
            ? "text-gray-400 hover:bg-red-50 hover:text-red-600"
            : "text-gray-400 hover:bg-green-50 hover:text-green-600",
        )}
      >
        {isToggling ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : user.isActive ? (
          <Lock className="h-3.5 w-3.5" />
        ) : (
          <Unlock className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Change role button */}
      <button
        type="button"
        title="Đổi quyền"
        onClick={() => onRoleChange(user)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
      >
        <UserCog className="h-3.5 w-3.5" />
      </button>

      {/* More actions dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            onClick={() => onRoleChange(user)}
            className="gap-2 cursor-pointer"
          >
            <UserCog className="h-3.5 w-3.5 text-blue-500" />
            Đổi quyền
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => onDelete(user)}
            className={cn(
              "gap-2 cursor-pointer",
              user.role === "ADMIN"
                ? "text-amber-600 focus:text-amber-600 focus:bg-amber-50"
                : "text-red-600 focus:text-red-600 focus:bg-red-50",
            )}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {user.role === "ADMIN" ? "Xoá (cần hạ role)" : "Xoá người dùng"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────

export function UserTable({
  items,
  isLoading,
  isFetching = false,
  hasFilters,
  onRoleChange,
  onDelete,
  onClearFilters,
}: UserTableProps) {
  const TH =
    "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 whitespace-nowrap";

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/70">
              <th className={TH}>Email</th>
              <th className={TH}>Quyền</th>
              <th className={TH}>Trạng thái</th>
              <th className={TH}>Ngày tạo</th>
              <th className={cn(TH, "text-right")}>Hành động</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {isLoading || (isFetching && items.length === 0) ? (
              <TableSkeleton />
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    hasFilters={hasFilters}
                    onClearFilters={onClearFilters}
                  />
                </td>
              </tr>
            ) : (
              items.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-gray-50/50 transition-colors group"
                >
                  {/* Email */}
                  <td className="px-4 py-3.5">
                    <span className="font-medium text-gray-900 text-sm">{user.email}</span>
                  </td>

                  {/* Role */}
                  <td className="px-4 py-3.5">
                    <RoleBadge role={user.role} />
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5">
                    <StatusBadge isActive={user.isActive} />
                  </td>

                  {/* Created at */}
                  <td className="px-4 py-3.5">
                    <span className="text-xs text-gray-400">{formatDate(user.createdAt)}</span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5">
                    <RowActions
                      user={user}
                      onRoleChange={onRoleChange}
                      onDelete={onDelete}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
