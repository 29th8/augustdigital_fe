"use client";

import { useCallback, useState } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ProductListParams } from "@/types/product";
import type { Category } from "@/types/category";

const SORT_OPTIONS = [
  { label: "Mới nhất", value: "newest" },
  { label: "Giá: Thấp → Cao", value: "price_asc" },
  { label: "Giá: Cao → Thấp", value: "price_desc" },
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
    [search, onFilter],
  );

  const clearSearch = () => {
    setSearch("");
    onFilter({ keyword: undefined });
  };

  const hasFilters = !!(params.category_id || params.keyword || params.sort);

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
          className="pl-9 pr-9 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:ring-sky-500/40 focus-visible:border-sky-400"
        />
        {search && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </form>

      {/* Category */}
      {categories.length > 0 && (
        <Select
          value={params.category_id ? String(params.category_id) : "_all"}
          onValueChange={(v) =>
            onFilter({ category_id: v === "_all" ? undefined : Number(v) })
          }
        >
          <SelectTrigger className="w-full sm:w-48 bg-white border-gray-200 text-sm">
            <SlidersHorizontal className="h-3.5 w-3.5 text-gray-400 mr-1.5 shrink-0" />
            <SelectValue placeholder="Tất cả danh mục" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Tất cả danh mục</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Sort */}
      <Select
        value={params.sort ?? "_none"}
        onValueChange={(v) => onFilter({ sort: v === "_none" ? undefined : v })}
      >
        <SelectTrigger className="w-full sm:w-44 bg-white border-gray-200 text-sm">
          <SelectValue placeholder="Sắp xếp theo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_none">Sắp xếp theo</SelectItem>
          {SORT_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSearch("");
            onFilter({ category_id: undefined, keyword: undefined, sort: undefined });
          }}
          className={cn(
            "text-xs font-medium transition-colors",
            "text-gray-500 hover:text-red-600 hover:bg-red-50",
          )}
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Xóa bộ lọc
        </Button>
      )}
    </div>
  );
}
