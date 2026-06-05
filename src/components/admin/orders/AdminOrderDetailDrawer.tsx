"use client";

import { useState } from "react";
import {
  RefreshCw,
  CreditCard,
  RotateCcw,
  XCircle,
  Send,
  ChevronDown,
  ChevronUp,
  Package,
  Clock,
  User,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import OrderStatusBadge from "@/components/orders/OrderStatusBadge";
import OrderTimeline from "@/components/orders/OrderTimeline";
import { useAdminOrderDetail, useAdminOrderMutations } from "@/hooks/useOrders";
import { formatVND } from "@/lib/formatVND";
import { cn } from "@/lib/utils";
import type { InventoryAllocation, AuditLog } from "@/types/order";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  children,
  collapsible = false,
}: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <button
        type="button"
        className={cn(
          "flex w-full items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200",
          collapsible && "cursor-pointer hover:bg-gray-100 transition-colors",
        )}
        onClick={() => collapsible && setOpen((v) => !v)}
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {title}
        </span>
        {collapsible && (
          open ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        )}
      </button>
      {open && <div className="px-4 py-3">{children}</div>}
    </div>
  );
}

// ─── Inventory allocation table ───────────────────────────────────────────────

function AllocationTable({ allocations }: { allocations: InventoryAllocation[] }) {
  if (allocations.length === 0) {
    return <p className="text-xs text-gray-400">Không có dữ liệu phân bổ.</p>;
  }
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-gray-400 border-b border-gray-100">
          <th className="text-left pb-2 font-medium">Variant</th>
          <th className="text-center pb-2 font-medium">Yêu cầu</th>
          <th className="text-center pb-2 font-medium">Phân bổ</th>
          <th className="text-center pb-2 font-medium">Chờ</th>
          <th className="text-center pb-2 font-medium">Lỗi</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {allocations.map((a) => (
          <tr key={a.variantId}>
            <td className="py-1.5 text-gray-800">{a.variantName}</td>
            <td className="py-1.5 text-center text-gray-700">{a.requested}</td>
            <td className="py-1.5 text-center text-green-600 font-medium">{a.allocated}</td>
            <td className="py-1.5 text-center text-amber-500">{a.pending}</td>
            <td className="py-1.5 text-center text-red-500">{a.failed}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Audit log list ───────────────────────────────────────────────────────────

function AuditLogList({ logs }: { logs: AuditLog[] }) {
  if (logs.length === 0) {
    return <p className="text-xs text-gray-400">Chưa có lịch sử.</p>;
  }
  return (
    <ol className="flex flex-col gap-2">
      {logs.map((log, i) => (
        <li key={`${log.action}-${i}`} className="flex items-start gap-2">
          <Clock className="h-3.5 w-3.5 text-gray-300 mt-0.5 shrink-0" />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-gray-700">{log.action}</span>
            <span className="text-[11px] text-gray-400">
              {log.performedBy} · {formatDate(log.performedAt)}
            </span>
            {log.details && (
              <span className="text-[11px] text-gray-500 italic">{log.details}</span>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ─── Main drawer ──────────────────────────────────────────────────────────────

interface AdminOrderDetailDrawerProps {
  orderId: number | null;
  onClose: () => void;
}

export default function AdminOrderDetailDrawer({
  orderId,
  onClose,
}: AdminOrderDetailDrawerProps) {
  const { data: order, isLoading, isFetching, refetch } = useAdminOrderDetail(orderId);
  const mutations = useAdminOrderMutations(orderId ?? 0, () => refetch());

  const isPending = mutations.markAsPaid.isPending ||
    mutations.retryAllocation.isPending ||
    mutations.cancelOrder.isPending;

  return (
    <Dialog open={orderId !== null} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="w-full max-w-xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <DialogHeader className="px-5 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base font-bold text-gray-900">
              {order ? (
                <span className="font-mono">{order.orderCode}</span>
              ) : (
                "Chi tiết đơn hàng"
              )}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {isFetching && !isLoading && (
                <RefreshCw className="h-3.5 w-3.5 text-blue-400 animate-spin" />
              )}
              {order && <OrderStatusBadge status={order.status} />}
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-4">
          {isLoading ? (
            <div className="flex flex-col gap-4 animate-pulse">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 bg-gray-50 rounded-lg border border-gray-200" />
              ))}
            </div>
          ) : !order ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <Package className="h-8 w-8 text-gray-200" />
              <p className="text-sm text-gray-500">Không tải được đơn hàng.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Thử lại
              </Button>
            </div>
          ) : (
            <>
              {/* Summary row */}
              <div className="flex items-center justify-between py-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-gray-400">Tổng tiền</span>
                  <span className="text-xl font-bold text-gray-900">
                    {formatVND(order.totalAmount)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 text-right">
                  <span className="text-xs text-gray-400">Ngày đặt</span>
                  <span className="text-xs text-gray-700">{formatDate(order.createdAt)}</span>
                </div>
              </div>

              {/* Customer info */}
              <Section title="Khách hàng">
                <dl className="flex flex-col gap-1.5">
                  {[
                    { label: "Email", value: order.email },
                    { label: "Điện thoại", value: order.phone },
                    ...(order.customerId
                      ? [{ label: "User ID", value: String(order.customerId) }]
                      : [{ label: "Loại", value: "Khách vãng lai" }]),
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between">
                      <dt className="text-xs text-gray-400">{label}</dt>
                      <dd className="text-xs text-gray-800">{value}</dd>
                    </div>
                  ))}
                </dl>
              </Section>

              {/* Order items */}
              <Section title={`Sản phẩm (${order.items.length})`}>
                <div className="flex flex-col divide-y divide-gray-50">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between py-1.5 text-xs">
                      <span className="text-gray-700">
                        {item.productName} — {item.variantName} ×{item.quantity}
                      </span>
                      <span className="font-medium text-gray-900">
                        {formatVND(item.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Deliveries */}
              {order.deliveries.length > 0 && (
                <Section title={`Đã giao (${order.deliveries.length})`} collapsible>
                  <div className="flex flex-col gap-2">
                    {order.deliveries.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-medium text-gray-800">
                            {d.productName} — {d.variantName}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {formatDate(d.deliveredAt)}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[11px] text-blue-600"
                          disabled={mutations.resendDelivery.isPending}
                          onClick={() =>
                            mutations.resendDelivery.mutate({ deliveryId: d.id })
                          }
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Gửi lại
                        </Button>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Inventory allocations */}
              <Section title="Phân bổ kho hàng" collapsible>
                <AllocationTable allocations={order.inventoryAllocations} />
              </Section>

              {/* Timeline */}
              <Section title="Tiến trình">
                <OrderTimeline order={order} />
              </Section>

              {/* Audit logs */}
              <Section title="Lịch sử hoạt động" collapsible>
                <AuditLogList logs={order.auditLogs} />
              </Section>

              {/* Admin actions */}
              <Section title="Hành động quản trị">
                <div className="flex flex-wrap gap-2">
                  {order.status === "PENDING" && (
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white h-8"
                      disabled={isPending}
                      onClick={() => mutations.markAsPaid.mutate()}
                    >
                      <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                      Đánh dấu đã thanh toán
                    </Button>
                  )}

                  {(order.status === "PAID" ||
                    order.status === "PROCESSING" ||
                    order.status === "PARTIALLY_COMPLETED" ||
                    order.status === "PAID_PENDING_STOCK") && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      disabled={isPending}
                      onClick={() => mutations.retryAllocation.mutate()}
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                      Phân bổ lại kho
                    </Button>
                  )}

                  {(order.status === "PENDING" || order.status === "PAID") && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-red-600 border-red-200 hover:bg-red-50"
                      disabled={isPending}
                      onClick={() => mutations.cancelOrder.mutate({ reason: undefined })}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1.5" />
                      Hủy đơn hàng
                    </Button>
                  )}

                  {isPending && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 ml-1">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Đang xử lý...
                    </div>
                  )}
                </div>
              </Section>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
