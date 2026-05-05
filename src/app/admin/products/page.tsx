"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Loader2, Package, ChevronDown } from "lucide-react";
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

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Sản phẩm</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data?.page_info.total_elements ?? 0} sản phẩm
          </p>
        </div>
        <Button
          asChild
          size="sm"
          className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
        >
          <Link href="/admin/products/create">
            <Plus className="mr-1.5 h-4 w-4" />
            Thêm sản phẩm
          </Link>
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 text-cyan-500 animate-spin" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <Package className="h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">Không thể tải danh sách sản phẩm.</p>
          </div>
        ) : !data?.items.length ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <Package className="h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">Chưa có sản phẩm nào.</p>
            <Button asChild size="sm" className="bg-cyan-600 hover:bg-cyan-500 text-white">
              <Link href="/admin/products/create">Tạo sản phẩm đầu tiên</Link>
            </Button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="w-8 px-4 py-3" />
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Sản phẩm
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Danh mục
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Biến thể
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.map((product) => {
                const imageSrc = product.imageUrl ?? null;
                const isExpanded = expandedId === product.id;

                return (
                  <React.Fragment key={product.id}>
                    {/* Main row */}
                    <tr
                      onClick={() => toggleExpand(product.id)}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      {/* Expand chevron */}
                      <td className="px-4 py-3 text-gray-400">
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform duration-200",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </td>

                      {/* Product */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                            {imageSrc ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={imageSrc}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package className="h-4 w-4 text-gray-300" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{product.name}</p>
                            <p className="text-xs text-gray-400 line-clamp-1 max-w-xs">
                              {product.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-cyan-700 bg-cyan-50 border border-cyan-100 px-2 py-0.5 rounded-full">
                          {product.category || "Chưa có danh mục"}
                        </span>
                      </td>

                      {/* Variant count */}
                      <td className="px-4 py-3">
                        <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2 py-1 rounded-full font-medium">
                          {product.variants?.length ?? 0} gói
                        </span>
                      </td>

                      {/* Actions */}
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-8 border-gray-200 text-gray-600 hover:text-cyan-700 hover:border-cyan-300"
                          >
                            <Link href={`/admin/products/${product.id}/edit`}>
                              <Pencil className="h-3.5 w-3.5 mr-1" />
                              Sửa
                            </Link>
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                                Xóa
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-white border-gray-200">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-gray-900">
                                  Xóa sản phẩm?
                                </AlertDialogTitle>
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
                                  {isDeleting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    "Xóa"
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded variants row */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={5} className="bg-gray-50">
                          <div className="px-6 py-2 space-y-1">
                            {product.variants?.length ? (
                              product.variants.map((variant) => (
                                <div
                                  key={variant.id}
                                  className="flex justify-between text-sm text-gray-700"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-400">•</span>
                                    <span>{variant.name}</span>
                                  </div>
                                  <span className="font-medium text-blue-600">
                                    {formatVND(variant.price)}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-gray-400">Chưa có gói nào.</p>
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
