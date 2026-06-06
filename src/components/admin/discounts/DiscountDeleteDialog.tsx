"use client";

import { AlertTriangle, Trash2, Loader2, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDeleteDiscount, useUpdateDiscount } from "@/hooks/useDiscounts";
import { isDiscountDeletable } from "@/types/discount";
import type { DiscountCode } from "@/types/discount";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DiscountDeleteDialogProps {
  open: boolean;
  discount: DiscountCode | null;
  onClose: () => void;
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

export function DiscountDeleteDialog({ open, discount, onClose }: DiscountDeleteDialogProps) {
  const deleteMutation = useDeleteDiscount();
  const updateMutation = useUpdateDiscount();

  if (!open || !discount) return null;

  const canDelete = isDiscountDeletable(discount);
  const isPending = deleteMutation.isPending || updateMutation.isPending;

  async function handleDelete() {
    if (!discount) return;
    await deleteMutation.mutateAsync(discount.id);
    onClose();
  }

  async function handleDeactivate() {
    if (!discount) return;
    await updateMutation.mutateAsync({ id: discount.id, payload: { isActive: false } });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6">
          {/* Icon */}
          <div
            className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
              canDelete ? "bg-red-100" : "bg-amber-100"
            }`}
          >
            {canDelete ? (
              <Trash2 className="h-6 w-6 text-red-600" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            )}
          </div>

          {/* Title */}
          <h2 className="text-center text-base font-semibold text-gray-900 mb-2">
            {canDelete ? "Xoá mã giảm giá?" : "Không thể xoá mã này"}
          </h2>

          {/* Body */}
          <div className="text-center text-sm text-gray-500 space-y-2">
            <p>
              Mã{" "}
              <span className="font-mono font-semibold text-gray-700">{discount.code}</span>
            </p>

            {canDelete ? (
              <p>Hành động này không thể hoàn tác.</p>
            ) : (
              <>
                <p>
                  Mã này đã được sử dụng{" "}
                  <span className="font-semibold text-amber-700">{discount.usedCount} lần</span>.
                  Xoá sẽ ảnh hưởng đến dữ liệu đơn hàng lịch sử.
                </p>
                <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-left">
                  <p className="text-xs font-medium text-amber-800 flex items-center gap-1.5">
                    <ShieldOff className="h-3.5 w-3.5 shrink-0" />
                    Vô hiệu hóa thay vì xoá
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Voucher sẽ không thể được dùng nhưng lịch sử đơn hàng vẫn nguyên vẹn.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="mt-5 flex flex-col gap-2">
            {canDelete ? (
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
                  onClick={onClose}
                  disabled={isPending}
                  className="w-full"
                >
                  Hủy
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleDeactivate}
                  disabled={isPending}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white"
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <ShieldOff className="h-4 w-4 mr-1.5" />
                      Vô hiệu hóa
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isPending}
                  className="w-full text-gray-600"
                >
                  Đóng
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
