"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ShoppingBag,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { OrderService } from "@/services/order.service";
import { formatVND } from "@/lib/formatVND";
import type { LookupOrderResult } from "@/types/order";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SESSION_KEY = "pending-payment";

interface PendingPayment {
  orderCode: string;
  email: string;
  amount: number;
  expiredAt: string;
}

function readPendingPayment(): PendingPayment | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as PendingPayment) : null;
  } catch {
    return null;
  }
}

function resolveStatus(
  status: string | null,
  cancel: string | null,
  code: string | null,
): "success" | "cancel" | "pending" {
  if (cancel === "true") return "cancel";
  if (status === "PAID" || status === "success") return "success";
  if (status === "CANCELLED" || status === "cancel" || status === "cancelled") return "cancel";
  if (code === "00") return "success";
  return "pending";
}

// ─── Inner component ──────────────────────────────────────────────────────────

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const rawStatus = searchParams.get("status");
  const cancel = searchParams.get("cancel");
  const code = searchParams.get("code");
  // PayOS returns numeric orderCode (payment.id), not the ORD-... string
  // So we use sessionStorage for the real order_code
  const status = resolveStatus(rawStatus, cancel, code);

  const [pending, setPending] = useState<PendingPayment | null>(null);
  const [order, setOrder] = useState<LookupOrderResult | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  // Read sessionStorage only on client to avoid hydration mismatch
  useEffect(() => {
    setPending(readPendingPayment());
  }, []);

  // Invalidate orders cache
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["order"] });
  }, [queryClient]);

  // Lookup order info for display
  useEffect(() => {
    if (status !== "success" || !pending) return;

    setLookupLoading(true);
    OrderService.lookupOrder({ order_code: pending.orderCode, email: pending.email })
      .then(setOrder)
      .catch(() => {/* non-critical — UI degrades gracefully */})
      .finally(() => {
        setLookupLoading(false);
        // Clean up sessionStorage after successful lookup
        sessionStorage.removeItem(SESSION_KEY);
      });
  }, [status, pending]);

  // Auto-redirect after success
  useEffect(() => {
    if (status !== "success") return;
    const timer = setTimeout(() => router.push("/orders"), 8000);
    return () => clearTimeout(timer);
  }, [status, router]);

  // ── Cancel state ────────────────────────────────────────────────────────────
  if (status === "cancel") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md flex flex-col items-center gap-6 text-center">
          <div className="flex items-center justify-center h-20 w-20 rounded-full bg-red-50 border border-red-100">
            <XCircle className="h-10 w-10 text-red-400" />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Thanh toán bị hủy</h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              Bạn đã hủy giao dịch. Đơn hàng vẫn đang chờ thanh toán.
            </p>
            {pending?.orderCode && (
              <p className="text-xs text-gray-400 mt-1">
                Mã đơn:{" "}
                <span className="font-mono font-medium text-gray-600">{pending.orderCode}</span>
              </p>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button asChild className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold">
              <Link href="/orders">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Xem đơn hàng
              </Link>
            </Button>
            <Button asChild variant="outline" className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50">
              <Link href="/products">Tiếp tục mua sắm</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Pending state ────────────────────────────────────────────────────────────
  if (status === "pending") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md flex flex-col items-center gap-6 text-center">
          <div className="flex items-center justify-center h-20 w-20 rounded-full bg-amber-50 border border-amber-100">
            <Clock className="h-10 w-10 text-amber-400" />
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Đang xử lý</h1>
            <p className="text-sm text-gray-500">Giao dịch đang được xác nhận. Vui lòng chờ trong giây lát.</p>
          </div>
          <Button asChild className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold">
            <Link href="/orders">
              <ShoppingBag className="mr-2 h-4 w-4" />
              Xem đơn hàng
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // ── Success state ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-lg flex flex-col items-center gap-6">
        {/* Icon + title */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex items-center justify-center h-20 w-20 rounded-full bg-emerald-50 border border-emerald-100">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Thanh toán thành công!</h1>
          <p className="text-sm text-gray-500">
            Đơn hàng của bạn đã được xác nhận. Chúng tôi đang xử lý và giao hàng.
          </p>
          <p className="text-xs text-gray-400">Tự động chuyển hướng sau 8 giây...</p>
        </div>

        {/* Order summary card */}
        {lookupLoading ? (
          <div className="w-full flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 text-gray-300 animate-spin" />
          </div>
        ) : order ? (
          <div className="w-full rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="text-xs text-gray-400">Mã đơn hàng</p>
                <p className="font-mono font-semibold text-gray-900 text-sm">{order.orderCode}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Tổng tiền</p>
                <p className="font-bold text-gray-900">{formatVND(order.totalAmount)}</p>
              </div>
            </div>

            {/* Items */}
            {order.items.length > 0 && (
              <ul className="px-5 py-3 flex flex-col gap-2">
                {order.items.map((item, i) => (
                  <li key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      {item.productName}{" "}
                      <span className="text-gray-400">({item.variantName} × {item.quantity})</span>
                    </span>
                    <span className="font-medium text-gray-900">{formatVND(item.unitPrice * item.quantity)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : pending ? (
          // Fallback if lookup failed
          <div className="w-full rounded-xl border border-gray-100 bg-gray-50 px-5 py-4 text-center">
            <p className="text-xs text-gray-400">Mã đơn</p>
            <p className="font-mono font-semibold text-gray-700">{pending.orderCode}</p>
            <p className="text-sm font-bold text-gray-900 mt-1">{formatVND(pending.amount)}</p>
          </div>
        ) : null}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <Button asChild className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold">
            <Link href="/orders">
              <ShoppingBag className="mr-2 h-4 w-4" />
              Xem đơn hàng
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50">
            <Link href="/products">Tiếp tục mua sắm</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentResultPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 text-gray-200 animate-spin" />
        </div>
      }
    >
      <PaymentResultContent />
    </Suspense>
  );
}
