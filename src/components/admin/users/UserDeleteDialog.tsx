"use client";

import { AlertTriangle, Trash2, Loader2, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDeleteUser } from "@/hooks/useUsers";
import type { User } from "@/types/user";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserDeleteDialogProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UserDeleteDialog({ open, user, onClose }: UserDeleteDialogProps) {
  const deleteMutation = useDeleteUser();

  if (!open || !user) return null;

  const isAdmin = user.role === "ADMIN";
  const isPending = deleteMutation.isPending;

  async function handleDelete() {
    if (!user || isAdmin) return;
    await deleteMutation.mutateAsync(user.id);
    onClose();
  }

  function handleClose() {
    if (isPending) return;
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
          <div
            className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
              isAdmin ? "bg-amber-100" : "bg-red-100"
            }`}
          >
            {isAdmin ? (
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            ) : (
              <Trash2 className="h-6 w-6 text-red-600" />
            )}
          </div>

          {/* Title */}
          <h2 className="text-center text-base font-semibold text-gray-900 mb-2">
            {isAdmin ? "Không thể xoá tài khoản này" : "Xoá người dùng?"}
          </h2>

          {/* Body */}
          <div className="text-center text-sm text-gray-500 space-y-2">
            <p className="break-all font-medium text-gray-700">{user.email}</p>

            {isAdmin ? (
              <>
                <p>
                  Tài khoản có quyền{" "}
                  <span className="font-semibold text-blue-700">ADMIN</span>{" "}
                  không thể bị xoá.
                </p>
                <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-left">
                  <p className="text-xs font-medium text-amber-800 flex items-center gap-1.5">
                    <ShieldOff className="h-3.5 w-3.5 shrink-0" />
                    Hạ role trước khi xoá
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Hãy đổi quyền tài khoản xuống{" "}
                    <span className="font-semibold">CUSTOMER</span> trước, sau đó mới có thể xoá.
                  </p>
                </div>
              </>
            ) : (
              <p>Hành động này không thể hoàn tác.</p>
            )}
          </div>

          {/* Actions */}
          <div className="mt-5 flex flex-col gap-2">
            {isAdmin ? (
              <Button
                variant="outline"
                onClick={handleClose}
                className="w-full"
              >
                Đóng
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleDelete}
                  disabled={isPending}
                  className="w-full bg-red-600 hover:bg-red-500 text-white"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-1.5" />
                      Xoá vĩnh viễn
                    </>
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
