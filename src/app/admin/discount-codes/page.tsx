"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Ticket,
  Search,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type TableColumn } from "@/components/ui/DataTable";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useDiscountList, useDiscountMutations } from "@/hooks/useDiscounts";
import {
  CreateDiscountSchema,
  UpdateDiscountSchema,
  type CreateDiscountFormValues,
  type UpdateDiscountFormValues,
} from "@/schemas/discount.schema";
import type { DiscountCode, DiscountListParams, DiscountType } from "@/types/discount";
import type { CreateDiscountPayload, UpdateDiscountPayload } from "@/types/discount";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatValue(type: DiscountType, value: number): string {
  if (type === "PERCENT") return `${value}%`;
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        active
          ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-200"
          : "bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-200",
      )}
    >
      {active ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {active ? "Hoạt động" : "Tắt"}
    </span>
  );
}

// ─── Type badge ───────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: DiscountType }) {
  return (
    <span
      className={cn(
        "inline-flex rounded px-2 py-0.5 text-xs font-semibold",
        type === "PERCENT" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700",
      )}
    >
      {type === "PERCENT" ? "%" : "VND"}
    </span>
  );
}

// ─── Create modal ─────────────────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void;
  isCreating: boolean;
  onSubmit: (payload: CreateDiscountPayload) => Promise<unknown>;
}

function CreateModal({ onClose, isCreating, onSubmit }: CreateModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateDiscountFormValues>({
    resolver: zodResolver(CreateDiscountSchema),
    defaultValues: {
      type: "PERCENT",
      isActive: true,
      usageLimit: 1,
      value: 10,
      expiredAt: null,
    },
  });

  const watchType = watch("type");
  const watchIsActive = watch("isActive");

  async function submit(values: CreateDiscountFormValues) {
    const payload: CreateDiscountPayload = {
      code: values.code,
      type: values.type,
      value: values.value,
      usageLimit: values.usageLimit,
      isActive: values.isActive ?? true,
      expiredAt: values.expiredAt || null,
    };
    await onSubmit(payload);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-200">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Tạo mã giảm giá</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit(submit)} className="px-6 py-5">
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="create-code">
                Mã giảm giá <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-code"
                placeholder="VD: SUMMER2025"
                className="uppercase"
                {...register("code")}
              />
              {errors.code && <p className="text-xs text-red-500">{errors.code.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>
                  Loại <span className="text-red-500">*</span>
                </Label>
                <Select
                  defaultValue={watchType}
                  onValueChange={(v) => setValue("type", v as DiscountType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENT">Phần trăm (%)</SelectItem>
                    <SelectItem value="FIXED">Số tiền (VND)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.type && <p className="text-xs text-red-500">{errors.type.message}</p>}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="create-value">
                  Giá trị <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="create-value"
                  type="number"
                  min={1}
                  max={watchType === "PERCENT" ? 100 : undefined}
                  step={watchType === "PERCENT" ? 1 : 1000}
                  {...register("value", { valueAsNumber: true })}
                />
                {errors.value && <p className="text-xs text-red-500">{errors.value.message}</p>}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="create-usageLimit">
                Số lượt dùng tối đa <span className="text-red-500">*</span>
              </Label>
              <Input
                id="create-usageLimit"
                type="number"
                min={1}
                step={1}
                {...register("usageLimit", { valueAsNumber: true })}
              />
              {errors.usageLimit && (
                <p className="text-xs text-red-500">{errors.usageLimit.message}</p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="create-expiredAt">Ngày hết hạn</Label>
              <Input
                id="create-expiredAt"
                type="datetime-local"
                {...register("expiredAt")}
              />
              {errors.expiredAt && (
                <p className="text-xs text-red-500">{errors.expiredAt.message}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                id="create-isActive"
                type="checkbox"
                defaultChecked={watchIsActive ?? true}
                className="h-4 w-4 rounded border-gray-300 accent-blue-600"
                {...register("isActive")}
              />
              <Label htmlFor="create-isActive" className="cursor-pointer">
                Kích hoạt ngay
              </Label>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isCreating}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isCreating && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Tạo mã
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  discount: DiscountCode;
  onClose: () => void;
  isUpdating: boolean;
  onSubmit: (id: number, payload: UpdateDiscountPayload) => Promise<unknown>;
}

function EditModal({ discount, onClose, isUpdating, onSubmit }: EditModalProps) {
  const toDateTimeLocal = (iso: string | null | undefined) =>
    iso ? iso.slice(0, 16) : "";

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UpdateDiscountFormValues>({
    resolver: zodResolver(UpdateDiscountSchema),
    defaultValues: {
      id: discount.id,
      code: discount.code,
      type: discount.type,
      value: discount.value,
      usageLimit: discount.usageLimit,
      isActive: discount.isActive,
      expiredAt: toDateTimeLocal(discount.expiredAt),
      _usedCount: discount.usedCount,
    },
  });

  const watchType = watch("type") ?? discount.type;
  const watchIsActive = watch("isActive");

  async function submit(values: UpdateDiscountFormValues) {
    const { id, _usedCount: _ignored, ...rest } = values;
    const payload: UpdateDiscountPayload = {
      ...rest,
      expiredAt: rest.expiredAt || null,
    };
    await onSubmit(id!, payload);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-200">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Sửa mã giảm giá</h2>
            {discount.usedCount > 0 && (
              <p className="text-xs text-amber-600 mt-0.5">
                Đã dùng {discount.usedCount} lượt — không thể xóa.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit(submit)} className="px-6 py-5">
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="edit-code">
                Mã giảm giá <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-code"
                className="uppercase"
                {...register("code")}
              />
              {errors.code && <p className="text-xs text-red-500">{errors.code.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>
                  Loại <span className="text-red-500">*</span>
                </Label>
                <Select
                  defaultValue={watchType}
                  onValueChange={(v) => setValue("type", v as DiscountType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENT">Phần trăm (%)</SelectItem>
                    <SelectItem value="FIXED">Số tiền (VND)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.type && <p className="text-xs text-red-500">{errors.type.message}</p>}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="edit-value">
                  Giá trị <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-value"
                  type="number"
                  min={1}
                  max={watchType === "PERCENT" ? 100 : undefined}
                  step={watchType === "PERCENT" ? 1 : 1000}
                  {...register("value", { valueAsNumber: true })}
                />
                {errors.value && <p className="text-xs text-red-500">{errors.value.message}</p>}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="edit-usageLimit">
                Số lượt dùng tối đa <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-usageLimit"
                type="number"
                min={discount.usedCount || 1}
                step={1}
                {...register("usageLimit", { valueAsNumber: true })}
              />
              {errors.usageLimit && (
                <p className="text-xs text-red-500">{errors.usageLimit.message}</p>
              )}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="edit-expiredAt">Ngày hết hạn</Label>
              <Input
                id="edit-expiredAt"
                type="datetime-local"
                {...register("expiredAt")}
              />
              {errors.expiredAt && (
                <p className="text-xs text-red-500">{errors.expiredAt.message}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                id="edit-isActive"
                type="checkbox"
                defaultChecked={watchIsActive ?? discount.isActive}
                className="h-4 w-4 rounded border-gray-300 accent-blue-600"
                {...register("isActive")}
              />
              <Label htmlFor="edit-isActive" className="cursor-pointer">
                Kích hoạt
              </Label>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isUpdating}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isUpdating && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDiscountCodesPage() {
  const [page, setPage] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<DiscountCode | null>(null);

  const handleKeywordChange = (value: string) => {
    setKeyword(value);
    clearTimeout((handleKeywordChange as unknown as { _t: ReturnType<typeof setTimeout> })._t);
    (handleKeywordChange as unknown as { _t: ReturnType<typeof setTimeout> })._t = setTimeout(
      () => {
        setDebouncedKeyword(value);
        setPage(0);
      },
      400,
    );
  };

  const listParams: DiscountListParams = {
    page,
    size: PAGE_SIZE,
    ...(debouncedKeyword && { keyword: debouncedKeyword }),
    ...(activeFilter === "active" && { isActive: true }),
    ...(activeFilter === "inactive" && { isActive: false }),
  };

  const { data, isLoading, isFetching, isError, refetch } = useDiscountList(listParams);
  const { createDiscount, updateDiscount, deleteDiscount, isCreating, isUpdating, deletingId } =
    useDiscountMutations();

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 0;

  const columns: TableColumn<DiscountCode>[] = [
    {
      key: "code",
      header: "Mã",
      headerClassName:
        "text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500",
      cell: (d) => (
        <span className="font-mono font-semibold text-gray-900 tracking-wider text-sm">
          {d.code}
        </span>
      ),
      skeleton: <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />,
    },
    {
      key: "type",
      header: "Loại",
      cell: (d) => <TypeBadge type={d.type} />,
      skeleton: <div className="h-5 w-10 bg-gray-100 rounded animate-pulse" />,
    },
    {
      key: "value",
      header: "Giá trị",
      cell: (d) => (
        <span className="text-sm font-medium text-gray-700">{formatValue(d.type, d.value)}</span>
      ),
      skeleton: <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />,
    },
    {
      key: "usageLimit",
      header: "Lượt dùng",
      cell: (d) => (
        <span className="text-sm text-gray-600">
          {d.usedCount}
          <span className="text-gray-400"> / {d.usageLimit}</span>
        </span>
      ),
      skeleton: <div className="h-4 w-16 bg-gray-100 rounded animate-pulse" />,
    },
    {
      key: "isActive",
      header: "Trạng thái",
      cell: (d) => <ActiveBadge active={d.isActive} />,
      skeleton: <div className="h-5 w-20 bg-gray-100 rounded-full animate-pulse" />,
    },
    {
      key: "expiredAt",
      header: "Hết hạn",
      cell: (d) => <span className="text-xs text-gray-400">{formatDate(d.expiredAt)}</span>,
      skeleton: <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />,
    },
    {
      key: "actions",
      header: "",
      headerClassName: "px-4 py-3",
      cell: (d) => {
        const isThisDeleting = deletingId === d.id;
        const canDelete = d.usedCount === 0;

        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-gray-200 text-gray-600 hover:text-cyan-700 hover:border-cyan-300"
              onClick={() => setEditTarget(d)}
            >
              <Pencil className="h-3.5 w-3.5 mr-1" />
              Sửa
            </Button>

            <ConfirmDialog
              trigger={
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isThisDeleting || !canDelete}
                  title={!canDelete ? "Không thể xóa mã đã được sử dụng" : undefined}
                  className={cn(
                    "h-8 border-gray-200 text-gray-500",
                    canDelete
                      ? "hover:text-red-600 hover:border-red-200 hover:bg-red-50"
                      : "opacity-40 cursor-not-allowed",
                  )}
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
              title="Xóa mã giảm giá?"
              description={`Mã "${d.code}" sẽ bị xóa vĩnh viễn.`}
              confirmLabel="Xóa"
              onConfirm={() => deleteDiscount(d.id)}
            />
          </div>
        );
      },
      skeleton: <div className="h-8 w-32 bg-gray-100 rounded animate-pulse" />,
    },
  ];

  return (
    <>
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          isCreating={isCreating}
          onSubmit={createDiscount}
        />
      )}

      {editTarget && (
        <EditModal
          discount={editTarget}
          onClose={() => setEditTarget(null)}
          isUpdating={isUpdating}
          onSubmit={updateDiscount}
        />
      )}

      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <Ticket className="h-6 w-6 text-cyan-600" />
              Mã giảm giá
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Quản lý và theo dõi các mã khuyến mãi.</p>
          </div>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Tạo mã mới
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Tìm theo mã..."
              value={keyword}
              onChange={(e) => handleKeywordChange(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>

          <Select
            value={activeFilter}
            onValueChange={(v) => {
              setActiveFilter(v as "all" | "active" | "inactive");
              setPage(0);
            }}
          >
            <SelectTrigger className="w-full sm:w-44 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="active">Hoạt động</SelectItem>
              <SelectItem value="inactive">Đã tắt</SelectItem>
            </SelectContent>
          </Select>

          {isFetching && !isLoading && (
            <div className="flex items-center">
              <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />
            </div>
          )}
        </div>

        {/* Table */}
        {isError ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center rounded-xl border border-gray-200 bg-white">
            <Ticket className="h-10 w-10 text-gray-200" />
            <p className="text-sm text-gray-500">Không thể tải dữ liệu.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Thử lại
            </Button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={items}
            isLoading={isLoading}
            skeletonRows={PAGE_SIZE}
            emptyMessage="Chưa có mã giảm giá nào."
            keyExtractor={(d) => d.id}
          />
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Trang {page + 1} / {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Trước
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Tiếp
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
