"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Package, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useProduct } from "@/hooks/useProducts";
import { useCartMutations } from "@/hooks/useCartMutations";
import { formatVND } from "@/lib/formatVND";
import { StockBadge } from "@/components/product/StockBadge";
import type { ApiErrorResponse } from "@/types/api";
import type { ProductVariant } from "@/types/product";

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: product, isLoading, isError } = useProduct(Number(id));
  const { addMutation } = useCartMutations();

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [imgError, setImgError] = useState(false);

  // ── Backend-driven stock: keyed by variantId, populated on 400 responses ──
  // undefined  → unknown (never attempted or no error yet)
  // 0          → out of stock
  // n > 0      → low stock warning received from backend
  const [variantStock, setVariantStock] = useState<Record<number, number>>({});

  const imageSrc = product?.imageUrl ?? null;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-6 w-32 bg-gray-100 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="aspect-square bg-gray-100 rounded-xl" />
          <div className="flex flex-col gap-4">
            <div className="h-8 w-3/4 bg-gray-100 rounded" />
            <div className="h-4 w-1/4 bg-gray-100 rounded" />
            <div className="h-20 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <Package className="h-12 w-12 text-gray-300" />
        <p className="text-gray-500">Không tìm thấy sản phẩm.</p>
        <Button asChild variant="outline" size="sm" className="border-gray-200">
          <Link href="/products">Quay lại danh sách</Link>
        </Button>
      </div>
    );
  }

  const active = selectedVariant ?? product.variants?.[0] ?? null;

  // ── Task 7: switching variant resets known stock for that variant ──────────
  function handleSelectVariant(v: ProductVariant) {
    setSelectedVariant(v);
    setVariantStock((prev) => {
      const next = { ...prev };
      delete next[v.id];
      return next;
    });
  }

  // ── Tasks 3–6: add to cart with backend-driven stock error handling ────────
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

  // variantStock (from add-to-cart errors) is most accurate; fall back to active.stock from BE.
  // When both are absent, treat as in-stock (undefined → StockBadge shows "Còn hàng" by default).
  const activeStock: number | undefined = active
    ? (variantStock[active.id] ?? active.stock ?? undefined)
    : undefined;
  const isOutOfStock = activeStock === 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Breadcrumb */}
      <Link
        href="/products"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Image */}
        <div className="aspect-square rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
          {imageSrc && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <Package className="h-20 w-20 text-gray-200" />
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-cyan-600">
              {product.category || "Chưa có danh mục"}
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{product.name}</h1>
          </div>

          {product.description && (
            <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
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
                  return (
                    <button
                      key={v.id}
                      onClick={() => handleSelectVariant(v)}
                      disabled={outOfStock}
                      className={`relative px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                        outOfStock
                          ? "border-gray-200 text-gray-400 bg-gray-50 cursor-not-allowed line-through"
                          : active?.id === v.id
                          ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                          : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {v.name}
                      {outOfStock && (
                        <span className="absolute -top-1.5 -right-1.5 text-[9px] font-semibold bg-red-100 text-red-500 border border-red-200 rounded-full px-1 leading-4">
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
            <div className="flex flex-col gap-3 pt-2 border-t border-gray-100">
              <p className="text-3xl font-bold text-gray-900">
                {formatVND(active.price)}
              </p>

              {/* Stock badge — backend-driven, appears after first add attempt */}
              <StockBadge stock={activeStock} />

              {isOutOfStock ? (
                <div className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 py-3 text-sm font-semibold text-gray-400 select-none">
                  <ShoppingCart className="h-4 w-4" />
                  Tạm hết hàng
                </div>
              ) : (
                <Button
                  disabled={addMutation.isPending}
                  onClick={handleAddToCart}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold disabled:opacity-60"
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {addMutation.isPending ? "Đang thêm…" : "Thêm vào giỏ hàng"}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
