import {
  CreditCard,
  Cog,
  CheckCircle2,
  XCircle,
  Clock,
  PackageCheck,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderStatus, OrderDetail } from "@/types/order";

// ─── Timeline step definition ────────────────────────────────────────────────

interface TimelineStep {
  status: OrderStatus;
  label: string;
  Icon: React.ElementType;
}

const TIMELINE_STEPS: TimelineStep[] = [
  { status: "PENDING",    label: "Chờ thanh toán", Icon: Clock },
  { status: "PAID",       label: "Đã thanh toán",  Icon: CreditCard },
  { status: "PROCESSING", label: "Đang xử lý",     Icon: Cog },
  { status: "COMPLETED",  label: "Hoàn thành",      Icon: CheckCircle2 },
];

const TERMINAL_VARIANTS: Record<string, { label: string; Icon: React.ElementType; color: string }> = {
  PARTIALLY_COMPLETED: {
    label: "Hoàn thành một phần",
    Icon: PackageCheck,
    color: "text-purple-600",
  },
  PAID_PENDING_STOCK: {
    label: "Đã thanh toán — Chờ nhập kho",
    Icon: PackageCheck,
    color: "text-purple-600",
  },
  FAILED: {
    label: "Thất bại",
    Icon: XCircle,
    color: "text-red-500",
  },
  EXPIRED: {
    label: "Hết hạn",
    Icon: AlertCircle,
    color: "text-gray-400",
  },
};

// ─── Date formatter ───────────────────────────────────────────────────────────

function formatTs(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

// ─── Step timestamp lookup ────────────────────────────────────────────────────

function getTimestampForStep(
  stepStatus: OrderStatus,
  order: Pick<OrderDetail, "createdAt" | "updatedAt" | "paidAt">,
): string | undefined {
  if (stepStatus === "PENDING") return order.createdAt;
  if (stepStatus === "PAID") return order.paidAt ?? undefined;
  return undefined;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface OrderTimelineProps {
  order: Pick<OrderDetail, "status" | "createdAt" | "updatedAt" | "paidAt">;
}

export default function OrderTimeline({ order }: OrderTimelineProps) {
  const currentStatus = order.status;
  const isTerminal = TIMELINE_STEPS.every((s) => s.status !== currentStatus);
  const terminalVariant = TERMINAL_VARIANTS[currentStatus];

  // Index of current status in the main flow (-1 for terminal variants)
  const currentIdx = TIMELINE_STEPS.findIndex((s) => s.status === currentStatus);

  return (
    <ol className="relative">
      {TIMELINE_STEPS.map((step, idx) => {
        const isPast = currentIdx > idx || (isTerminal && idx < TIMELINE_STEPS.length);
        const isCurrent = currentIdx === idx && !isTerminal;
        const isFuture = !isPast && !isCurrent;

        const timestamp = getTimestampForStep(step.status, order);
        const { Icon } = step;

        return (
          <li key={step.status} className="flex gap-3 pb-6 last:pb-0">
            {/* Icon column */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "h-7 w-7 rounded-full border-2 flex items-center justify-center shrink-0 z-10",
                  isPast && "bg-green-50 border-green-500 text-green-600",
                  isCurrent && "bg-blue-50 border-blue-500 text-blue-600",
                  isFuture && "bg-gray-50 border-gray-200 text-gray-300",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              {/* Connector line */}
              {idx < TIMELINE_STEPS.length - 1 && (
                <div
                  className={cn(
                    "w-0.5 flex-1 mt-1",
                    isPast ? "bg-green-300" : "bg-gray-200",
                  )}
                />
              )}
            </div>

            {/* Label column */}
            <div className="flex flex-col gap-0.5 pt-0.5 pb-1">
              <span
                className={cn(
                  "text-sm font-medium",
                  isPast && "text-gray-900",
                  isCurrent && "text-blue-700",
                  isFuture && "text-gray-400",
                )}
              >
                {step.label}
                {isCurrent && (
                  <span className="ml-2 text-xs font-normal text-blue-500 animate-pulse">
                    ● Đang ở đây
                  </span>
                )}
              </span>
              {timestamp && (
                <span className="text-xs text-gray-400">{formatTs(timestamp)}</span>
              )}
            </div>
          </li>
        );
      })}

      {/* Terminal variant step (replaces COMPLETED in non-happy paths) */}
      {isTerminal && terminalVariant && (
        <li className="flex gap-3">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "h-7 w-7 rounded-full border-2 flex items-center justify-center shrink-0",
                "bg-gray-50 border-gray-300",
                terminalVariant.color,
              )}
            >
              <terminalVariant.Icon className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="flex flex-col gap-0.5 pt-0.5">
            <span className={cn("text-sm font-medium", terminalVariant.color)}>
              {terminalVariant.label}
            </span>
            <span className="text-xs text-gray-400">{formatTs(order.updatedAt)}</span>
          </div>
        </li>
      )}
    </ol>
  );
}
