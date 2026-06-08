"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Package, ShoppingCart, Zap, ShieldCheck, RefreshCcw, Tag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useProduct } from "@/hooks/useProducts";
import { useCartMutations } from "@/hooks/useCartMutations";
import { formatVND } from "@/lib/formatVND";
import { StockBadge } from "@/components/product/StockBadge";
import { cn } from "@/lib/utils";
import type { ApiErrorResponse } from "@/types/api";
import type { ProductVariant } from "@/types/product";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ProductDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-4 w-28 bg-gray-100 rounded-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="aspect-square rounded-2xl bg-gray-100" />
        <div className="flex flex-col gap-5 pt-2">
          <div className="h-3 w-20 bg-gray-100 rounded-full" />
          <div className="h-7 w-3/4 bg-gray-100 rounded-full" />
          <div className="space-y-2">
            <div className="h-3 w-full bg-gray-100 rounded-full" />
            <div className="h-3 w-5/6 bg-gray-100 rounded-full" />
            <div className="h-3 w-2/3 bg-gray-100 rounded-full" />
          </div>
          <div className="h-3 w-16 bg-gray-100 rounded-full mt-2" />
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 w-28 bg-gray-100 rounded-xl" />
            ))}
          </div>
          <div className="h-px bg-gray-100 mt-2" />
          <div className="h-8 w-32 bg-gray-100 rounded-full" />
          <div className="h-11 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Feature strip ────────────────────────────────────────────────────────────

function FeatureStrip() {
  const items = [
    { icon: Zap, label: "Giao ngay sau thanh toán" },
    { icon: ShieldCheck, label: "Bảo hành toàn diện" },
    { icon: RefreshCcw, label: "Hỗ trợ đổi trả" },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {items.map(({ icon: Icon, label }) => (
        <div
          key={label}
          className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-100 bg-gray-50 px-3 py-3 text-center"
        >
          <Icon className="h-4 w-4 text-sky-500" />
          <span className="text-[10px] font-medium text-gray-500 leading-snug">{label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: product, isLoading, isError } = useProduct(Number(id));
  const { addMutation } = useCartMutations();

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [imgError, setImgError] = useState(false);

  const [variantStock, setVariantStock] = useState<Record<number, number>>({});

  const imageSrc = product?.imageUrl ?? null;

  if (isLoading) return <ProductDetailSkeleton />;

  if (isError || !product) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <div className="p-5 bg-gray-50 rounded-2xl">
          <Package className="h-8 w-8 text-gray-200" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700">Không tìm thấy sản phẩm</p>
          <p className="text-xs text-gray-400 mt-0.5">Sản phẩm này có thể đã bị xóa hoặc không tồn tại.</p>
        </div>
        <Button asChild variant="outline" size="sm" className="border-gray-200">
          <Link href="/products">
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            Quay lại danh sách
          </Link>
        </Button>
      </div>
    );
  }

  const active = selectedVariant ?? product.variants?.[0] ?? null;

  function handleSelectVariant(v: ProductVariant) {
    setSelectedVariant(v);
    setVariantStock((prev) => {
      const next = { ...prev };
      delete next[v.id];
      return next;
    });
  }

  function handleAddToCart() {
    if (!active) return;
    const variantId = active.id;

    addMutation.mutate(
      { variantId, quantity: 1 },
      {
        onError: (err: ApiErrorResponse) => {
          if (err.code === 400 && err.message?.includes("Insufficient stock")) {
            const available = parseInt(err.message.match(/\d+/)?.[0] ?? "0", 10);
            setVariantStock((prev) => ({ ...prev, [variantId]: available }));
            if (available === 0) {
              toast.error("Hết hàng");
            } else {
              toast.error(`Chỉ còn ${available} sản phẩm`);
            }
            return;
          }
          toast.error("Có lỗi xảy ra");
        },
      },
    );
  }

  const activeStock: number | undefined = active
    ? (variantStock[active.id] ?? active.stock ?? undefined)
    : undefined;
  const isOutOfStock = activeStock === 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <Link
        href="/products"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-sky-600 transition-colors w-fit group"
      >
        <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
        Sản phẩm
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
        {/* ── Image ── */}
        <div className="rounded-2xl border border-gray-100 bg-gradient-to-br from-gray-50 to-gray-100 aspect-square flex items-center justify-center overflow-hidden shadow-sm">
          {imageSrc && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="p-6 bg-white/60 rounded-2xl">
                <Package className="h-16 w-16 text-gray-300" />
              </div>
              <p className="text-xs text-gray-400">Chưa có hình ảnh</p>
            </div>
          )}
        </div>

        {/* ── Info ── */}
        <div className="flex flex-col gap-5">
          {/* Category + title */}
          <div className="flex flex-col gap-2">
            {product.category && (
              <div className="flex items-center gap-1.5">
                <Tag className="h-3 w-3 text-sky-500" />
                <span className="text-xs font-semibold uppercase tracking-widest text-sky-600">
                  {product.category}
                </span>
              </div>
            )}
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 leading-snug">
              {product.name}
            </h1>
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-sm text-gray-500 leading-relaxed">{product.description}</p>
          )}

          {/* Variants */}
          {product.variants?.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                Chọn gói
              </p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => {
                  const outOfStock = (variantStock[v.id] ?? v.stock ?? undefined) === 0;
                  const isActive = active?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      onClick={() => handleSelectVariant(v)}
                      disabled={outOfStock}
                      className={cn(
                        "relative flex flex-col items-start px-3.5 py-2.5 rounded-xl border text-left transition-all",
                        outOfStock
                          ? "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed"
                          : isActive
                            ? "border-sky-400 bg-sky-50 text-sky-700 shadow-sm shadow-sky-100 ring-1 ring-sky-300"
                            : "border-gray-200 text-gray-700 hover:border-sky-200 hover:bg-sky-50/50",
                      )}
                    >
                      <span className={cn(
                        "text-sm font-semibold",
                        outOfStock && "line-through",
                      )}>
                        {v.name}
                      </span>
                      <span className={cn(
                        "text-xs mt-0.5",
                        isActive ? "text-sky-600 font-medium" : outOfStock ? "text-gray-300" : "text-gray-400",
                      )}>
                        {formatVND(v.price)}
                      </span>
                      {outOfStock && (
                        <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold bg-red-100 text-red-500 border border-red-200 rounded-full px-1.5 leading-4">
                          Hết
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Price + CTA */}
          {active && (
            <div className="flex flex-col gap-4 pt-4 border-t border-gray-100">
              <div className="flex items-end gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Giá</p>
                  <p className="text-3xl font-bold text-gray-900">{formatVND(active.price)}</p>
                </div>
                <div className="pb-1">
                  <StockBadge stock={activeStock} />
                </div>
              </div>

              {isOutOfStock ? (
                <div className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-3.5 text-sm font-semibold text-gray-400 select-none">
                  <ShoppingCart className="h-4 w-4" />
                  Tạm hết hàng
                </div>
              ) : (
                <Button
                  disabled={addMutation.isPending}
                  onClick={handleAddToCart}
                  size="lg"
                  className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold shadow-sm shadow-sky-200 disabled:opacity-60"
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {addMutation.isPending ? "Đang thêm…" : "Thêm vào giỏ hàng"}
                </Button>
              )}
            </div>
          )}

          {/* Feature strip */}
          <FeatureStrip />
        </div>
      </div>
    </div>
  );
}
