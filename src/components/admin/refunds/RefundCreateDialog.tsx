"use client";

import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, X, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateRefund } from "@/hooks/useRefunds";

// ─── Schema ───────────────────────────────────────────────────────────────────

const CreateRefundSchema = z.object({
  orderId: z.number({ message: "Order ID phải là số." }).int().positive(),
  amount: z
    .number({ message: "Số tiền phải là số." })
    .positive({ message: "Số tiền phải lớn hơn 0." }),
  reason: z.string().min(5, "Lý do phải có ít nhất 5 ký tự."),
});

type CreateRefundValues = z.infer<typeof CreateRefundSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RefundCreateDialogProps {
  open: boolean;
  onClose: () => void;
}

// ─── NumericInput ─────────────────────────────────────────────────────────────

function NumericInput({
  value,
  onChange,
  format,
  placeholder,
  className,
}: {
  value: number | undefined;
  onChange: (n: number | undefined) => void;
  format?: "integer" | "vnd";
  placeholder?: string;
  className?: string;
}) {
  function formatDisplay(n: number | undefined, fmt?: string): string {
    if (n === undefined || n === null || isNaN(n as number)) return "";
    if (fmt === "vnd") return new Intl.NumberFormat("vi-VN").format(n);
    return String(n);
  }

  const [display, setDisplay] = React.useState<string>(() => formatDisplay(value, format));
  const [focused, setFocused] = React.useState(false);

  const prevValue = React.useRef(value);
  if (!focused && prevValue.current !== value) {
    prevValue.current = value;
    setDisplay(formatDisplay(value, format));
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
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
    setDisplay(value !== undefined && !isNaN(value) ? String(value) : "");
  }

  function handleBlur() {
    setFocused(false);
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

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

export default function RefundCreateDialog({ open, onClose }: RefundCreateDialogProps) {
  const createMutation = useCreateRefund(() => {
    reset();
    onClose();
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    control,
    formState: { errors },
  } = useForm<CreateRefundValues>({
    resolver: zodResolver(CreateRefundSchema),
    defaultValues: {
      reason: "",
    },
  });

  const watchOrderId = watch("orderId");
  const watchAmount = watch("amount");

  async function onSubmit(values: CreateRefundValues) {
    await createMutation.mutateAsync({
      orderId: values.orderId,
      amount: values.amount,
      reason: values.reason.trim(),
    });
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
              <RefreshCcw className="h-4 w-4 text-blue-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Tạo yêu cầu hoàn tiền</h2>
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
          {/* Order ID */}
          <Field label="Order ID" required error={errors.orderId?.message}>
            <Controller
              control={control}
              name="orderId"
              render={() => (
                <NumericInput
                  value={watchOrderId}
                  onChange={(n) => setValue("orderId", n as number, { shouldValidate: true })}
                  format="integer"
                  placeholder="VD: 1234"
                />
              )}
            />
          </Field>

          {/* Amount */}
          <Field label="Số tiền hoàn (VND)" required error={errors.amount?.message}>
            <Controller
              control={control}
              name="amount"
              render={() => (
                <NumericInput
                  value={watchAmount}
                  onChange={(n) => setValue("amount", n as number, { shouldValidate: true })}
                  format="vnd"
                  placeholder="VD: 500.000"
                />
              )}
            />
          </Field>

          {/* Reason */}
          <Field label="Lý do hoàn tiền" required error={errors.reason?.message}>
            <textarea
              {...register("reason")}
              rows={3}
              placeholder="Nhập lý do yêu cầu hoàn tiền (ít nhất 5 ký tự)..."
              className="w-full resize-none rounded-md border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 disabled:opacity-60 transition-colors"
              disabled={createMutation.isPending}
            />
          </Field>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={createMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Tạo hoàn tiền"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
