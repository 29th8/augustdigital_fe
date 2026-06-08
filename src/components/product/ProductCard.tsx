"use client";

import { useState } from "react";
import Link from "next/link";
import { Package } from "lucide-react";
import type { Product } from "@/types/product";
import { formatVND } from "@/lib/formatVND";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  product: Product;
}

function getLowestPrice(product: Product): number | null {
  if (!product.variants?.length) return null;
  return Math.min(...product.variants.map((v) => v.price));
}

export default function ProductCard({ product }: ProductCardProps) {
  const lowestPrice = getLowestPrice(product);
  const imageSrc = product.imageUrl ?? null;
  const [imgError, setImgError] = useState(false);
  const variantCount = product.variants?.length ?? 0;

  return (
    <Link
      href={`/products/${product.id}`}
      className="group flex flex-col rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm hover:shadow-md hover:border-sky-200 transition-all duration-200"
    >
      {/* Image */}
      <div className="relative aspect-video bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
        {imageSrc && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Package className="h-10 w-10 text-gray-300" />
          </div>
        )}

        {/* Category badge overlay */}
        {product.category && (
          <div className="absolute top-2.5 left-2.5">
            <span className="inline-flex items-center rounded-full bg-white/90 backdrop-blur px-2.5 py-0.5 text-[10px] font-semibold text-sky-700 border border-sky-100 shadow-sm">
              {product.category}
            </span>
          </div>
        )}

        {/* Variant count badge */}
        {variantCount > 0 && (
          <div className="absolute top-2.5 right-2.5">
            <span className="inline-flex items-center rounded-full bg-white/90 backdrop-blur px-2 py-0.5 text-[10px] font-medium text-gray-500 border border-gray-200 shadow-sm">
              {variantCount} gói
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-4 flex-1">
        <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug group-hover:text-sky-700 transition-colors">
          {product.name}
        </p>
        {product.description && (
          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed flex-1">
            {product.description}
          </p>
        )}

        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-gray-100">
          {lowestPrice !== null ? (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Từ</p>
              <p className="text-sm font-bold text-sky-600">{formatVND(lowestPrice)}</p>
            </div>
          ) : (
            <span className="text-xs text-gray-300 italic">Chưa có gói</span>
          )}
        </div>
      </div>
    </Link>
  );
}
