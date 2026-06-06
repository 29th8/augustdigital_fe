import React from "react";
import { AlertCircle, InboxIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TableColumn<T> {
  key: string;
  /** Empty string = no header text (e.g. actions column) */
  header: string;
  headerClassName?: string;
  cellClassName?: string;
  cell: (row: T) => React.ReactNode;
  /** Custom skeleton content. Defaults to a shimmer div. */
  skeleton?: React.ReactNode;
}

interface DataTableProps<T> {
  columns: TableColumn<T>[];
  data: T[] | undefined;
  isLoading?: boolean;
  isError?: boolean;
  keyExtractor: (row: T) => string | number;
  emptyIcon?: React.ReactNode;
  emptyMessage?: string;
  emptyAction?: React.ReactNode;
  errorMessage?: string;
  skeletonRows?: number;
  /** Wrap in a white card with border. Default: true */
  card?: boolean;
  onRowClick?: (row: T) => void;
  pageInfo?: {
    total_elements: number;
    total_pages: number;
    current_page: number; // 0-based
    page_size: number;
  };
  onPageChange?: (page: number) => void; // 0-based
}

function Pagination({
  pageInfo,
  onPageChange,
}: {
  pageInfo: NonNullable<DataTableProps<unknown>["pageInfo"]>;
  onPageChange: (page: number) => void;
}) {
  const { current_page, total_pages, total_elements, page_size } = pageInfo;
  if (total_pages <= 1) return null;

  const from = current_page * page_size + 1;
  const to = Math.min((current_page + 1) * page_size, total_elements);

  // Build page numbers with ellipsis
  function getPages(): (number | "...")[] {
    const pages: (number | "...")[] = [];
    const delta = 1;
    const left = current_page - delta;
    const right = current_page + delta;

    for (let i = 0; i < total_pages; i++) {
      if (i === 0 || i === total_pages - 1 || (i >= left && i <= right)) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("...");
      }
    }
    return pages;
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      <p className="text-xs text-gray-400">
        {from}–{to} / <span className="font-medium text-gray-600">{total_elements}</span> kết quả
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={current_page === 0}
          onClick={() => onPageChange(current_page - 1)}
          className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        {getPages().map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="h-7 w-7 flex items-center justify-center text-xs text-gray-300">
              ···
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p as number)}
              className={cn(
                "h-7 w-7 flex items-center justify-center rounded-lg text-xs font-medium transition-colors",
                p === current_page
                  ? "bg-sky-600 text-white shadow-sm"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              )}
            >
              {(p as number) + 1}
            </button>
          )
        )}
        <button
          type="button"
          disabled={current_page >= total_pages - 1}
          onClick={() => onPageChange(current_page + 1)}
          className="h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

const TH_BASE =
  "text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap";

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  isError = false,
  keyExtractor,
  emptyIcon,
  emptyMessage = "Không có dữ liệu.",
  emptyAction,
  errorMessage = "Không thể tải dữ liệu.",
  skeletonRows = 5,
  card = true,
  onRowClick,
  pageInfo,
  onPageChange,
}: DataTableProps<T>) {
  const wrapper = card
    ? "bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
    : "";

  if (isError) {
    return (
      <div className={cn(wrapper, "flex flex-col items-center justify-center gap-3 py-20 text-center")}>
        <div className="p-4 bg-red-50 rounded-2xl">
          <AlertCircle className="h-7 w-7 text-red-300" />
        </div>
        <p className="text-sm text-gray-500">{errorMessage}</p>
      </div>
    );
  }

  if (!isLoading && !data?.length) {
    return (
      <div className={cn(wrapper, "flex flex-col items-center justify-center gap-3 py-20 text-center")}>
        <div className="p-4 bg-gray-50 rounded-2xl">
          {emptyIcon ?? <InboxIcon className="h-7 w-7 text-gray-200" />}
        </div>
        <p className="text-sm text-gray-400">{emptyMessage}</p>
        {emptyAction}
      </div>
    );
  }

  return (
    <div className={wrapper}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              {columns.map((col) => (
                <th key={col.key} className={col.headerClassName ?? TH_BASE}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: skeletonRows }).map((_, i) => (
                  <tr
                    key={i}
                    className="border-b border-gray-50 last:border-0"
                    style={{ opacity: 1 - i * 0.12 }}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3.5">
                        {col.skeleton ?? (
                          <div className="h-3.5 rounded-full bg-gray-100 animate-pulse"
                            style={{ width: `${55 + Math.random() * 35}%` }}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              : data!.map((row, idx) => (
                  <tr
                    key={keyExtractor(row)}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      "border-b border-gray-50 last:border-0 transition-colors",
                      onRowClick ? "cursor-pointer hover:bg-sky-50/40" : "hover:bg-gray-50/60",
                      idx % 2 === 0 ? "" : "bg-gray-50/30",
                    )}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={cn("px-4 py-3.5 text-gray-700", col.cellClassName)}
                      >
                        {col.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
      {pageInfo && onPageChange && (
        <Pagination pageInfo={pageInfo} onPageChange={onPageChange} />
      )}
    </div>
  );
}
