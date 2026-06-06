"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Package, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─── Schema ───────────────────────────────────────────────────────────────────

const lookupFormSchema = z.object({
  orderCode: z.string().min(1, "Vui lòng nhập mã đơn hàng"),
  email: z.string().email("Địa chỉ email không hợp lệ"),
});

export type LookupFormValues = z.infer<typeof lookupFormSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface OrderLookupFormProps {
  onSubmit: (values: LookupFormValues) => void;
  isLoading: boolean;
  error: string | null;
  defaultOrderCode?: string;
  defaultEmail?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrderLookupForm({
  onSubmit,
  isLoading,
  error,
  defaultOrderCode = "",
  defaultEmail = "",
}: OrderLookupFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LookupFormValues>({
    resolver: zodResolver(lookupFormSchema),
    defaultValues: {
      orderCode: defaultOrderCode,
      email: defaultEmail,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {/* Icon header */}
      <div className="flex flex-col items-center gap-3 pb-2">
        <div className="h-14 w-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
          <Package className="h-7 w-7 text-blue-600" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">Tra cứu đơn hàng</h2>
          <p className="text-sm text-gray-500 mt-1">
            Nhập mã đơn hàng và email để xem thông tin giao hàng
          </p>
        </div>
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-4">
        {/* Order code */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700" htmlFor="orderCode">
            Mã đơn hàng
          </label>
          <Input
            id="orderCode"
            placeholder="VD: ORD-20260412-ABC123"
            autoComplete="off"
            autoCapitalize="characters"
            className={cn(
              "bg-white font-mono",
              errors.orderCode && "border-red-400 focus-visible:ring-red-300",
            )}
            {...register("orderCode")}
          />
          {errors.orderCode && (
            <p className="text-xs text-red-500">{errors.orderCode.message}</p>
          )}
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700" htmlFor="email">
            Email đặt hàng
          </label>
          <Input
            id="email"
            type="email"
            placeholder="email@example.com"
            autoComplete="email"
            className={cn(
              "bg-white",
              errors.email && "border-red-400 focus-visible:ring-red-300",
            )}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>
      </div>

      {/* API error */}
      {error && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-red-50 border border-red-200">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 text-sm font-semibold"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Đang tìm kiếm...
          </>
        ) : (
          "Tra cứu đơn hàng"
        )}
      </Button>
    </form>
  );
}
