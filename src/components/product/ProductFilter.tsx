"use client";

import { useCallback, useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ProductListParams } from "@/types/product";
import type { Category } from "@/types/category";

const SORT_OPTIONS = [
  { label: "Mới nhất", value: "newest" },
  { label: "Giá: Thấp đến Cao", value: "price_asc" },
  { label: "Giá: Cao đến Thấp", value: "price_desc" },
] as const;

interface ProductFilterProps {
  params: ProductListParams;
  categories?: Category[];
  onFilter: (updates: Partial<ProductListParams>) => void;
}

export default function ProductFilter({ params, categories = [], onFilter }: ProductFilterProps) {
  const [search, setSearch] = useState(params.keyword ?? "");

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      onFilter({ keyword: search.trim() || undefined });
    },
    [search, onFilter]
  );

  const clearSearch = () => {
    setSearch("");
    onFilter({ keyword: undefined });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
      {/* Search */}
      <form onSubmit={handleSearch} className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => {
            const val = e.target.value;
            setSearch(val);
            if (val === "") onFilter({ keyword: undefined });
          }}
          placeholder="Tìm kiếm sản phẩm…"
          className="pl-9 pr-9 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:ring-cyan-500"
        />
        {search && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </form>

      {/* Category */}
      {categories.length > 0 && (
        <select
          value={params.category_id ?? ""}
          onChange={(e) => onFilter({ category_id: e.target.value ? Number(e.target.value) : undefined })}
          className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      {/* Sort */}
      <select
        value={params.sort ?? ""}
        onChange={(e) => onFilter({ sort: e.target.value || undefined })}
        className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-cyan-500"
      >
        <option value="">Sắp xếp theo</option>
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* Active filters badge */}
      {(params.category_id || params.keyword || params.sort) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSearch("");
            onFilter({ category_id: undefined, keyword: undefined, sort: undefined });
          }}
          className="text-xs text-gray-500 hover:text-gray-900"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Xóa bộ lọc
        </Button>
      )}
    </div>
  );
}
