"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Package,
  ChevronDown,
  Tag,
  Boxes,
  Zap,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAdminProducts } from "@/hooks/useAdminProducts";
import { formatVND } from "@/lib/formatVND";
import { cn } from "@/lib/utils";

export default function AdminProductsPage() {
  const { data, isLoading, isError, deleteProduct, isDeleting } = useAdminProducts();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  function toggleExpand(id: number) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  const total = data?.page_info.total_elements ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <div className="p-2 bg-sky-50 rounded-xl">
              <Boxes className="h-5 w-5 text-sky-600" />
            </div>
            Sản phẩm
          </h1>
          <p className="text-sm text-gray-400 mt-1 ml-0.5">
            {total} sản phẩm trong hệ thống
          </p>
        </div>
        <Button
          asChild
          size="sm"
          className="bg-sky-600 hover:bg-sky-500 text-white font-semibold h-9 px-4 shadow-sm"
        >
          <Link href="/admin/products/create">
            <Plus className="mr-1.5 h-4 w-4" />
            Thêm sản phẩm
          </Link>
        </Button>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-24 text-gray-400">
            <Loader2 className="h-5 w-5 text-sky-400 animate-spin" />
            <span className="text-sm">Đang tải...</span>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <div className="p-4 bg-gray-50 rounded-2xl">
              <Package className="h-7 w-7 text-gray-200" />
            </div>
            <p className="text-sm text-gray-500">Không thể tải danh sách sản phẩm.</p>
          </div>
        ) : !data?.items.length ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <div className="p-4 bg-sky-50 rounded-2xl">
              <Package className="h-7 w-7 text-sky-300" />
            </div>
            <p className="text-sm text-gray-500">Chưa có sản phẩm nào.</p>
            <Button asChild size="sm" className="bg-sky-600 hover:bg-sky-500 text-white mt-1">
              <Link href="/admin/products/create">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Tạo sản phẩm đầu tiên
              </Link>
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="w-10 px-4 py-3" />
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Sản phẩm
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Danh mục
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Loại giao hàng
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Gói
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((product, idx) => {
                const imageSrc = product.imageUrl ?? null;
                const isExpanded = expandedId === product.id;
                const isShared = product.fulfillmentType === "INSTANT_SHARED";

                return (
                  <React.Fragment key={product.id}>
                    <tr
                      onClick={() => toggleExpand(product.id)}
                      className={cn(
                        "border-b border-gray-50 last:border-0 cursor-pointer transition-colors",
                        isExpanded
                          ? "bg-sky-50/30"
                          : idx % 2 === 1
                          ? "bg-gray-50/30 hover:bg-sky-50/20"
                          : "hover:bg-sky-50/20"
                      )}
                    >
                      {/* Chevron */}
                      <td className="px-4 py-3.5">
                        <div className={cn(
                          "h-5 w-5 rounded-full flex items-center justify-center transition-all",
                          isExpanded ? "bg-sky-100 text-sky-600" : "text-gray-300"
                        )}>
                          <ChevronDown className={cn(
                            "h-3.5 w-3.5 transition-transform duration-200",
                            isExpanded && "rotate-180"
                          )} />
                        </div>
                      </td>

                      {/* Product info */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center overflow-hidden shrink-0 border",
                            imageSrc ? "border-gray-100" : "border-gray-100 bg-gray-50"
                          )}>
                            {imageSrc ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={imageSrc} alt={product.name} className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-4 w-4 text-gray-300" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{product.name}</p>
                            <p className="text-xs text-gray-400 truncate max-w-xs mt-0.5">
                              {product.description || "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-100 px-2.5 py-1 rounded-full">
                          <Tag className="h-2.5 w-2.5" />
                          {product.category || "Chưa có"}
                        </span>
                      </td>

                      {/* Fulfillment type */}
                      <td className="px-4 py-3.5">
                        {isShared ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                            <Share2 className="h-2.5 w-2.5" />
                            Chia sẻ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                            <Zap className="h-2.5 w-2.5" />
                            Giao ngay
                          </span>
                        )}
                      </td>

                      {/* Variant count */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center justify-center min-w-[2rem] text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-100 px-2.5 py-1 rounded-full">
                          {product.variants?.length ?? 0} gói
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 border-gray-200 text-gray-500 hover:text-sky-700 hover:border-sky-200 hover:bg-sky-50 transition-colors"
                          >
                            <Link href={`/admin/products/${product.id}/edit`}>
                              <Pencil className="h-3.5 w-3.5 mr-1.5" />
                              Sửa
                            </Link>
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                Xóa
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-white border-gray-200">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-gray-900">Xóa sản phẩm?</AlertDialogTitle>
                                <AlertDialogDescription className="text-gray-500">
                                  <span className="font-medium text-gray-700">{product.name}</span>{" "}
                                  sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border-gray-200 text-gray-700 hover:bg-gray-50">
                                  Hủy
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteProduct(product.id)}
                                  disabled={isDeleting}
                                  className="bg-red-600 hover:bg-red-500 text-white"
                                >
                                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Xóa"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded variants */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} className="border-b border-gray-50 last:border-0 bg-sky-50/20">
                          <div className="px-16 py-3">
                            {product.variants?.length ? (
                              <div className="flex flex-wrap gap-2">
                                {product.variants.map((variant) => (
                                  <div
                                    key={variant.id}
                                    className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-sky-200 hover:shadow-md transition-all"
                                  >
                                    <div className="h-1.5 w-1.5 rounded-full bg-sky-400 shrink-0" />
                                    <span className="text-sm font-medium text-gray-700">{variant.name}</span>
                                    <span className="text-sm font-bold text-sky-600 ml-2">
                                      {formatVND(variant.price)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 py-1">Chưa có gói nào.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
