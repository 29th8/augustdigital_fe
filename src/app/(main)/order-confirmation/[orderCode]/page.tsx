"use client";

import { use, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  Package,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { getAppChannel } from "@/lib/channel";
import { OrderService } from "@/services/order.service";
import { PaymentService } from "@/services/payment.service";
import { clearPendingOrder } from "@/hooks/usePendingOrderRecovery";
import { formatVND } from "@/lib/formatVND";
import { TERMINAL_ORDER_STATUSES, type OrderStatus, type PaymentInfo } from "@/types/order";
import type { PaymentMethod } from "@/schemas/payment.schema";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Stop polling after 3 minutes; show manual retry option. */
const POLLING_TIMEOUT_MS = 3 * 60 * 1000;

/** Orders expire 15 minutes after creation (backend cron). */
const ORDER_EXPIRY_MS = 15 * 60 * 1000;

// ─── Countdown hook ───────────────────────────────────────────────────────────

function useOrderCountdown(createdAt: string | undefined) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    if (!createdAt) return;
    const expiresAt = new Date(createdAt).getTime() + ORDER_EXPIRY_MS;

    function tick() {
      const left = expiresAt - Date.now();
      setRemainingMs(left > 0 ? left : 0);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [createdAt]);

  if (remainingMs === null) return null;
  const mins = Math.floor(remainingMs / 60_000);
  const secs = Math.floor((remainingMs % 60_000) / 1000);
  return { mins, secs, expired: remainingMs === 0 };
}

// ─── Status display config ────────────────────────────────────────────────────

interface StatusConfig {
  icon: React.ReactNode;
  heading: string;
  subtext: string;
  color: string;
}

function getStatusConfig(
  status: OrderStatus,
  isPollingTimedOut: boolean,
): StatusConfig {
  if (isPollingTimedOut && status === "PENDING") {
    return {
      icon: <Clock className="h-12 w-12 text-amber-400" />,
      heading: "Không thể xác nhận trạng thái",
      subtext:
        "Hết thời gian chờ. Nếu bạn đã thanh toán, đơn hàng sẽ được cập nhật tự động. Kiểm tra lại sau vài phút.",
      color: "text-amber-600",
    };
  }

  switch (status) {
    case "PENDING":
      return {
        icon: <Clock className="h-12 w-12 text-amber-400 animate-pulse" />,
        heading: "Đang chờ thanh toán",
        subtext: "Vui lòng hoàn tất thanh toán. Trang này sẽ tự động cập nhật.",
        color: "text-amber-600",
      };
    case "PAID":
    case "PROCESSING":
      return {
        icon: <Loader2 className="h-12 w-12 text-cyan-500 animate-spin" />,
        heading: "Đang xử lý đơn hàng",
        subtext: "Thanh toán thành công. Chúng tôi đang xử lý đơn hàng của bạn.",
        color: "text-cyan-600",
      };
    case "COMPLETED":
      return {
        icon: <CheckCircle2 className="h-12 w-12 text-emerald-500" />,
        heading: "Thanh toán thành công",
        subtext: "Đơn hàng đã hoàn thành. Cảm ơn bạn đã mua hàng!",
        color: "text-emerald-600",
      };
    case "PARTIALLY_COMPLETED":
      return {
        icon: <CheckCircle2 className="h-12 w-12 text-emerald-400" />,
        heading: "Hoàn thành một phần",
        subtext: "Một số sản phẩm đã được giao. Phần còn lại sẽ được xử lý sau.",
        color: "text-emerald-500",
      };
    case "PAID_PENDING_STOCK":
      return {
        icon: <CheckCircle2 className="h-12 w-12 text-cyan-500" />,
        heading: "Đã thanh toán — Đang chờ hàng",
        subtext: "Thanh toán thành công nhưng sản phẩm hiện hết hàng. Chúng tôi sẽ liên hệ sớm.",
        color: "text-cyan-600",
      };
    case "FAILED":
      return {
        icon: <XCircle className="h-12 w-12 text-red-400" />,
        heading: "Thanh toán thất bại",
        subtext: "Giao dịch không thành công. Bạn có thể thử lại hoặc đặt đơn hàng mới.",
        color: "text-red-500",
      };
    case "EXPIRED":
      return {
        icon: <XCircle className="h-12 w-12 text-gray-400" />,
        heading: "Hết thời gian thanh toán",
        subtext: "Đơn hàng đã hết hạn (quá 15 phút). Vui lòng tạo đơn hàng mới.",
        color: "text-gray-500",
      };
    default:
      return {
        icon: <AlertCircle className="h-12 w-12 text-gray-400" />,
        heading: "Trạng thái không xác định",
        subtext: "Vui lòng liên hệ hỗ trợ.",
        color: "text-gray-500",
      };
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderCode: string }>;
}) {
  const { orderCode } = use(params);
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);

  // ── Task 4: polling timeout ────────────────────────────────────────────────
  // pollingReset counter re-arms the 3-minute timeout when user retries polling.
  const [pollingReset, setPollingReset] = useState(0);
  const [isPollingTimedOut, setIsPollingTimedOut] = useState(false);
  // Track whether order reached a terminal state for timeout guard.
  const isTerminalRef = useRef(false);

  // Load payment info from sessionStorage (set during checkout)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(`payment-${orderCode}`);
    if (raw) {
      try {
        setPaymentInfo(JSON.parse(raw) as PaymentInfo);
      } catch {
        // ignore malformed storage
      }
    }
  }, [orderCode]);

  // ── Task 4: arm/re-arm the 3-minute polling timeout ───────────────────────
  useEffect(() => {
    if (isTerminalRef.current) return;
    setIsPollingTimedOut(false);
    const timer = setTimeout(() => setIsPollingTimedOut(true), POLLING_TIMEOUT_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollingReset]); // intentionally omit isTerminalRef — we use the ref directly

  const pollingActive = !isPollingTimedOut;

  // ── Task 5: network-error retry + polling ─────────────────────────────────
  const {
    data: order,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["order-confirmation", orderCode, email],
    queryFn: () => OrderService.lookupOrder({ order_code: orderCode, email }),
    enabled: Boolean(orderCode) && Boolean(email),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!pollingActive) return false;
      if (status && TERMINAL_ORDER_STATUSES.includes(status)) return false;
      return 4000;
    },
    staleTime: 0,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });

  // Update terminal ref so the timeout effect doesn't re-arm after success.
  const isTerminal = Boolean(order?.status && TERMINAL_ORDER_STATUSES.includes(order.status));
  isTerminalRef.current = isTerminal;

  // ── Task 3: clear pending-order from localStorage once resolved ───────────
  useEffect(() => {
    if (isTerminal) clearPendingOrder();
  }, [isTerminal]);

  // ── Task 2: broadcast order status to other tabs ───────────────────────────
  useEffect(() => {
    if (!order?.status) return;
    getAppChannel().post({ type: "ORDER_STATUS", orderCode, status: order.status });
  }, [order?.status, orderCode]);

  // ── Task 5: retry payment handler ─────────────────────────────────────────
  async function handleRetryPayment() {
    const method = (paymentInfo?.method ?? "PAYOS") as PaymentMethod;
    setIsCreatingPayment(true);
    try {
      const payment = await PaymentService.createPayment(orderCode, method);
      const updated: PaymentInfo = {
        paymentUrl: payment.paymentUrl ?? "",
        method: payment.method,
        amount: payment.amount,
        expiredAt: payment.expiredAt,
      };
      setPaymentInfo(updated);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`payment-${orderCode}`, JSON.stringify(updated));
        if (payment.paymentUrl) window.location.href = payment.paymentUrl;
      }
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      toast.error(apiErr?.message ?? "Không thể tạo liên kết thanh toán mới.");
    } finally {
      setIsCreatingPayment(false);
    }
  }

  // ── Task 4: retry polling ─────────────────────────────────────────────────
  function handleRetryPolling() {
    setPollingReset((n) => n + 1); // re-arms the 3-minute timeout via useEffect
    refetch();
  }

  // ── Countdown — must be before any early returns (Rules of Hooks) ──────────
  const countdown = useOrderCountdown(
    order?.status === "PENDING" ? order.createdAt : undefined,
  );

  // ─── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="h-8 w-8 text-cyan-500 animate-spin" />
        <p className="text-sm text-gray-500">Đang tải thông tin đơn hàng…</p>
      </div>
    );
  }

  // ── Task 5: network error state ────────────────────────────────────────────
  if (isError || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <AlertCircle className="h-12 w-12 text-red-300" />
        <div>
          <p className="text-gray-700 font-medium">Lỗi kết nối</p>
          <p className="text-sm text-gray-500 mt-1">
            Không thể tải thông tin đơn hàng. Vui lòng kiểm tra kết nối mạng.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => refetch()}
            size="sm"
            className="bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Thử lại
          </Button>
          <Button asChild variant="outline" size="sm" className="border-gray-200">
            <Link href="/products">Về trang chủ</Link>
          </Button>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(order.status, isPollingTimedOut && !isTerminal);

  // ── Free order (fully covered by discount) — no payment needed ───────────
  const isFreeOrder = order.status === "PENDING" && order.totalAmount <= 0;

  // ── Task 3/4: Pay Now — visible while PENDING and we have a fresh URL ─────
  const showPayNow = order.status === "PENDING" && !isFreeOrder && !!paymentInfo?.paymentUrl && !isPollingTimedOut;

  // ── Task 4: Create payment link — when user returns without sessionStorage ─
  // Show immediately if order is PENDING but we have no payment URL in state.
  // Also show after polling times out (existing URL likely expired).
  const showCreatePaymentLink =
    order.status === "PENDING" && !isFreeOrder && (!paymentInfo?.paymentUrl || isPollingTimedOut);

  const showRetryPolling = isPollingTimedOut && !isTerminal;

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-6">
      {/* ── Task 3: Status card ─────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col items-center gap-3 text-center">
        {statusConfig.icon}

        <div>
          <p className={`text-sm font-semibold ${statusConfig.color}`}>
            {statusConfig.heading}
          </p>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5 font-mono">{orderCode}</h1>
          <p className="text-xs text-gray-500 mt-1 max-w-xs">{statusConfig.subtext}</p>
        </div>

        {/* Polling indicator */}
        {!isTerminal && !isPollingTimedOut && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            Đang cập nhật tự động…
          </div>
        )}

        {/* 15-minute payment countdown (PENDING only) */}
        {order.status === "PENDING" && countdown && (
          <div className={`flex items-center gap-1.5 text-xs font-medium ${
            countdown.expired
              ? "text-red-500"
              : countdown.mins < 2
              ? "text-amber-600"
              : "text-gray-500"
          }`}>
            <Clock className="h-3 w-3" />
            {countdown.expired
              ? "Đơn hàng đã hết hạn thanh toán"
              : `Thanh toán trong: ${countdown.mins}:${String(countdown.secs).padStart(2, "0")}`}
          </div>
        )}

        {/* ── Free order — no payment needed ── */}
        {isFreeOrder && (
          <div className="flex flex-col items-center gap-1.5 mt-1">
            <p className="text-xs text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              Đơn hàng này được miễn phí bởi mã giảm giá — không cần thanh toán.
            </p>
          </div>
        )}

        {/* ── Task 3: Pay Now button (PENDING, within timeout) ── */}
        {showPayNow && (
          <a
            href={paymentInfo.paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-colors mt-1"
          >
            Thanh toán ngay ({paymentInfo.method})
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}

        {/* ── Task 4/5: Create / retry payment link ── */}
        {showCreatePaymentLink && (
          <Button
            onClick={handleRetryPayment}
            disabled={isCreatingPayment}
            className="bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold mt-1"
          >
            {isCreatingPayment ? (
              <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Đang tạo liên kết…</>
            ) : (
              <><ExternalLink className="mr-2 h-3.5 w-3.5" />Tạo liên kết thanh toán</>
            )}
          </Button>
        )}

        {/* ── Task 4: Retry polling after timeout ── */}
        {showRetryPolling && (
          <button
            onClick={handleRetryPolling}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Kiểm tra lại trạng thái
          </button>
        )}

        {/* ── Task 5: FAILED order — suggest new order ── */}
        {order.status === "FAILED" && (
          <Button asChild size="sm" className="bg-cyan-600 hover:bg-cyan-500 text-white mt-1">
            <Link href="/products">Đặt đơn hàng mới</Link>
          </Button>
        )}
      </div>

      {/* Order details */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-gray-700">Chi tiết đơn hàng</h2>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <span className="text-gray-500">Email</span>
          <span className="text-gray-900 text-right truncate">{order.email}</span>
          <span className="text-gray-500">Điện thoại</span>
          <span className="text-gray-900 text-right">{order.phone}</span>
          <span className="text-gray-500">Ngày đặt</span>
          <span className="text-gray-900 text-right">
            {new Date(order.createdAt).toLocaleString("vi-VN")}
          </span>
        </div>

        <ul className="flex flex-col gap-2 border-t border-gray-100 pt-3">
          {order.items.map((item, idx) => (
            <li key={idx} className="flex justify-between text-sm">
              <span className="text-gray-700 flex-1 mr-2">
                {item.productName}{" "}
                <span className="text-gray-400">
                  ({item.variantName} × {item.quantity})
                </span>
              </span>
              <span className="text-gray-900 font-medium shrink-0">
                {formatVND(item.unitPrice * item.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex justify-between border-t border-gray-100 pt-3">
          <span className="text-sm font-semibold text-gray-700">Tổng cộng</span>
          <span className="text-base font-bold text-gray-900">
            {formatVND(order.totalAmount)}
          </span>
        </div>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Tra cứu đơn hàng bằng mã{" "}
        <span className="font-mono font-semibold text-gray-600">{orderCode}</span>{" "}
        và email đã đăng ký.
      </p>

      <div className="flex justify-center gap-3">
        <Button asChild variant="outline" size="sm" className="border-gray-200 text-gray-600">
          <Link href={order.id ? `/orders/${order.id}` : `/orders/${orderCode}?email=${encodeURIComponent(email)}`}>
            <Package className="mr-1.5 h-3.5 w-3.5" />
            Xem chi tiết đơn hàng
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="border-gray-200 text-gray-600">
          <Link href="/products">Tiếp tục mua sắm</Link>
        </Button>
      </div>
    </div>
  );
}
