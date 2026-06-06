import { PackageCheck, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderDetail } from "@/types/order";

interface PartialDeliveryAlertProps {
  order: Pick<OrderDetail, "status" | "deliveries" | "pendingStockCount" | "items">;
  className?: string;
}

export default function PartialDeliveryAlert({ order, className }: PartialDeliveryAlertProps) {
  const totalOrdered = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const totalDelivered = order.deliveries.length;
  const pending = order.pendingStockCount;

  if (order.status === "COMPLETED" || (pending === 0 && totalDelivered >= totalOrdered)) {
    return null;
  }

  const isPendingStock =
    order.status === "PAID_PENDING_STOCK" || order.status === "PARTIALLY_COMPLETED";

  if (!isPendingStock) return null;

  return (
    <div
      className={cn(
        "flex gap-3 p-4 rounded-xl border",
        order.status === "PARTIALLY_COMPLETED"
          ? "bg-purple-50 border-purple-200"
          : "bg-amber-50 border-amber-200",
        className,
      )}
    >
      {/* Icons */}
      <div className="flex gap-1 shrink-0 mt-0.5">
        {totalDelivered > 0 && (
          <PackageCheck
            className={cn(
              "h-5 w-5",
              order.status === "PARTIALLY_COMPLETED" ? "text-purple-500" : "text-amber-500",
            )}
          />
        )}
        {pending > 0 && <Package className="h-5 w-5 text-gray-400" />}
      </div>

      {/* Text */}
      <div className="flex flex-col gap-1">
        <p
          className={cn(
            "text-sm font-semibold",
            order.status === "PARTIALLY_COMPLETED" ? "text-purple-800" : "text-amber-800",
          )}
        >
          {order.status === "PARTIALLY_COMPLETED"
            ? `Đã giao ${totalDelivered} / ${totalOrdered} sản phẩm`
            : "Sản phẩm đang chờ nhập kho"}
        </p>
        <p
          className={cn(
            "text-xs",
            order.status === "PARTIALLY_COMPLETED" ? "text-purple-600" : "text-amber-700",
          )}
        >
          {pending > 0
            ? `Còn ${pending} sản phẩm đang chờ nhà cung cấp bổ sung hàng. Chúng tôi sẽ giao ngay khi có hàng và thông báo qua email cho bạn.`
            : "Toàn bộ hàng đã được giao. Nếu có vấn đề hãy liên hệ hỗ trợ."}
        </p>
      </div>
    </div>
  );
}
