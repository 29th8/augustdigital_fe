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
  Mail,
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

export interface UserTableProps {
  items: User[];
  isLoading: boolean;
  isFetching?: boolean;
  hasFilters: boolean;
  onRoleChange: (u: User) => void;
  onDelete: (u: User) => void;
  onClearFilters: () => void;
}

function RoleBadge({ role }: { role: User["role"] }) {
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold border",
      role === "ADMIN"
        ? "bg-sky-50 text-sky-700 border-sky-100"
        : "bg-gray-50 text-gray-600 border-gray-200",
    )}>
      {role === "ADMIN" ? "Quản trị viên" : "Khách hàng"}
    </span>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border",
      isActive
        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
        : "bg-red-50 text-red-600 border-red-100",
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", isActive ? "bg-emerald-500" : "bg-red-500")} />
      {isActive ? "Hoạt động" : "Bị khoá"}
    </span>
  );
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="border-b border-gray-50 last:border-0" style={{ opacity: 1 - i * 0.12 }}>
          {[52, 20, 22, 24, 12].map((w, j) => (
            <td key={j} className="px-4 py-4">
              <div className="h-3.5 bg-gray-100 rounded-full animate-pulse" style={{ width: `${w}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function RowActions({ user, onRoleChange, onDelete }: { user: User; onRoleChange: (u: User) => void; onDelete: (u: User) => void }) {
  const toggleLockMutation = useToggleUserLock();
  const isToggling = toggleLockMutation.isPending && toggleLockMutation.variables?.id === user.id;

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        title={user.isActive ? "Khoá tài khoản" : "Mở khoá tài khoản"}
        onClick={() => toggleLockMutation.mutate({ id: user.id, isCurrentlyActive: user.isActive })}
        disabled={isToggling}
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
          user.isActive
            ? "text-gray-300 hover:bg-red-50 hover:text-red-500"
            : "text-gray-300 hover:bg-emerald-50 hover:text-emerald-600",
        )}
      >
        {isToggling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : user.isActive ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
      </button>

      <button
        type="button"
        title="Đổi quyền"
        onClick={() => onRoleChange(user)}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-300 hover:bg-sky-50 hover:text-sky-600 transition-colors"
      >
        <UserCog className="h-3.5 w-3.5" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-300 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={() => onRoleChange(user)} className="gap-2 cursor-pointer">
            <UserCog className="h-3.5 w-3.5 text-sky-500" />
            Đổi quyền
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onDelete(user)}
            className={cn("gap-2 cursor-pointer", user.role === "ADMIN"
              ? "text-amber-600 focus:text-amber-600 focus:bg-amber-50"
              : "text-red-600 focus:text-red-600 focus:bg-red-50")}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {user.role === "ADMIN" ? "Xoá (cần hạ role)" : "Xoá người dùng"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function UserTable({ items, isLoading, isFetching = false, hasFilters, onRoleChange, onDelete, onClearFilters }: UserTableProps) {
  const TH = "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap";

  return (
    <div className={cn("bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-opacity", isFetching && !isLoading && "opacity-60")}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              <th className={TH}>Email</th>
              <th className={TH}>Quyền</th>
              <th className={TH}>Trạng thái</th>
              <th className={TH}>Ngày tạo</th>
              <th className={cn(TH, "text-right")}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {isLoading || (isFetching && items.length === 0) ? (
              <TableSkeleton />
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <div className="p-4 bg-gray-50 rounded-2xl">
                      {hasFilters ? <UserX className="h-7 w-7 text-gray-200" /> : <Users className="h-7 w-7 text-gray-200" />}
                    </div>
                    <p className="text-sm text-gray-400">{hasFilters ? "Không tìm thấy người dùng phù hợp." : "Chưa có người dùng nào."}</p>
                    {hasFilters && <Button variant="outline" size="sm" onClick={onClearFilters}>Xóa bộ lọc</Button>}
                  </div>
                </td>
              </tr>
            ) : (
              items.map((user, idx) => (
                <tr key={user.id} className={cn("border-b border-gray-50 last:border-0 transition-colors", idx % 2 === 1 ? "bg-gray-50/30 hover:bg-sky-50/30" : "hover:bg-sky-50/20")}>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-full bg-sky-100 flex items-center justify-center shrink-0">
                        <Mail className="h-3 w-3 text-sky-500" />
                      </div>
                      <span className="font-medium text-gray-800 text-sm">{user.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4"><RoleBadge role={user.role} /></td>
                  <td className="px-4 py-4"><StatusBadge isActive={user.isActive} /></td>
                  <td className="px-4 py-4">
                    <span className="text-xs text-gray-400">
                      {new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(user.createdAt))}
                    </span>
                  </td>
                  <td className="px-4 py-4"><RowActions user={user} onRoleChange={onRoleChange} onDelete={onDelete} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
