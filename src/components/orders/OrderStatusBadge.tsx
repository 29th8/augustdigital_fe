import {
  Clock,
  CreditCard,
  Settings,
  CheckCircle2,
  PackageCheck,
  Warehouse,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/order";

interface OrderStatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; classes: string; Icon: React.ElementType }
> = {
  PENDING: {
    label: "Chờ thanh toán",
    classes: "bg-amber-100 text-amber-700 border-amber-200",
    Icon: Clock,
  },
  PAID: {
    label: "Đã thanh toán",
    classes: "bg-blue-100 text-blue-700 border-blue-200",
    Icon: CreditCard,
  },
  PROCESSING: {
    label: "Đang xử lý",
    classes: "bg-sky-100 text-sky-700 border-sky-200",
    Icon: Settings,
  },
  COMPLETED: {
    label: "Hoàn thành",
    classes: "bg-green-100 text-green-700 border-green-200",
    Icon: CheckCircle2,
  },
  PARTIALLY_COMPLETED: {
    label: "Hoàn thành một phần",
    classes: "bg-purple-100 text-purple-700 border-purple-200",
    Icon: PackageCheck,
  },
  PAID_PENDING_STOCK: {
    label: "Chờ nhập kho",
    classes: "bg-purple-100 text-purple-700 border-purple-200",
    Icon: Warehouse,
  },
  CANCELLED: {
    label: "Đã hủy",
    classes: "bg-rose-100 text-rose-700 border-rose-200",
    Icon: XCircle,
  },
  FAILED: {
    label: "Thất bại",
    classes: "bg-red-100 text-red-700 border-red-200",
    Icon: XCircle,
  },
  EXPIRED: {
    label: "Hết hạn",
    classes: "bg-gray-100 text-gray-500 border-gray-200",
    Icon: AlertCircle,
  },
};

export default function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    classes: "bg-gray-100 text-gray-500 border-gray-200",
    Icon: AlertCircle,
  };

  const { Icon } = config;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
        config.classes,
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {config.label}
    </span>
  );
}

/** Returns the Vietnamese label for a given status without rendering a badge. */
export function getOrderStatusLabel(status: OrderStatus): string {
  return STATUS_CONFIG[status]?.label ?? status;
}
