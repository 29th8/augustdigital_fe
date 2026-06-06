import type {
  NotificationItem,
  NotificationPriority,
  RichNotificationItem,
  NotificationGroup,
  NotificationDisplayItem,
  AppNotificationType,
} from "@/types/notification";

// ─── Priority derivation ───────────────────────────────────────────────────────

/**
 * Derives a priority level from the notification's type and text content.
 * The backend doesn't send an explicit priority field — we infer it.
 *
 * Mapping rationale (from api-notifications.md events):
 *   high   — admin stock alerts, warranty PENDING_STOCK, warranty new claims
 *   medium — partial delivery, order PAID_PENDING_STOCK, warranty submitted
 *   low    — order COMPLETED, warranty RESOLVED
 */
export function derivePriority(item: NotificationItem): NotificationPriority {
  const text = `${item.title} ${item.message}`.toLowerCase();

  if (item.type === "WARRANTY") {
    // New claim or pending stock → high attention needed
    if (
      text.includes("pending_stock") ||
      text.includes("pending stock") ||
      text.includes("chờ hàng") ||
      text.includes("stock alert") ||
      text.includes("new warranty") ||
      text.includes("bảo hành mới") ||
      text.includes("claim #")
    ) {
      return "high";
    }
    // Resolved → good news, low urgency
    if (
      text.includes("resolved") ||
      text.includes("đã giải quyết") ||
      text.includes("replacement is ready") ||
      text.includes("thay thế đã sẵn sàng")
    ) {
      return "low";
    }
    return "medium";
  }

  if (item.type === "ORDER") {
    // Pending stock / failed → urgent
    if (
      text.includes("paid_pending_stock") ||
      text.includes("paid pending stock") ||
      text.includes("đang chờ hàng") ||
      text.includes("failed") ||
      text.includes("thất bại") ||
      text.includes("stock alert")
    ) {
      return "high";
    }
    // Completed orders → neutral / good news
    if (
      text.includes("completed") ||
      text.includes("hoàn thành") ||
      text.includes("delivered") ||
      text.includes("đã giao") ||
      text.includes("has been delivered") ||
      text.includes("đã được giao")
    ) {
      return "low";
    }
    return "medium";
  }

  // SYSTEM notifications are informational
  return "low";
}

// ─── Action URL derivation ─────────────────────────────────────────────────────

export function deriveActionUrl(item: NotificationItem): string | null {
  if (item.type === "ORDER") return "/orders";
  if (item.type === "WARRANTY") return "/warranty";
  return null;
}

// ─── Enrichment ───────────────────────────────────────────────────────────────

export function enrichNotification(item: NotificationItem): RichNotificationItem {
  return {
    ...item,
    priority: derivePriority(item),
    actionUrl: deriveActionUrl(item),
  };
}

export function enrichAll(items: NotificationItem[]): RichNotificationItem[] {
  return items.map(enrichNotification);
}

// ─── Grouping ─────────────────────────────────────────────────────────────────

/** Notifications of the same type within this window are collapsed into a group. */
const GROUP_WINDOW_MS = 30_000;

const TYPE_ACTION: Record<AppNotificationType, string | null> = {
  ORDER: "/orders",
  WARRANTY: "/warranty",
  SYSTEM: null,
};

/**
 * Collapses runs of same-type notifications that fall within a 30-second window
 * into `NotificationGroup` objects. Lone items pass through unchanged.
 *
 * Input must be sorted newest-first (the API already does this).
 */
export function groupNotifications(
  items: RichNotificationItem[],
): NotificationDisplayItem[] {
  if (items.length === 0) return [];

  const result: NotificationDisplayItem[] = [];
  const consumed = new Set<number>();

  for (let i = 0; i < items.length; i++) {
    const current = items[i];
    if (consumed.has(current.id)) continue;

    const currentMs = new Date(current.createdAt).getTime();

    // Find other items of the same type within the window (excluding already consumed).
    const peers = items.filter(
      (n, j) =>
        j !== i &&
        !consumed.has(n.id) &&
        n.type === current.type &&
        Math.abs(new Date(n.createdAt).getTime() - currentMs) <= GROUP_WINDOW_MS,
    );

    if (peers.length >= 1) {
      const all = [current, ...peers];
      const maxPriority = (list: RichNotificationItem[]): NotificationPriority => {
        if (list.some((n) => n.priority === "high")) return "high";
        if (list.some((n) => n.priority === "medium")) return "medium";
        return "low";
      };

      result.push({
        groupKey: `group-${current.type}-${current.createdAt}-${i}`,
        type: current.type,
        priority: maxPriority(all),
        count: all.length,
        items: all,
        latestCreatedAt: current.createdAt, // items are newest-first
        hasUnread: all.some((n) => !n.isRead),
        actionUrl: TYPE_ACTION[current.type],
      } satisfies NotificationGroup);

      all.forEach((n) => consumed.add(n.id));
    } else {
      result.push(current);
      consumed.add(current.id);
    }
  }

  return result;
}

// ─── Sound ────────────────────────────────────────────────────────────────────

let _audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!_audioCtx) _audioCtx = new AudioContext();
    return _audioCtx;
  } catch {
    return null;
  }
}

/**
 * Plays a brief notification beep using the Web Audio API.
 *
 * Rules:
 *   high   → two-tone alert at 880 Hz → 1100 Hz
 *   medium → single soft beep at 660 Hz
 *   low    → silent (no distraction)
 *
 * Will silently no-op if:
 *   - Browser blocks autoplay (AudioContext in "suspended" state before user gesture)
 *   - Web Audio API is not supported
 */
export function playNotificationSound(priority: NotificationPriority): void {
  if (priority === "low") return;

  const ctx = getAudioCtx();
  if (!ctx) return;

  // Resume suspended context (requires prior user gesture; silently skips if blocked).
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  if (ctx.state !== "running") return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.connect(gain);
  gain.connect(ctx.destination);

  if (priority === "high") {
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1100, now + 0.12);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.start(now);
    osc.stop(now + 0.38);
  } else {
    // medium
    osc.frequency.setValueAtTime(660, now);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.start(now);
    osc.stop(now + 0.22);
  }
}

/** Vibrates device for high-priority notifications (mobile only). */
export function tryVibrate(priority: NotificationPriority): void {
  if (priority !== "high") return;
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([80, 40, 80]);
  }
}

// ─── Priority display config ───────────────────────────────────────────────────

export const PRIORITY_CONFIG: Record<
  NotificationPriority,
  { border: string; bg: string; badge: string; label: string }
> = {
  high: {
    border: "border-l-[3px] border-l-red-400",
    bg: "bg-red-50/40",
    badge: "bg-red-100 text-red-700",
    label: "Khẩn",
  },
  medium: {
    border: "border-l-[3px] border-l-amber-400",
    bg: "bg-amber-50/30",
    badge: "bg-amber-100 text-amber-700",
    label: "Trung bình",
  },
  low: {
    border: "border-l-[3px] border-l-transparent",
    bg: "",
    badge: "bg-gray-100 text-gray-500",
    label: "Thấp",
  },
};

// ─── Time formatting ───────────────────────────────────────────────────────────

export function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(dateStr).toLocaleDateString("vi-VN");
}
