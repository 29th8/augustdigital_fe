"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentCountdownProps {
  /** ISO datetime string: order.createdAt */
  createdAt: string;
  /** Minutes until the order expires (default 15). */
  expiryMinutes?: number;
  onExpired?: () => void;
}

interface CountdownState {
  mins: number;
  secs: number;
  expired: boolean;
  urgency: "normal" | "warning" | "critical";
}

export default function PaymentCountdown({
  createdAt,
  expiryMinutes = 15,
  onExpired,
}: PaymentCountdownProps) {
  const [state, setState] = useState<CountdownState | null>(null);

  useEffect(() => {
    const expiresAt = new Date(createdAt).getTime() + expiryMinutes * 60_000;

    function tick() {
      const leftMs = expiresAt - Date.now();
      if (leftMs <= 0) {
        setState({ mins: 0, secs: 0, expired: true, urgency: "critical" });
        return;
      }
      const mins = Math.floor(leftMs / 60_000);
      const secs = Math.floor((leftMs % 60_000) / 1000);
      const urgency: CountdownState["urgency"] =
        mins < 1 ? "critical" : mins < 3 ? "warning" : "normal";
      setState({ mins, secs, expired: false, urgency });
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [createdAt, expiryMinutes]);

  // Fire onExpired once when state transitions to expired.
  const prevExpiredRef = { current: false };
  useEffect(() => {
    if (state?.expired && !prevExpiredRef.current) {
      prevExpiredRef.current = true;
      onExpired?.();
    }
  }, [state?.expired, onExpired]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!state) return null;

  if (state.expired) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-red-600">
        <Timer className="h-4 w-4 shrink-0" />
        <span className="text-sm font-medium">Đơn hàng đã hết hạn thanh toán</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 px-3 py-2.5 rounded-lg border",
        state.urgency === "critical" && "bg-red-50 border-red-100 text-red-600",
        state.urgency === "warning" && "bg-amber-50 border-amber-100 text-amber-600",
        state.urgency === "normal" && "bg-blue-50 border-blue-100 text-blue-600",
      )}
    >
      <Timer
        className={cn(
          "h-4 w-4 shrink-0",
          state.urgency === "critical" && "animate-pulse",
        )}
      />
      <div className="flex flex-col leading-none">
        <span className="text-xs mb-0.5 opacity-80">Thời gian thanh toán còn lại</span>
        <span className="text-lg font-mono font-bold tracking-widest">
          {String(state.mins).padStart(2, "0")}:{String(state.secs).padStart(2, "0")}
        </span>
      </div>
    </div>
  );
}
