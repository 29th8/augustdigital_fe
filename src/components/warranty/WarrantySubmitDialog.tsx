"use client";

import { useState } from "react";
import { Loader2, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useSubmitWarranty } from "@/hooks/useWarranty";
import { cn } from "@/lib/utils";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface WarrantySubmitDialogProps {
  open: boolean;
  onClose: () => void;
  orderItemId: number;
  productName: string;
  variantName?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WarrantySubmitDialog({
  open,
  onClose,
  orderItemId,
  productName,
  variantName,
}: WarrantySubmitDialogProps) {
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { mutate, isPending } = useSubmitWarranty(() => {
    setDescription("");
    setError(null);
    onClose();
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (description.trim().length < 10) {
      setError("Mô tả phải có ít nhất 10 ký tự.");
      return;
    }

    setError(null);
    mutate({ order_item_id: orderItemId, description: description.trim() });
  }

  function handleClose() {
    if (isPending) return;
    setDescription("");
    setError(null);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-semibold text-gray-900">Yêu cầu bảo hành</h2>
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
          <div className="grid gap-4">
            {/* Product info (read-only) */}
            <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-500 mb-1">Sản phẩm</p>
              <p className="text-sm font-semibold text-gray-900">{productName}</p>
              {variantName && (
                <p className="text-xs text-gray-500 mt-0.5">{variantName}</p>
              )}
            </div>

            {/* Description */}
            <div className="grid gap-1.5">
              <Label htmlFor="warranty-description">
                Mô tả sự cố <span className="text-red-500">*</span>
              </Label>
              <textarea
                id="warranty-description"
                rows={4}
                placeholder="Mô tả chi tiết vấn đề bạn gặp phải với sản phẩm... (tối thiểu 10 ký tự)"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (error) setError(null);
                }}
                disabled={isPending}
                className={cn(
                  "w-full resize-none rounded-md border bg-white px-3 py-2 text-sm",
                  "placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500",
                  "disabled:opacity-60 disabled:cursor-not-allowed",
                  "transition-colors",
                  error ? "border-red-300" : "border-gray-300",
                )}
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <p className="text-xs text-gray-400 text-right">{description.length} ký tự</p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
            >
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
