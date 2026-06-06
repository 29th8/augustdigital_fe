"use client";

import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, X, Ticket } from "lucide-react";
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
import { DiscountFormSchema, type DiscountFormValues } from "@/schemas/discount.schema";
import { useCreateDiscount, useUpdateDiscount } from "@/hooks/useDiscounts";
import type { DiscountCode, DiscountType } from "@/types/discount";
import type { ApiErrorResponse } from "@/types/api";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DiscountFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** When provided, the dialog opens in edit mode. */
  initialData?: DiscountCode;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert ISO string to datetime-local input value (YYYY-MM-DDTHH:MM). */
function toDateTimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  // Slice to minute precision — datetime-local doesn't handle seconds
  return iso.slice(0, 16);
}

/** Convert datetime-local value back to full ISO string for the API. */
function fromDateTimeLocal(val: string | null | undefined): string | null {
  if (!val) return null;
  return new Date(val).toISOString();
}

/** Map backend field errors to form field names. */
function applyBackendErrors(
  errors: ApiErrorResponse["errors"],
  setError: ReturnType<typeof useForm<DiscountFormValues>>["setError"],
): void {
  errors?.forEach(({ field, message }) => {
    setError(field as keyof DiscountFormValues, { message, type: "server" });
  });
}

// ─── Numeric input (no native browser validation) ────────────────────────────
// Uses type="text" + inputMode="numeric" to avoid browser step/min/max popups.
// Formats display value with Intl.NumberFormat; submits plain number to RHF.

function NumericInput({
  value,
  onChange,
  format,
  placeholder,
  className,
}: {
  value: number | undefined;
  onChange: (n: number | undefined) => void;
  /** "integer" = no decimal, "vnd" = vi-VN locale formatting */
  format?: "integer" | "vnd";
  placeholder?: string;
  className?: string;
}) {
  function formatDisplay(n: number | undefined, fmt?: string): string {
    if (n === undefined || n === null || isNaN(n as number)) return "";
    if (fmt === "vnd") {
      return new Intl.NumberFormat("vi-VN").format(n);
    }
    return String(n);
  }

  // Display string — formatted when blurred, raw digits while focused
  const [display, setDisplay] = React.useState<string>(() =>
    formatDisplay(value, format),
  );
  const [focused, setFocused] = React.useState(false);

  // Sync when value changes externally (e.g. reset())
  const prevValue = React.useRef(value);
  if (!focused && prevValue.current !== value) {
    prevValue.current = value;
    setDisplay(formatDisplay(value, format));
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Strip everything except digits (and dot for future decimal support)
    const raw = e.target.value.replace(/[^\d]/g, "");
    setDisplay(raw);
    if (raw === "") {
      onChange(undefined);
    } else {
      const parsed = Number(raw);
      onChange(isNaN(parsed) ? undefined : parsed);
    }
  }

  function handleFocus() {
    setFocused(true);
    // Show raw digits while editing
    setDisplay(value !== undefined && !isNaN(value) ? String(value) : "");
  }

  function handleBlur() {
    setFocused(false);
    // Re-format on blur
    setDisplay(formatDisplay(value, format));
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={className}
      autoComplete="off"
    />
  );
}

// ─── Custom Switch toggle ─────────────────────────────────────────────────────

function Switch({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        checked ? "bg-blue-600" : "bg-gray-200",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

// ─── Field component ──────────────────────────────────────────────────────────

function Field({
  label,
  error,
  required,
  children,
  hint,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

export function DiscountFormDialog({ open, onClose, initialData }: DiscountFormDialogProps) {
  // id === -1 is the duplicate sentinel: pre-fill with existing values but CREATE a new code.
  const isEdit = !!initialData && initialData.id > 0;
  const createMutation = useCreateDiscount();
  const updateMutation = useUpdateDiscount();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    control,
    formState: { errors },
  } = useForm<DiscountFormValues>({
    resolver: zodResolver(DiscountFormSchema),
    // defaultValues are computed from initialData at mount time.
    // The parent passes `key={editTarget?.id ?? "new"}` so the form
    // remounts fresh whenever the edit target changes — no reset() race.
    defaultValues: initialData
      ? {
          // Only set id when editing an existing record (id > 0).
          // Duplicate mode uses id === -1 as sentinel → omit id so schema treats as create.
          ...(initialData.id > 0 && { id: initialData.id }),
          code: initialData.code,
          type: initialData.type,
          value: initialData.value,
          usageLimit: initialData.usageLimit,
          isActive: initialData.isActive,
          expiredAt: toDateTimeLocal(initialData.expiredAt),
          _usedCount: initialData.id > 0 ? initialData.usedCount : 0,
        }
      : {
          code: "",
          type: "PERCENT" as const,
          value: 10,
          usageLimit: 100,
          isActive: true,
          expiredAt: null,
          _usedCount: 0,
        },
  });

  console.log("[DiscountFormDialog] mount — initialData:", initialData);

  const watchType = watch("type");
  const watchValue = watch("value");
  const watchUsageLimit = watch("usageLimit");
  const watchIsActive = watch("isActive");

  async function onSubmit(values: DiscountFormValues) {
    try {
      const payload = {
        code: values.code.trim().toUpperCase(),
        type: values.type,
        value: values.value,
        usageLimit: values.usageLimit,
        isActive: values.isActive ?? true,
        expiredAt: fromDateTimeLocal(values.expiredAt),
      };

      if (isEdit && initialData) {
        await updateMutation.mutateAsync({ id: initialData.id, payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      const apiErr = err as ApiErrorResponse;
      if (apiErr?.errors?.length) {
        applyBackendErrors(apiErr.errors, setError);
      }
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
              <Ticket className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {isEdit
                  ? "Chỉnh sửa mã giảm giá"
                  : initialData
                    ? "Nhân đôi mã giảm giá"
                    : "Tạo mã giảm giá"}
              </h2>
              {initialData && (
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  {isEdit ? initialData.code : `Sao chép từ ${initialData.code}`}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 grid gap-5">
          {/* Code */}
          <Field label="Mã voucher" required error={errors.code?.message}>
            <Input
              {...register("code")}
              placeholder="VD: SUMMER2025"
              className="uppercase font-mono tracking-wider"
              onChange={(e) => {
                const upper = e.target.value.toUpperCase().replace(/\s/g, "");
                setValue("code", upper, { shouldValidate: true });
              }}
            />
          </Field>

          {/* Type + Value row */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Loại" required error={errors.type?.message}>
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn loại" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENT">Phần trăm (%)</SelectItem>
                      <SelectItem value="FIXED">Số tiền (VND)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field
              label={watchType === "PERCENT" ? "Giá trị (%)" : "Giá trị (VND)"}
              required
              error={errors.value?.message}
            >
              <NumericInput
                value={watchValue}
                onChange={(n) => setValue("value", n as number, { shouldValidate: true })}
                format={watchType === "FIXED" ? "vnd" : "integer"}
                placeholder={watchType === "PERCENT" ? "VD: 10" : "VD: 50.000"}
              />
            </Field>
          </div>

          {/* Usage limit */}
          <Field
            label="Số lượt dùng tối đa"
            required
            error={errors.usageLimit?.message}
            hint={
              isEdit && initialData?.usedCount
                ? `Đã dùng ${initialData.usedCount} lượt`
                : undefined
            }
          >
            <NumericInput
              value={watchUsageLimit}
              onChange={(n) => setValue("usageLimit", n as number, { shouldValidate: true })}
              format="integer"
              placeholder="VD: 100"
            />
          </Field>

          {/* Expired at */}
          <Field
            label="Ngày hết hạn"
            error={errors.expiredAt?.message}
            hint="Để trống nếu không có hạn sử dụng"
          >
            <Input
              {...register("expiredAt")}
              type="datetime-local"
              min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
            />
          </Field>

          {/* Is active */}
          <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Kích hoạt</p>
              <p className="text-xs text-gray-400">Voucher có thể được sử dụng ngay</p>
            </div>
            <Switch
              id="isActive"
              checked={watchIsActive ?? true}
              onChange={(v) => setValue("isActive", v)}
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isEdit ? (
                "Lưu thay đổi"
              ) : initialData ? (
                "Tạo bản sao"
              ) : (
                "Tạo mã"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
