"use client";

import Link from "next/link";
import { Plus, Pencil, Trash2, Loader2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type TableColumn } from "@/components/ui/DataTable";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useCategoryMutations } from "@/hooks/useCategoryMutations";
import type { Category } from "@/types/category";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function AdminCategoriesPage() {
  const { data, isLoading, isError, deleteCategory, deletingId } = useCategoryMutations();

  const columns: TableColumn<Category>[] = [
    {
      key: "id",
      header: "ID",
      headerClassName: "text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 w-16",
      cell: (c) => (
        <span className="text-gray-400 text-xs font-mono">#{c.id}</span>
      ),
      skeleton: <div className="h-4 w-8 bg-gray-100 rounded animate-pulse" />,
    },
    {
      key: "name",
      header: "Tên danh mục",
      cell: (c) => <span className="font-medium text-gray-900">{c.name}</span>,
      skeleton: <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />,
    },
    {
      key: "createdAt",
      header: "Ngày tạo",
      cell: (c) => <span className="text-gray-500 text-xs">{formatDate(c.createdAt)}</span>,
      skeleton: <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />,
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
              className="h-8 border-gray-200 text-gray-600 hover:text-cyan-700 hover:border-cyan-300"
            >
              <Link href={`/admin/categories/${c.id}/edit`}>
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Sửa
              </Link>
            </Button>

            <ConfirmDialog
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isThisDeleting}
                  className="h-8 border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
                >
                  {isThisDeleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
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
          <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
          <div className="h-8 w-16 bg-gray-100 rounded animate-pulse" />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Danh mục</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.length ?? 0} danh mục</p>
        </div>
        <Button
          asChild
          size="sm"
          className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
        >
          <Link href="/admin/categories/create">
            <Plus className="mr-1.5 h-4 w-4" />
            Thêm danh mục
          </Link>
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <DataTable
          columns={columns}
          data={data}
          isLoading={isLoading}
          isError={isError}
          keyExtractor={(c) => c.id}
          emptyIcon={<Tag className="h-10 w-10 text-gray-300" />}
          emptyMessage="Chưa có danh mục nào."
          errorMessage="Không thể tải danh sách danh mục."
          emptyAction={
            <Button asChild size="sm" className="bg-cyan-600 hover:bg-cyan-500 text-white">
              <Link href="/admin/categories/create">Tạo danh mục đầu tiên</Link>
            </Button>
          }
        />
      </div>
    </div>
  );
}
