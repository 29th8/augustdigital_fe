"use client";

import { useRef } from "react";
import Link from "next/link";
import { ShoppingCart, Trash2, X, Minus, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useCart } from "@/hooks/useCart";
import { useCartMutations } from "@/hooks/useCartMutations";
import { useCartStore } from "@/store/useCartStore";
import { formatVND } from "@/lib/formatVND";
import type { CartItem } from "@/types/cart";

// ─── CartItem row ─────────────────────────────────────────────────────────────

function CartItemRow({ item }: { item: CartItem }) {
  const { updateMutation, removeMutation } = useCartMutations();
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const isRemoving =
    removeMutation.isPending && removeMutation.variables === item.variantId;
  const isUpdating =
    updateMutation.isPending &&
    updateMutation.variables?.variantId === item.variantId;

  function scheduleUpdate(newQty: number) {
    clearTimeout(timerRef.current);
    if (newQty < 1) return;
    timerRef.current = setTimeout(() => {
      updateMutation.mutate({ variantId: item.variantId, quantity: newQty });
    }, 400);
  }

  return (
    <li className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
        <p className="text-xs text-gray-500">{item.variantName}</p>
        <p className="text-sm font-semibold text-gray-900 mt-1">{formatVND(item.price)}</p>
      </div>

      {/* Quantity controls */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => scheduleUpdate(item.quantity - 1)}
          disabled={item.quantity <= 1 || isUpdating}
          className="h-6 w-6 rounded border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition-colors"
          aria-label="Giảm số lượng"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="w-7 text-center text-sm font-medium text-gray-900">
          {item.quantity}
        </span>
        <button
          onClick={() => scheduleUpdate(item.quantity + 1)}
          disabled={isUpdating}
          className="h-6 w-6 rounded border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-40 transition-colors"
          aria-label="Tăng số lượng"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      {/* Subtotal + remove */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-sm font-semibold text-gray-900">{formatVND(item.subtotal)}</span>
        <button
          onClick={() => removeMutation.mutate(item.variantId)}
          disabled={isRemoving}
          className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-40"
          aria-label={`Xóa ${item.productName}`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

// ─── CartDrawer ───────────────────────────────────────────────────────────────

export default function CartDrawer() {
  const isOpen = useCartStore((s) => s.isOpen);
  const close = useCartStore((s) => s.close);
  const { data: cart, isLoading } = useCart();
  const { clearMutation } = useCartMutations();

  const items = cart?.items ?? [];
  const total = cart?.totalAmount ?? 0;
  const isEmpty = items.length === 0;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md bg-white border-gray-200 flex flex-col p-0 gap-0"
      >
        {/* Header — title left, X close button (Shadcn built-in) right */}
        <SheetHeader className="px-5 h-14 border-b border-gray-200 shrink-0 flex flex-row items-center">
          <SheetTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Giỏ hàng
            {!isEmpty && (
              <span className="ml-1 text-xs font-semibold bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded-full">
                {items.length}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Sub-header — "Xóa tất cả" separated from close button */}
        {!isEmpty && (
          <div className="flex justify-end px-5 py-2 border-b border-gray-100 shrink-0">
            <ConfirmDialog
              trigger={
                <button
                  disabled={clearMutation.isPending}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1 disabled:opacity-40"
                >
                  <Trash2 className="h-3 w-3" />
                  Xóa tất cả
                </button>
              }
              title="Xóa giỏ hàng"
              description="Bạn có chắc muốn xóa toàn bộ giỏ hàng? Hành động này không thể hoàn tác."
              confirmLabel="Xóa tất cả"
              onConfirm={() => clearMutation.mutate()}
            />
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-2">
          {isLoading ? (
            <div className="flex flex-col gap-3 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <ShoppingCart className="h-10 w-10 text-gray-200" />
              <p className="text-sm text-gray-500">Giỏ hàng trống.</p>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-gray-200 text-gray-600"
                onClick={close}
              >
                <Link href="/products">Xem sản phẩm</Link>
              </Button>
            </div>
          ) : (
            <ul>
              {items.map((item) => (
                <CartItemRow key={item.variantId} item={item} />
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {!isEmpty && (
          <div className="shrink-0 border-t border-gray-200 px-5 py-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Tổng cộng</span>
              <span className="text-lg font-bold text-gray-900">{formatVND(total)}</span>
            </div>
            <Button
              asChild
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
              onClick={close}
            >
              <Link href="/checkout">Tiến hành thanh toán</Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
