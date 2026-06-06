"use client";

import { Search, X, RefreshCw, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserFiltersProps {
  keyword: string;
  onKeywordChange: (v: string) => void;
  statusFilter: "all" | "active" | "locked";
  onStatusFilterChange: (v: "all" | "active" | "locked") => void;
  isFetching: boolean;
  onRefresh: () => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_SENTINEL = "_all";

// ─── Component ────────────────────────────────────────────────────────────────

export function UserFilters({
  keyword,
  onKeywordChange,
  statusFilter,
  onStatusFilterChange,
  isFetching,
  onRefresh,
  onClearFilters,
  hasActiveFilters,
}: UserFiltersProps) {
  const statusValue = statusFilter === "all" ? STATUS_SENTINEL : statusFilter;

  function handleStatusChange(raw: string) {
    const mapped = raw === STATUS_SENTINEL ? "all" : (raw as "active" | "locked");
    onStatusFilterChange(mapped);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
      {/* Search input */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          className="pl-9 pr-9"
          placeholder="Tìm theo email..."
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
        />
        {keyword && (
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            onClick={() => onKeywordChange("")}
            aria-label="Xóa từ khóa"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Status filter */}
      <Select value={statusValue} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-full sm:w-[180px]">
          <SlidersHorizontal className="mr-2 h-4 w-4 text-gray-400 shrink-0" />
          <SelectValue placeholder="Trạng thái" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={STATUS_SENTINEL}>Tất cả</SelectItem>
          <SelectItem value="active">Hoạt động</SelectItem>
          <SelectItem value="locked">Bị khoá</SelectItem>
        </SelectContent>
      </Select>

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-500 hover:text-gray-700"
          onClick={onClearFilters}
        >
          <X className="mr-1 h-4 w-4" />
          Xóa bộ lọc
        </Button>
      )}

      {/* Refresh */}
      <Button
        variant="outline"
        size="icon"
        className="shrink-0"
        onClick={onRefresh}
        disabled={isFetching}
        aria-label="Làm mới"
      >
        <RefreshCw
          className={`h-4 w-4 ${isFetching ? "animate-spin text-blue-500" : "text-gray-500"}`}
        />
      </Button>
    </div>
  );
}
