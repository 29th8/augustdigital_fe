"use client";

import { useState } from "react";
import { Loader2, X, RefreshCcw, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import RefundStatusBadge from "@/components/refund/RefundStatusBadge";
import { useProcessRefund } from "@/hooks/useRefunds";
import { cn } from "@/lib/utils";
import type { Refund } from "@/types/refund";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RefundProcessDialogProps {
  open: boolean;
  onClose: () => void;
  refund: Refund | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RefundProcessDialog({
  open,
  onClose,
  refund,
}: RefundProcessDialogProps) {
  const [decision, setDecision] = useState<"PROCESSED" | "REJECTED" | null>(null);
  const [notes, setNotes] = useState("");

  const processMutation = useProcessRefund(() => {
    setDecision(null);
    setNotes("");
    onClose();
  });

  const isAlreadyProcessed =
    refund !== null && (refund.status === "PROCESSED" || refund.status === "REJECTED");

  function handleConfirm() {
    if (!refund || !decision) return;
    processMutation.mutate({
      id: refund.id,
      payload: {
        status: decision,
        notes: notes.trim() || undefined,
      },
    });
  }

  function handleClose() {
    if (processMutation.isPending) return;
    setDecision(null);
    setNotes("");
    onClose();
  }

  if (!open || !refund) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden
      />

      {/* Panel */}
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <RefreshCcw className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Xử lý hoàn tiền</h2>
              <p className="text-xs font-mono text-gray-400 mt-0.5">#{refund.id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={processMutation.isPending}
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-5">
          {/* Refund info */}
          <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Mã đơn</span>
              <span className="text-sm font-mono font-medium text-gray-900">
                {refund.orderCode}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Số tiền</span>
              <span className="text-sm font-bold text-gray-900">
                {formatCurrency(refund.amount)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Trạng thái hiện tại</span>
              <RefundStatusBadge status={refund.status} />
            </div>
            <div className="pt-1 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">Lý do</p>
              <p className="text-sm text-gray-700">{refund.reason}</p>
            </div>
          </div>

          {isAlreadyProcessed ? (
            <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
              <RefreshCcw className="h-4 w-4 shrink-0 text-gray-400" />
              Yêu cầu hoàn tiền này đã được xử lý.
            </div>
          ) : (
            <>
              {/* Decision buttons */}
              <div className="flex flex-col gap-2">
                <Label className="text-sm font-medium text-gray-700">Quyết định</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDecision("PROCESSED")}
                    disabled={processMutation.isPending}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all",
                      decision === "PROCESSED"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-green-300 hover:bg-green-50/50",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                    )}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Duyệt hoàn tiền
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecision("REJECTED")}
                    disabled={processMutation.isPending}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all",
                      decision === "REJECTED"
                        ? "border-red-500 bg-red-50 text-red-700"
                        : "border-gray-200 bg-white text-gray-600 hover:border-red-300 hover:bg-red-50/50",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                    )}
                  >
                    <XCircle className="h-4 w-4" />
                    Từ chối
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div className="grid gap-1.5">
                <Label className="text-sm font-medium text-gray-700">
                  Ghi chú{" "}
                  <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
                </Label>
                <textarea
                  rows={3}
                  placeholder="Nhập ghi chú về quyết định hoàn tiền..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={processMutation.isPending}
                  className="w-full resize-none rounded-md border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:opacity-60 transition-colors"
                />
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={processMutation.isPending}
                >
                  Hủy
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!decision || processMutation.isPending}
                  className={cn(
                    "min-w-[120px] text-white",
                    decision === "REJECTED"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-blue-600 hover:bg-blue-700",
                  )}
                >
                  {processMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : decision === "PROCESSED" ? (
                    "Xác nhận duyệt"
                  ) : decision === "REJECTED" ? (
                    "Xác nhận từ chối"
                  ) : (
                    "Xác nhận"
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
