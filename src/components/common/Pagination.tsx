"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PageInfo } from "@/types/api";

interface PaginationProps {
  pageInfo: PageInfo;
  onPageChange: (page: number) => void;
}

export default function Pagination({ pageInfo, onPageChange }: PaginationProps) {
  const { current_page, total_pages, total_elements, page_size } = pageInfo;
  const isFirst = current_page === 0;
  const isLast = current_page >= total_pages - 1;

  const from = total_elements === 0 ? 0 : current_page * page_size + 1;
  const to = Math.min((current_page + 1) * page_size, total_elements);

  if (total_pages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-4 pt-4">
      <p className="text-sm text-gray-500">
        Hiển thị <span className="font-medium text-gray-900">{from}–{to}</span> trong{" "}
        <span className="font-medium text-gray-900">{total_elements}</span> kết quả
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={isFirst}
          onClick={() => onPageChange(current_page - 1)}
          className="border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Trước
        </Button>

        <span className="px-3 text-sm text-gray-500 tabular-nums">
          {current_page + 1} / {total_pages}
        </span>

        <Button
          variant="outline"
          size="sm"
          disabled={isLast}
          onClick={() => onPageChange(current_page + 1)}
          className="border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-40"
        >
          Sau
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
