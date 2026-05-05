"use client";

import { Package } from "lucide-react";
import ProductCard from "@/components/product/ProductCard";
import ProductFilter from "@/components/product/ProductFilter";
import Pagination from "@/components/common/Pagination";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";

export default function ProductsPage() {
  const { data, isLoading, isError, params, setFilter, setPage } = useProducts();
  const { data: categories = [] } = useCategories();

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Sản phẩm</h1>
        <p className="text-sm text-gray-500">Khám phá toàn bộ danh mục hàng số của chúng tôi.</p>
      </div>

      {/* Filters */}
      <ProductFilter params={params} categories={categories} onFilter={setFilter} />

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 h-64 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <Package className="h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">Không thể tải sản phẩm. Vui lòng thử lại.</p>
        </div>
      ) : !data?.items.length ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <Package className="h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">Không tìm thấy sản phẩm nào.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <Pagination pageInfo={data.page_info} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
