"use client";

import { useState } from "react";
import { Loader2, ShieldAlert, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useChangeUserRole } from "@/hooks/useUsers";
import { cn } from "@/lib/utils";
import type { User, UserRole } from "@/types/user";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserRoleDialogProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UserRoleDialog({ open, user, onClose }: UserRoleDialogProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole | "">("");
  const changeRoleMutation = useChangeUserRole();

  if (!open || !user) return null;

  const currentRole = user.role;
  const targetRole = selectedRole || currentRole;
  const isSettingAdmin = targetRole === "ADMIN";
  const isSameRole = targetRole === currentRole;
  const isPending = changeRoleMutation.isPending;

  async function handleConfirm() {
    if (!user || isSameRole || !selectedRole) return;
    await changeRoleMutation.mutateAsync({ id: user.id, role: selectedRole });
    onClose();
  }

  function handleClose() {
    if (isPending) return;
    setSelectedRole("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden
      />

      {/* Panel */}
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-gray-200">
        <div className="p-6">
          {/* Icon */}
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
            <UserCog className="h-6 w-6 text-blue-600" />
          </div>

          {/* Title */}
          <h2 className="text-center text-base font-semibold text-gray-900 mb-1">
            Thay đổi quyền người dùng
          </h2>
          <p className="text-center text-sm text-gray-500 mb-5 break-all">
            {user.email}
          </p>

          {/* Current role info */}
          <div className="mb-4 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Quyền hiện tại</span>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  currentRole === "ADMIN"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-100 text-gray-600",
                )}
              >
                {currentRole === "ADMIN" ? "Quản trị viên" : "Khách hàng"}
              </span>
            </div>
          </div>

          {/* Role select */}
          <div className="mb-4">
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Quyền mới
            </label>
            <Select
              value={selectedRole || currentRole}
              onValueChange={(v) => setSelectedRole(v as UserRole)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CUSTOMER">Khách hàng (CUSTOMER)</SelectItem>
                <SelectItem value="ADMIN">Quản trị viên (ADMIN)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Warning when setting ADMIN */}
          {isSettingAdmin && targetRole !== currentRole && (
            <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-amber-800">
                <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                Cảnh báo
              </p>
              <p className="mt-1 text-xs text-amber-700">
                Người dùng ADMIN sẽ có toàn quyền truy cập vào hệ thống quản trị.
                Hãy chắc chắn trước khi thực hiện.
              </p>
            </div>
          )}

          {/* Same role notice */}
          {isSameRole && selectedRole !== "" && (
            <div className="mb-4 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
              <p className="text-xs text-gray-500 text-center">
                Người dùng đã có quyền này.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleConfirm}
              disabled={isPending || isSameRole}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Xác nhận thay đổi"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
              className="w-full"
            >
              Hủy
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
