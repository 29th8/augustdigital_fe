"use client";

import { useState } from "react";
import { X, Loader2, ShieldCheck, User, Mail, Package, FileText, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import WarrantyStatusBadge from "@/components/warranty/WarrantyStatusBadge";
import { useAdminWarrantyDetail, useResolveWarranty } from "@/hooks/useWarranty";
import { cn } from "@/lib/utils";
import type { WarrantyClaim } from "@/types/warranty";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}

// ─── Log actor indicator ──────────────────────────────────────────────────────

function LogActorBadge({ adminId }: { adminId: number | null }) {
  if (adminId === null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
        <User className="h-2.5 w-2.5" />
        Hệ thống
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
      <ShieldCheck className="h-2.5 w-2.5" />
      Admin #{adminId}
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface WarrantyDetailDrawerProps {
  claim: WarrantyClaim | null;
  onClose: () => void;
  onResolved?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WarrantyDetailDrawer({
  claim,
  onClose,
  onResolved,
}: WarrantyDetailDrawerProps) {
  const [notes, setNotes] = useState("");

  // Fetch fresh detail when drawer opens
  const { data: detail, isLoading: isDetailLoading } = useAdminWarrantyDetail(
    claim?.id ?? null,
  );

  const { mutate: resolve, isPending: isResolving } = useResolveWarranty(() => {
    setNotes("");
    onResolved?.();
  });

  // Use fresh detail if available, fall back to prop
  const activeClaim = detail ?? claim;

  function handleResolve() {
    if (!activeClaim) return;
    resolve({ id: activeClaim.id, payload: notes.trim() ? { notes: notes.trim() } : {} });
  }

  const isOpen = claim !== null;
  const isResolved = activeClaim?.status === "RESOLVED";

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] transition-opacity duration-200",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-white shadow-2xl border-l border-gray-200",
          "flex flex-col",
          "transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4 shrink-0">
          <div className="flex flex-col gap-1.5 min-w-0 pr-4">
            <div className="flex items-center gap-2 flex-wrap">
              <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0" />
              <h2 className="text-base font-semibold text-gray-900 truncate">
                {activeClaim?.productName ?? "Chi tiết bảo hành"}
              </h2>
            </div>
            {activeClaim && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-400">
                  #{activeClaim.id}
                </span>
                <WarrantyStatusBadge status={activeClaim.status} />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isDetailLoading || !activeClaim ? (
            <div className="flex flex-col gap-4 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-4 bg-gray-100 rounded" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Product info */}
              <section className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  Sản phẩm
                </p>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="text-sm font-medium text-gray-900">
                      {activeClaim.productName ?? "—"}
                    </span>
                  </div>
                  {activeClaim.variantName && (
                    <p className="text-xs text-gray-500 pl-6">{activeClaim.variantName}</p>
                  )}
                  {activeClaim.orderCode && (
                    <p className="text-xs text-gray-500 pl-6 font-mono">
                      Đơn: {activeClaim.orderCode}
                    </p>
                  )}
                </div>
              </section>

              {/* Customer info */}
              <section>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                  Khách hàng
                </p>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-700">{activeClaim.userEmail}</span>
                  </div>
                  {activeClaim.userId !== null && (
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-500">
                        User ID: {activeClaim.userId}
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {/* Description */}
              <section>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  Mô tả sự cố
                </p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
                  {activeClaim.description}
                </p>
              </section>

              {/* Timestamps */}
              <section className="flex flex-col gap-1 text-xs text-gray-400">
                <span>Ngày tạo: {formatDate(activeClaim.createdAt)}</span>
                <span>Cập nhật: {formatDate(activeClaim.updatedAt)}</span>
              </section>

              {/* Audit log timeline */}
              {activeClaim.logs.length > 0 && (
                <section>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Lịch sử xử lý
                  </p>
                  <div className="flex flex-col gap-0">
                    {activeClaim.logs.map((log, idx) => (
                      <div key={log.id} className="flex gap-3">
                        {/* Timeline line */}
                        <div className="flex flex-col items-center">
                          <div className="h-2 w-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                          {idx < activeClaim.logs.length - 1 && (
                            <div className="w-px flex-1 bg-gray-200 my-1" />
                          )}
                        </div>

                        {/* Log entry */}
                        <div className="pb-4 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <LogActorBadge adminId={log.adminId} />
                            <span className="text-[10px] text-gray-400">
                              {formatDate(log.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{log.action}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Resolve section */}
              {!isResolved && (
                <section className="rounded-lg border border-blue-100 bg-blue-50/40 px-4 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                    Xử lý yêu cầu
                  </p>

                  <div className="grid gap-2 mb-3">
                    <Label htmlFor="resolve-notes" className="text-xs text-gray-600">
                      Ghi chú (tuỳ chọn)
                    </Label>
                    <textarea
                      id="resolve-notes"
                      rows={3}
                      placeholder="Nhập ghi chú về quá trình xử lý..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      disabled={isResolving}
                      className={cn(
                        "w-full resize-none rounded-md border border-gray-200 bg-white px-3 py-2 text-sm",
                        "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500",
                        "disabled:opacity-60 disabled:cursor-not-allowed transition-colors",
                      )}
                    />
                  </div>

                  <p className="text-xs text-gray-500 mb-3">
                    Sau khi xác nhận, trạng thái sẽ chuyển sang{" "}
                    <strong>Đang xử lý</strong> và quy trình bảo hành sẽ được khởi động.
                  </p>

                  <Button
                    onClick={handleResolve}
                    disabled={isResolving}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isResolving && (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    )}
                    Xác nhận xử lý bảo hành
                  </Button>
                </section>
              )}

              {isResolved && (
                <div className="rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  Yêu cầu bảo hành này đã được giải quyết.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
