"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductForm from "@/components/product/ProductForm";
import { useProduct } from "@/hooks/useProducts";

export default function AdminEditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: product, isLoading, isError } = useProduct(Number(id));

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex flex-col gap-1">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 mt-2">Chỉnh sửa sản phẩm</h1>
        <p className="text-sm text-gray-500">Cập nhật thông tin sản phẩm bên dưới.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 text-cyan-500 animate-spin" />
          </div>
        ) : isError || !product ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <Package className="h-10 w-10 text-gray-300" />
            <p className="text-sm text-gray-500">Không tìm thấy sản phẩm.</p>
            <Button asChild variant="outline" size="sm" className="border-gray-200">
              <Link href="/admin/products">Quay lại danh sách</Link>
            </Button>
          </div>
        ) : (
          <ProductForm mode="edit" initialProduct={product} />
        )}
      </div>
    </div>
  );
}
