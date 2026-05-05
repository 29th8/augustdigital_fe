"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ShoppingBag, Tag } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/FormField";
import { useCart, CART_QUERY_KEY } from "@/hooks/useCart";
import { useCartStore } from "@/store/useCartStore";
import { OrderService } from "@/services/order.service";
import { PaymentService } from "@/services/payment.service";
import { formatVND } from "@/lib/formatVND";
import useAuthStore from "@/store/useAuthStore";
import { TOAST } from "@/lib/toastMessages";
import { savePendingOrder } from "@/hooks/usePendingOrderRecovery";
import type { Cart } from "@/types/cart";

// ─── Schema ───────────────────────────────────────────────────────────────────

const CheckoutSchema = z.object({
  email: z.string().min(1, "Email là bắt buộc.").email("Email không hợp lệ."),
  phone: z.string().min(9, "Số điện thoại không hợp lệ."),
  discountCode: z.string().optional(),
});
type CheckoutFormValues = z.infer<typeof CheckoutSchema>;

const EMPTY_CART: Cart = { items: [], totalAmount: 0 };

// ─── Page ─────────────────────────────────────────────────────────────────────

const INPUT_CLASS =
  "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:ring-cyan-500/40 focus-visible:border-cyan-500";

export default function CheckoutPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const closeCart = useCartStore((s) => s.close);
  const user = useAuthStore((s) => s.user);
  const { data: cart } = useCart();

  // ── Task 1: idempotency key — stable UUID for the lifetime of this form ──
  // Generated once on mount; if the same form is submitted twice (e.g. after a
  // network timeout that didn't actually fail), the backend can deduplicate.
  const idempotencyKeyRef = useRef<string>("");
  useEffect(() => {
    idempotencyKeyRef.current = crypto.randomUUID();
  }, []);

  // ── Task 6: duplication guard ────────────────────────────────────────────
  // useRef persists across re-renders; prevents double-submit from rapid clicks.
  const submittingRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(CheckoutSchema),
    defaultValues: {
      email: user?.email ?? "",
      phone: "",
      discountCode: "",
    },
  });

  const items = cart?.items ?? [];
  const total = cart?.totalAmount ?? 0;

  async function onSubmit(values: CheckoutFormValues) {
    // ── Task 6: hard lock prevents duplicate order creation ──────────────────
    if (submittingRef.current) return;

    if (items.length === 0) {
      toast.error("Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi đặt hàng.");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      // Step 1: Create order from cart (idempotency key prevents duplicates)
      const order = await OrderService.createOrder(
        {
          email: values.email,
          phone: values.phone,
          discountCode: values.discountCode || undefined,
        },
        idempotencyKeyRef.current,
      );

      // ── Task 7: clear cart cache immediately — backend already cleared it ──
      queryClient.setQueryData<Cart>(CART_QUERY_KEY, EMPTY_CART);
      closeCart();

      // ── Task 3: persist for order recovery on next app load ───────────────
      savePendingOrder({
        orderCode: order.orderCode,
        email: values.email,
        createdAt: Date.now(),
      });

      // Step 2: Create payment URL (VNPAY as default)
      let paymentUrl: string | null = null;
      let paymentMethod = "VNPAY";
      try {
        const payment = await PaymentService.createPayment(order.orderCode, "VNPAY");
        paymentUrl = payment.paymentUrl;
        paymentMethod = payment.method;
        if (typeof window !== "undefined") {
          sessionStorage.setItem(
            `payment-${order.orderCode}`,
            JSON.stringify({
              paymentUrl: payment.paymentUrl,
              method: payment.method,
              amount: payment.amount,
              expiredAt: payment.expiredAt,
            }),
          );
        }
      } catch {
        // Payment URL creation failed — navigate anyway; user can retry on confirmation page.
        toast.error(TOAST.PAYMENT_CREATE_ERROR);
      }

      toast.success(TOAST.ORDER_CREATED);

      // Step 3: Navigate to order confirmation
      router.push(
        `/order-confirmation/${order.orderCode}?email=${encodeURIComponent(values.email)}`,
      );

      // Open payment URL in new tab if available (non-blocking)
      if (paymentUrl && typeof window !== "undefined") {
        window.open(paymentUrl, "_blank", "noopener,noreferrer");
      }

      // Don't reset submittingRef — navigation is underway; component will unmount.
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      toast.error(apiErr?.message ?? TOAST.ORDER_CREATE_ERROR);
      // Release lock on failure so user can retry.
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Thanh toán</h1>
        <p className="text-sm text-gray-500 mt-1">Điền thông tin để hoàn tất đơn hàng.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* ─ Left: form ─ */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="md:col-span-3 flex flex-col gap-4"
        >
          {/* ── Task 2: fieldset disables all inputs during submission ── */}
          <fieldset
            disabled={isSubmitting}
            className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4"
          >
            <h2 className="text-sm font-semibold text-gray-700">Thông tin liên hệ</h2>

            <FormField htmlFor="email" label="Email" required error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                {...register("email")}
                className={INPUT_CLASS}
              />
            </FormField>

            <FormField htmlFor="phone" label="Số điện thoại" required error={errors.phone?.message}>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="0901234567"
                {...register("phone")}
                className={INPUT_CLASS}
              />
            </FormField>

            <FormField
              htmlFor="discountCode"
              label="Mã giảm giá"
              error={errors.discountCode?.message}
            >
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  id="discountCode"
                  placeholder="SAVE10 (tuỳ chọn)"
                  {...register("discountCode")}
                  className={`${INPUT_CLASS} pl-8`}
                />
              </div>
            </FormField>
          </fieldset>

          {/* ── Task 2: button disabled while submitting or cart empty ── */}
          <Button
            type="submit"
            disabled={isSubmitting || items.length === 0}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold disabled:opacity-60"
          >
            {isSubmitting ? "Đang xử lý…" : "Đặt hàng và thanh toán"}
          </Button>
        </form>

        {/* ─ Right: order summary ─ */}
        <div className="md:col-span-2">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex flex-col gap-3 sticky top-24">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Tóm tắt đơn hàng
            </h2>

            {items.length === 0 ? (
              <p className="text-xs text-gray-400">Giỏ hàng trống.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {items.map((item) => (
                  <li key={item.variantId} className="flex justify-between text-sm">
                    <span className="text-gray-700 truncate flex-1 mr-2">
                      {item.productName}{" "}
                      <span className="text-gray-400">
                        ({item.variantName} × {item.quantity})
                      </span>
                    </span>
                    <span className="text-gray-900 font-medium shrink-0">
                      {formatVND(item.subtotal)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t border-gray-200 pt-3 flex justify-between">
              <span className="text-sm font-semibold text-gray-700">Tổng cộng</span>
              <span className="text-base font-bold text-gray-900">{formatVND(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
