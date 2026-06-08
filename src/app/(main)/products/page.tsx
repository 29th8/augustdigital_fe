"use client";

import { Package, RefreshCw, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/product/ProductCard";
import ProductFilter from "@/components/product/ProductFilter";
import Pagination from "@/components/common/Pagination";
import { useProducts } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { cn } from "@/lib/utils";

export default function ProductsPage() {
  const {
    data,
    isLoading,
    isFetching,
    isError,
    error,
    params,
    setFilter,
    setPage,
    refetch,
  } = useProducts();

  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[ProductsPage] query state", {
      isLoading,
      isFetching,
      isError,
      hasData: !!data,
      itemCount: data?.items?.length ?? 0,
      error,
    });
  }

  // ── Skeleton: ONLY on first-ever load (isPending && isFetching = isLoading).
  //
  // The OLD pattern `isFetching && !data` was the root cause of stuck skeleton:
  //
  //   Navigate away → TQ error state (no data)
  //   Navigate back → refetchOnMount fires → isFetching=true, data=undefined
  //   showSkeleton = isFetching && !data = true → STUCK SKELETON
  //                              ^^^^^^^^ wrong: skeleton shown during refetch-after-error
  //
  // Correct pattern: if there is prior error state and we are re-fetching, show
  // the ERROR UI (with a loading spinner overlay) so the user knows what
  // happened and is not left staring at an opaque spinning skeleton.
  const showSkeleton = isLoading;

  // Subtle spinner shown ONLY during background refetches when data already
  // exists, so the user knows content is being updated without a jarring reload.
  const showRefetchOverlay = isFetching && !isLoading;

  const { data: categories = [] } = useCategories();

  const totalElements = data?.page_info?.total_elements ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2.5">
            <div className="p-2 bg-sky-50 rounded-xl">
              <LayoutGrid className="h-5 w-5 text-sky-600" />
            </div>
            Sản phẩm
          </h1>
          <p className="text-sm text-gray-400 mt-1 ml-0.5">
            {!showSkeleton && data
              ? `${totalElements} sản phẩm`
              : "Khám phá toàn bộ danh mục hàng số."}
          </p>
        </div>
        {showRefetchOverlay && (
          <RefreshCw className="h-4 w-4 text-sky-400 animate-spin" />
        )}
      </div>

      {/* Filters */}
      <ProductFilter params={params} categories={categories} onFilter={setFilter} />

      {/* Grid */}
      {showSkeleton ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm animate-pulse"
              style={{ opacity: 1 - i * 0.08 }}
            >
              <div className="aspect-video bg-gray-100" />
              <div className="p-4 flex flex-col gap-2.5">
                <div className="h-3 w-20 bg-gray-100 rounded-full" />
                <div className="h-4 w-full bg-gray-100 rounded-full" />
                <div className="h-3 w-2/3 bg-gray-100 rounded-full" />
                <div className="h-px w-full bg-gray-100 mt-1" />
                <div className="h-4 w-24 bg-gray-100 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="p-4 bg-gray-50 rounded-2xl">
            <Package className={cn("h-7 w-7", isFetching ? "text-sky-300 animate-pulse" : "text-gray-200")} />
          </div>
          <p className="text-sm text-gray-400">Không thể tải sản phẩm. Vui lòng thử lại.</p>
          {!isFetching && (
            <Button variant="outline" size="sm" onClick={() => refetch()} className="border-gray-200">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Thử lại
            </Button>
          )}
        </div>
      ) : !data?.items.length ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <div className="p-4 bg-gray-50 rounded-2xl">
            <Package className="h-7 w-7 text-gray-200" />
          </div>
          <p className="text-sm text-gray-400">Không tìm thấy sản phẩm nào.</p>
        </div>
      ) : (
        <div className={cn("flex flex-col gap-6 transition-opacity", showRefetchOverlay && "opacity-60")}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <Pagination pageInfo={data.page_info} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
