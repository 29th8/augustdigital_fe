"use client";

import { useState } from "react";
import Link from "next/link";
import { Package } from "lucide-react";
import type { Product } from "@/types/product";
import { formatVND } from "@/lib/formatVND";

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

  return (
    <div className="group relative flex flex-col rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-md hover:border-cyan-200 transition-all duration-200">

      <Link
        href={`/products/${product.id}`}
        className="flex flex-col flex-1"
      >
        {/* Image / placeholder */}
        <div className="relative aspect-video bg-gray-50 flex items-center justify-center overflow-hidden">
          {imageSrc && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setImgError(true)}
            />
          ) : (
            <Package className="h-12 w-12 text-gray-300" />
          )}
        </div>

        {/* Content */}
        <div className="flex flex-col gap-2 p-4 flex-1">
          <span className="text-xs font-medium text-cyan-600 uppercase tracking-wide">
            {product.category || "Chưa có danh mục"}
          </span>
          <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
            {product.name}
          </p>
          {product.description && (
            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed flex-1">
              {product.description}
            </p>
          )}
          <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between">
            {lowestPrice !== null ? (
              <span className="text-sm font-bold text-gray-900">
                Từ{" "}
                <span className="text-cyan-600">
                  {formatVND(lowestPrice)}
                </span>
              </span>
            ) : (
              <span className="text-xs text-gray-400">Chưa có gói</span>
            )}
            <span className="text-xs text-gray-400">
              {product.variants?.length ?? 0} gói
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
