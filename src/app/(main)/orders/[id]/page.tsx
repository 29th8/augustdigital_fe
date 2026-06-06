"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShoppingBag,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  SearchX,
  RotateCcw,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import DeliveryCredentialsCard from "@/components/orders/DeliveryCredentialsCard";
import LookupCredentialsCard from "@/components/orders/LookupCredentialsCard";
import OrderTimeline from "@/components/orders/OrderTimeline";
import PaymentCountdown from "@/components/orders/PaymentCountdown";
import PartialDeliveryAlert from "@/components/orders/PartialDeliveryAlert";
import WarrantySubmitDialog from "@/components/warranty/WarrantySubmitDialog";
import RefundRequestDialog from "@/components/refund/RefundRequestDialog";
import { useOrderDetail } from "@/hooks/useOrders";
import { useOrderLookup } from "@/hooks/useOrderLookup";
import { PaymentService } from "@/services/payment.service";
import { formatVND } from "@/lib/formatVND";
import { toast } from "sonner";
import { TOAST } from "@/lib/toastMessages";
import type { ApiErrorResponse } from "@/types/api";
import type { PaymentMethod } from "@/schemas/payment.schema";
import type { LookupOrderResult, DeliveryItem } from "@/types/order";

// ─── Skeleton ────────────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      <div className="h-7 w-48 bg-gray-100 rounded" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="rounded-xl border border-gray-200 h-40 bg-gray-50" />
          <div className="rounded-xl border border-gray-200 h-64 bg-gray-50" />
        </div>
        <div className="rounded-xl border border-gray-200 h-64 bg-gray-50" />
      </div>
    </div>
  );
}

// ─── Date formatter ───────────────────────────────────────────────────────────

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

// ─── Error message helper ─────────────────────────────────────────────────────

function getGuestErrorMessage(err: unknown): { title: string; detail: string } {
  const apiErr = err as { code?: number; message?: string };
  if (apiErr?.code === 404) {
    return {
      title: "Không tìm thấy đơn hàng",
      detail: "Mã đơn hàng không tồn tại hoặc đã bị xóa. Vui lòng kiểm tra lại.",
    };
  }
  if (apiErr?.code === 400) {
    return {
      title: "Email không khớp",
      detail: "Email không trùng với email đặt hàng. Vui lòng kiểm tra lại.",
    };
  }
  return {
    title: "Không thể tải đơn hàng",
    detail: apiErr?.message ?? "Đã có lỗi xảy ra. Vui lòng thử lại sau.",
  };
}

// ─── Guest detail view ────────────────────────────────────────────────────────

interface GuestDetailViewProps {
  orderCode: string;
  email: string;
}

function GuestDetailView({ orderCode, email }: GuestDetailViewProps) {
  const { data: order, isLoading, isError, error, refetch } = useOrderLookup({ orderCode, email });

  if (isLoading) return <DetailSkeleton />;

  if (isError || !order) {
    const { title, detail } = getGuestErrorMessage(error);
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <div className="h-14 w-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
          <AlertCircle className="h-7 w-7 text-red-400" />
        </div>
        <div>
          <p className="text-base font-semibold text-gray-900">{title}</p>
          <p className="text-sm text-gray-500 mt-1 max-w-xs">{detail}</p>
        </div>
        <div className="flex gap-2 mt-1">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Thử lại
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/orders">
              <SearchX className="h-3.5 w-3.5 mr-1.5" />
              Tra cứu lại
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const isPending = order.status === "PENDING";
  const hasDeliveries = order.deliveries.length > 0;
  const isPartial =
    order.status === "PARTIALLY_COMPLETED" || order.status === "PAID_PENDING_STOCK";

  // Build timeline-compatible object from LookupOrderResult
  const timelineOrder = {
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt ?? order.createdAt,
    paidAt: order.paidAt ?? null,
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <Link
        href="/orders"
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Tra cứu lại
      </Link>

      {/* Order header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900 font-mono tracking-wide">
              {order.orderCode}
            </h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-sm text-gray-500">Đặt ngày {formatDate(order.createdAt)}</p>
        </div>
        <p className="text-2xl font-bold text-gray-900">{formatVND(order.totalAmount)}</p>
      </div>

      {/* Payment countdown (PENDING) */}
      {isPending && (
        <PaymentCountdown createdAt={order.createdAt} expiryMinutes={15} />
      )}

      {/* Partial delivery alert (reuse existing component if order shape compatible) */}
      {isPartial && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-purple-50 border border-purple-100">
          <ShieldCheck className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
          <p className="text-sm text-purple-700">
            Đơn hàng đang được xử lý một phần. Chúng tôi sẽ gửi sản phẩm còn lại khi có hàng.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: items + deliveries */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Order items */}
          <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-700">Sản phẩm đặt mua</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-gray-900">{item.productName}</span>
                    <span className="text-xs text-gray-400">
                      {item.variantName} × {item.quantity}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatVND(item.unitPrice * item.quantity)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between px-5 py-3 bg-gray-50">
                <span className="text-sm font-semibold text-gray-700">Tổng cộng</span>
                <span className="text-base font-bold text-gray-900">
                  {formatVND(order.totalAmount)}
                </span>
              </div>
            </div>
          </section>

          {/* Delivery credentials */}
          {hasDeliveries && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-gray-700 px-0.5">
                Thông tin sản phẩm đã giao ({order.deliveries.length})
              </h2>
              {order.deliveries.map((delivery, i) => (
                <LookupCredentialsCard key={i} delivery={delivery} index={i} />
              ))}
            </section>
          )}
        </div>

        {/* Right column: timeline + order info */}
        <aside className="flex flex-col gap-5">
          {/* Order timeline */}
          <section className="rounded-xl border border-gray-200 bg-white px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Tiến trình đơn hàng</h2>
            <OrderTimeline order={timelineOrder} />
          </section>

          {/* Order info */}
          <section className="rounded-xl border border-gray-200 bg-white px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Thông tin đơn hàng</h2>
            <dl className="flex flex-col gap-2.5">
              {[
                { label: "Mã đơn", value: order.orderCode, mono: true },
                { label: "Email", value: order.email },
                ...(order.phone ? [{ label: "Điện thoại", value: order.phone }] : []),
                { label: "Ngày đặt", value: formatDate(order.createdAt) },
                ...(order.paidAt
                  ? [{ label: "Thanh toán lúc", value: formatDate(order.paidAt) }]
                  : []),
              ].map(({ label, value, mono }) => (
                <div key={label} className="flex items-start justify-between gap-2">
                  <dt className="text-xs text-gray-400 shrink-0">{label}</dt>
                  <dd className={`text-xs text-gray-800 text-right ${mono ? "font-mono" : ""}`}>
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

// ─── Auth detail view ─────────────────────────────────────────────────────────

interface AuthDetailViewProps {
  id: number;
}

function AuthDetailView({ id }: AuthDetailViewProps) {
  const router = useRouter();
  const { data: order, isLoading, isFetching, isError, refetch } = useOrderDetail(id);
  const [warrantyTarget, setWarrantyTarget] = useState<DeliveryItem | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);

  const retryPayment = useMutation<{ paymentUrl: string | undefined }, ApiErrorResponse, void>({
    mutationFn: async () => {
      const result = await PaymentService.createPayment(
        order!.orderCode,
        "PAYOS" as PaymentMethod,
      );
      return { paymentUrl: result.paymentUrl };
    },
    onSuccess: ({ paymentUrl }) => {
      if (paymentUrl) window.location.href = paymentUrl;
    },
    onError: (err) => toast.error(err?.message ?? TOAST.PAYMENT_CREATE_ERROR),
  });

  if (isLoading) return <DetailSkeleton />;

  if (isError || !order) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <ShoppingBag className="h-10 w-10 text-gray-300" />
        <p className="text-sm text-gray-500">Không thể tải thông tin đơn hàng.</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Thử lại
          </Button>
          <Button variant="ghost" size="sm" onClick={() => router.push("/orders")}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
            Danh sách đơn
          </Button>
        </div>
      </div>
    );
  }

  const isPending = order.status === "PENDING";
  const isExpired = order.status === "EXPIRED";
  const hasDeliveries = order.deliveries.length > 0;
  const isPartial =
    order.status === "PARTIALLY_COMPLETED" || order.status === "PAID_PENDING_STOCK";
  const canRefund =
    order.status === "COMPLETED" || order.status === "PARTIALLY_COMPLETED";

  return (
    <>
      {warrantyTarget && warrantyTarget.orderItemId && (
        <WarrantySubmitDialog
          open={!!warrantyTarget}
          onClose={() => setWarrantyTarget(null)}
          orderItemId={warrantyTarget.orderItemId}
          productName={warrantyTarget.productName}
          variantName={warrantyTarget.variantName}
        />
      )}
      <RefundRequestDialog
        open={refundOpen}
        onClose={() => setRefundOpen(false)}
        orderId={id}
        orderCode={order?.orderCode ?? ""}
      />

    <div className="flex flex-col gap-6">
      {/* Back link */}
      <Link
        href="/orders"
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Tất cả đơn hàng
      </Link>

      {/* Order header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-gray-900 font-mono tracking-wide">
              {order.orderCode}
            </h1>
            <OrderStatusBadge status={order.status} />
            {isFetching && !isLoading && (
              <RefreshCw className="h-3.5 w-3.5 text-blue-400 animate-spin" />
            )}
          </div>
          <p className="text-sm text-gray-500">Đặt ngày {formatDate(order.createdAt)}</p>
        </div>
        <p className="text-2xl font-bold text-gray-900">{formatVND(order.totalAmount)}</p>
      </div>

      {/* Payment countdown + retry (PENDING / EXPIRED) */}
      {(isPending || isExpired) && (
        <div className="flex flex-col gap-3">
          {isPending && order.totalAmount > 0 && (
            <PaymentCountdown createdAt={order.createdAt} expiryMinutes={15} />
          )}
          {isPending && order.totalAmount <= 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <p className="text-sm text-emerald-700 flex-1">
                Đơn hàng này được miễn phí bởi mã giảm giá — không cần thanh toán.
              </p>
            </div>
          )}
          {isExpired && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200">
              <p className="text-sm text-gray-500 flex-1">
                Đơn hàng đã hết hạn. Bạn có thể đặt lại hoặc liên hệ hỗ trợ.
              </p>
              <Link href="/products">
                <Button size="sm" variant="outline">
                  Đặt lại
                </Button>
              </Link>
            </div>
          )}
          {isPending && order.totalAmount > 0 && (
            <Button
              onClick={() => retryPayment.mutate()}
              disabled={retryPayment.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
            >
              {retryPayment.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Thanh toán ngay
            </Button>
          )}
        </div>
      )}

      {/* Partial delivery alert */}
      {isPartial && <PartialDeliveryAlert order={order} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: items + deliveries */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Order items */}
          <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
              <h2 className="text-sm font-semibold text-gray-700">Sản phẩm đặt mua</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-gray-900">{item.productName}</span>
                    <span className="text-xs text-gray-400">
                      {item.variantName} × {item.quantity}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatVND(item.subtotal)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between px-5 py-3 bg-gray-50">
                <span className="text-sm font-semibold text-gray-700">Tổng cộng</span>
                <span className="text-base font-bold text-gray-900">
                  {formatVND(order.totalAmount)}
                </span>
              </div>
            </div>
          </section>

          {/* Delivery credentials */}
          {hasDeliveries && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-gray-700 px-0.5">
                Thông tin sản phẩm đã giao ({order.deliveries.length})
              </h2>
              {order.deliveries.map((delivery, i) => (
                <div key={delivery.id} className="flex flex-col gap-2">
                  <DeliveryCredentialsCard item={delivery} index={i} />
                  {/* Warranty button */}
                  <div className="flex items-center justify-end gap-2">
                    {delivery.warrantyStatus === "RESOLVED" && (
                      <span className="text-xs text-green-600 font-medium">
                        Đã bảo hành 1 lần ·
                      </span>
                    )}
                    {delivery.warrantyStatus === "REJECTED" && (
                      <span className="text-xs text-red-500 font-medium">
                        Bảo hành bị từ chối ·
                      </span>
                    )}
                    {delivery.warrantyStatus === "CLAIMED" ? (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-xs font-medium text-amber-600">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Đang xử lý bảo hành
                      </span>
                    ) : delivery.warrantyStatus === "PENDING_STOCK" ? (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 text-xs font-medium text-purple-600">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Chờ hàng về
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={!delivery.orderItemId}
                        onClick={() => setWarrantyTarget(delivery)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-xs font-medium text-amber-700 hover:bg-amber-100 hover:border-amber-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Yêu cầu bảo hành
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </section>
          )}
        </div>

        {/* Right column: timeline + order info */}
        <aside className="flex flex-col gap-5">
          {/* Order timeline */}
          <section className="rounded-xl border border-gray-200 bg-white px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Tiến trình đơn hàng</h2>
            <OrderTimeline order={order} />
          </section>

          {/* Order info */}
          <section className="rounded-xl border border-gray-200 bg-white px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Thông tin đơn hàng</h2>
            <dl className="flex flex-col gap-2.5">
              {[
                { label: "Mã đơn", value: order.orderCode, mono: true },
                { label: "Email", value: order.email },
                { label: "Điện thoại", value: order.phone },
                { label: "Ngày đặt", value: formatDate(order.createdAt) },
                ...(order.paidAt
                  ? [{ label: "Thanh toán lúc", value: formatDate(order.paidAt) }]
                  : []),
              ].map(({ label, value, mono }) => (
                <div key={label} className="flex items-start justify-between gap-2">
                  <dt className="text-xs text-gray-400 shrink-0">{label}</dt>
                  <dd
                    className={`text-xs text-gray-800 text-right ${mono ? "font-mono" : ""}`}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Refund request */}
          {canRefund && (
            <button
              type="button"
              onClick={() => setRefundOpen(true)}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm font-medium text-red-600 hover:bg-red-100 hover:border-red-300 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              Yêu cầu hoàn tiền
            </button>
          )}
        </aside>
      </div>
    </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ email?: string }>;
}

export default function OrderDetailPage({ params, searchParams }: PageProps) {
  const { id: rawId } = use(params);
  const { email } = use(searchParams);

  // Guest mode: email is present in search params
  if (email) {
    return <GuestDetailView orderCode={rawId} email={email} />;
  }

  // Auth mode: id is a numeric DB id
  const numericId = Number(rawId);

  return <AuthDetailView id={numericId} />;
}
