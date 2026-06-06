"use client";

import { Package, RefreshCw } from "lucide-react";
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
      {showSkeleton ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 h-64 animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        // Error state — shown immediately on navigation back if prior fetch failed.
        // isFetching=true here means a retry/refetch is already in flight (see
        // refetchOnMount:"always") — we show a spinner instead of hiding the error.
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <Package className={cn("h-10 w-10", isFetching ? "text-blue-300 animate-pulse" : "text-gray-300")} />
          <p className="text-sm text-gray-500">Không thể tải sản phẩm. Vui lòng thử lại.</p>
          {!isFetching && (
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-1 flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Thử lại
            </button>
          )}
        </div>
      ) : !data?.items.length ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <Package className="h-10 w-10 text-gray-300" />
          <p className="text-sm text-gray-500">Không tìm thấy sản phẩm nào.</p>
        </div>
      ) : (
        // Wrap grid in a relative container so the overlay doesn't shift layout.
        <div className={cn("relative transition-opacity", showRefetchOverlay && "opacity-60")}>
          {showRefetchOverlay && (
            <div className="absolute inset-0 flex items-start justify-end pr-1 pt-1 pointer-events-none z-10">
              <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
            </div>
          )}
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
