import React from "react";

export interface TableColumn<T> {
  key: string;
  /** Empty string = no header text (e.g. actions column) */
  header: string;
  headerClassName?: string;
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
}

const TH_BASE = "text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500";

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
}: DataTableProps<T>) {
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        {emptyIcon}
        <p className="text-sm text-gray-500">{errorMessage}</p>
      </div>
    );
  }

  if (!isLoading && !data?.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
        {emptyIcon}
        <p className="text-sm text-gray-500">{emptyMessage}</p>
        {emptyAction}
      </div>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 bg-gray-50">
          {columns.map((col) => (
            <th key={col.key} className={col.headerClassName ?? TH_BASE}>
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {isLoading
          ? Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    {col.skeleton ?? (
                      <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
                    )}
                  </td>
                ))}
              </tr>
            ))
          : data!.map((row) => (
              <tr key={keyExtractor(row)} className="hover:bg-gray-50 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
      </tbody>
    </table>
  );
}
