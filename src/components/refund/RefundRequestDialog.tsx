"use client";

import { useState } from "react";
import { Loader2, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useCreateUserRefund } from "@/hooks/useRefunds";

interface RefundRequestDialogProps {
  open: boolean;
  onClose: () => void;
  orderId: number;
  orderCode: string;
}

export default function RefundRequestDialog({
  open,
  onClose,
  orderId,
  orderCode,
}: RefundRequestDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { mutate, isPending } = useCreateUserRefund(() => {
    setReason("");
    setError(null);
    onClose();
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 10) {
      setError("Lý do phải có ít nhất 10 ký tự.");
      return;
    }
    setError(null);
    mutate({ orderId, reason: reason.trim() });
  }

  function handleClose() {
    if (isPending) return;
    setReason("");
    setError(null);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={handleClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-900">Yêu cầu hoàn tiền</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5">
          <div className="flex flex-col gap-4">
            {/* Order info */}
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-500 mb-1">Mã đơn hàng</p>
              <p className="text-sm font-mono font-semibold text-gray-900">{orderCode}</p>
            </div>

            {/* Reason */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="refund-reason">
                Lý do hoàn tiền <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="refund-reason"
                rows={4}
                placeholder="Mô tả lý do bạn muốn hoàn tiền... (tối thiểu 10 ký tự)"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError(null);
                }}
                maxLength={500}
                disabled={isPending}
                className={cn(
                  "w-full resize-none rounded-md border bg-white px-3 py-2 text-sm",
                  "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500",
                  "disabled:opacity-60 disabled:cursor-not-allowed transition-colors",
                  error ? "border-red-300" : "border-gray-300",
                )}
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <p className="text-xs text-gray-400 text-right">{reason.length}/500</p>
            </div>

            <p className="text-xs text-gray-500">
              Yêu cầu hoàn tiền sẽ được xem xét bởi đội ngũ hỗ trợ. Chúng tôi sẽ liên hệ với bạn
              sau khi xử lý.
            </p>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Gửi yêu cầu
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
