"use client";

import Link from "next/link";
import { Plus, Pencil, Trash2, Loader2, Tag, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type TableColumn } from "@/components/ui/DataTable";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useCategoryMutations } from "@/hooks/useCategoryMutations";
import type { Category } from "@/types/category";

export default function AdminCategoriesPage() {
  const { data, isLoading, isError, deleteCategory, deletingId } = useCategoryMutations();

  const columns: TableColumn<Category>[] = [
    {
      key: "id",
      header: "ID",
      headerClassName: "text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-16",
      cell: (c) => (
        <span className="text-[11px] font-mono text-gray-400">#{c.id}</span>
      ),
      skeleton: <div className="h-3.5 w-8 bg-gray-100 rounded-full animate-pulse" />,
    },
    {
      key: "name",
      header: "Tên danh mục",
      cell: (c) => (
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center shrink-0">
            <Tag className="h-3 w-3 text-violet-500" />
          </div>
          <span className="font-semibold text-gray-800 text-sm">{c.name}</span>
        </div>
      ),
      skeleton: <div className="h-3.5 w-40 bg-gray-100 rounded-full animate-pulse" />,
    },
    {
      key: "createdAt",
      header: "Ngày tạo",
      cell: (c) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-gray-600">
            {new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(new Date(c.createdAt))}
          </span>
          <span className="text-[11px] text-gray-400">
            {new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(c.createdAt))}
          </span>
        </div>
      ),
      skeleton: <div className="h-3.5 w-32 bg-gray-100 rounded-full animate-pulse" />,
    },
    {
      key: "actions",
      header: "",
      headerClassName: "px-4 py-3",
      cell: (c) => {
        const isThisDeleting = deletingId === c.id;
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-8 px-3 border-gray-200 text-gray-500 hover:text-sky-700 hover:border-sky-200 hover:bg-sky-50 transition-colors"
            >
              <Link href={`/admin/categories/${c.id}/edit`}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Sửa
              </Link>
            </Button>

            <ConfirmDialog
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isThisDeleting}
                  className="h-8 px-3 border-gray-200 text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                >
                  {isThisDeleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Xóa
                    </>
                  )}
                </Button>
              }
              title="Xóa danh mục?"
              description={
                <>
                  <span className="font-medium text-gray-700">{c.name}</span> sẽ bị xóa vĩnh
                  viễn. Nếu danh mục đang có sản phẩm, thao tác xóa sẽ thất bại.
                </>
              }
              confirmLabel="Xóa"
              onConfirm={() => deleteCategory(c.id)}
            />
          </div>
        );
      },
      skeleton: (
        <div className="flex justify-end gap-2">
          <div className="h-8 w-16 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-8 w-14 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <div className="p-2 bg-violet-50 rounded-xl">
              <LayoutGrid className="h-5 w-5 text-violet-600" />
            </div>
            Danh mục
          </h1>
          <p className="text-sm text-gray-400 mt-1 ml-0.5">
            {data?.length ?? 0} danh mục trong hệ thống
          </p>
        </div>
        <Button
          asChild
          size="sm"
          className="bg-sky-600 hover:bg-sky-500 text-white font-semibold h-9 px-4 shadow-sm"
        >
          <Link href="/admin/categories/create">
            <Plus className="mr-1.5 h-4 w-4" />
            Thêm danh mục
          </Link>
        </Button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        isError={isError}
        keyExtractor={(c) => c.id}
        emptyIcon={<Tag className="h-7 w-7 text-gray-200" />}
        emptyMessage="Chưa có danh mục nào."
        errorMessage="Không thể tải danh sách danh mục."
        emptyAction={
          <Button asChild size="sm" className="bg-sky-600 hover:bg-sky-500 text-white mt-1">
            <Link href="/admin/categories/create">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Tạo danh mục đầu tiên
            </Link>
          </Button>
        }
      />
    </div>
  );
}
