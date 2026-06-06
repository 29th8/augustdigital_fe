"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  BellDot,
  Package,
  ShieldCheck,
  Info,
  CheckCheck,
  Layers,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useNotifications,
  useEnrichedNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
} from "@/hooks/useNotifications";
import {
  timeAgo,
  PRIORITY_CONFIG,
  playNotificationSound,
  tryVibrate,
} from "@/lib/notificationUtils";
import {
  isGroup,
  type AppNotificationType,
  type NotificationDisplayItem,
  type RichNotificationItem,
  type NotificationGroup,
} from "@/types/notification";

// ─── Bell ring keyframes (injected once, no CSS import needed) ────────────────

const RING_KEYFRAMES = `
@keyframes bellRing {
  0%, 100% { transform: rotate(0deg); }
  15%  { transform: rotate(15deg); }
  30%  { transform: rotate(-12deg); }
  45%  { transform: rotate(10deg); }
  60%  { transform: rotate(-8deg); }
  75%  { transform: rotate(5deg); }
}
`;

// ─── Type display maps ────────────────────────────────────────────────────────

const TYPE_ICON: Record<AppNotificationType, React.ElementType> = {
  ORDER: Package,
  WARRANTY: ShieldCheck,
  SYSTEM: Info,
};

const TYPE_ICON_CLASS: Record<AppNotificationType, string> = {
  ORDER: "text-blue-500",
  WARRANTY: "text-purple-500",
  SYSTEM: "text-gray-400",
};

const TYPE_LABEL_VI: Record<AppNotificationType, string> = {
  ORDER: "đơn hàng",
  WARRANTY: "bảo hành",
  SYSTEM: "hệ thống",
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function NotificationSkeleton() {
  return (
    <div className="px-4 py-3 flex items-start gap-3 animate-pulse">
      <div className="h-4 w-4 mt-0.5 rounded bg-gray-100 shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <div className="h-3 w-36 bg-gray-100 rounded" />
        <div className="h-3 w-52 bg-gray-100 rounded" />
        <div className="h-2.5 w-16 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

// ─── Single notification row ──────────────────────────────────────────────────

function NotificationRow({
  item,
  onRead,
  onClose,
}: {
  item: RichNotificationItem;
  onRead: (id: number) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const Icon = TYPE_ICON[item.type];
  const p = PRIORITY_CONFIG[item.priority];

  function handleClick() {
    if (!item.isRead) onRead(item.id);
    if (item.actionUrl) {
      onClose();
      router.push(item.actionUrl);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors",
        "hover:bg-gray-50 focus-visible:outline-none focus-visible:bg-gray-50",
        p.border,
        !item.isRead && p.bg,
        item.actionUrl ? "cursor-pointer" : "cursor-default",
      )}
    >
      <span className="mt-0.5 shrink-0">
        <Icon className={cn("h-4 w-4", TYPE_ICON_CLASS[item.type])} />
      </span>

      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center gap-2 justify-between">
          <p className="text-sm font-medium text-gray-900 truncate leading-tight">
            {item.title}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {item.priority === "high" && (
              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-100 text-red-600">
                Khẩn
              </span>
            )}
            {item.priority === "medium" && (
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
            )}
            {!item.isRead && (
              <span className="h-2 w-2 rounded-full bg-cyan-500 shrink-0" />
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500 leading-snug line-clamp-2">
          {item.message}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="text-[11px] text-gray-400">{timeAgo(item.createdAt)}</p>
          {item.actionUrl && (
            <span className="text-[11px] text-cyan-500 flex items-center gap-0.5">
              Xem <ArrowRight className="h-2.5 w-2.5" />
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Grouped row ──────────────────────────────────────────────────────────────

function GroupedRow({
  group,
  onRead,
  onClose,
}: {
  group: NotificationGroup;
  onRead: (id: number) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const Icon = TYPE_ICON[group.type];
  const p = PRIORITY_CONFIG[group.priority];

  function handleClick() {
    group.items.filter((n) => !n.isRead).forEach((n) => onRead(n.id));
    if (group.actionUrl) {
      onClose();
      router.push(group.actionUrl);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors cursor-pointer",
        "hover:bg-gray-50 focus-visible:outline-none focus-visible:bg-gray-50",
        p.border,
        group.hasUnread && p.bg,
      )}
    >
      <span className="mt-0.5 shrink-0 relative">
        <Icon className={cn("h-4 w-4", TYPE_ICON_CLASS[group.type])} />
        <Layers className="absolute -bottom-1 -right-1 h-2.5 w-2.5 text-gray-400" />
      </span>

      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center gap-2 justify-between">
          <p className="text-sm font-medium text-gray-900 leading-tight">
            <span className="font-bold text-cyan-700">{group.count}</span>
            {" thông báo "}
            {TYPE_LABEL_VI[group.type]}
          </p>
          <div className="flex items-center gap-1.5 shrink-0">
            {group.priority === "high" && (
              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-red-100 text-red-600">
                Khẩn
              </span>
            )}
            {group.hasUnread && (
              <span className="h-2 w-2 rounded-full bg-cyan-500 shrink-0" />
            )}
          </div>
        </div>
        <p className="text-xs text-gray-400 truncate">
          {group.items[0]?.message ?? ""}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <p className="text-[11px] text-gray-400">{timeAgo(group.latestCreatedAt)}</p>
          <span className="text-[11px] text-cyan-500 flex items-center gap-0.5">
            Xem tất cả <ArrowRight className="h-2.5 w-2.5" />
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Display item dispatcher ──────────────────────────────────────────────────

function DisplayRow({
  item,
  onRead,
  onClose,
}: {
  item: NotificationDisplayItem;
  onRead: (id: number) => void;
  onClose: () => void;
}) {
  if (isGroup(item)) {
    return <GroupedRow group={item} onRead={onRead} onClose={onClose} />;
  }
  return <NotificationRow item={item} onRead={onRead} onClose={onClose} />;
}

// ─── Main component ───────────────────────────────────────────────────────────

interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({ className }: NotificationBellProps) {
  // ── Controlled open state ─────────────────────────────────────────────────
  const [open, setOpen] = useState(false);

  // ── Queries — polling is paused while the dropdown is open ───────────────
  // A single `useNotifications(open)` observer controls all fetching.
  // `useEnrichedNotifications()` only subscribes to the cache (enabled:false)
  // so it never creates a competing interval observer.
  const { isLoading } = useNotifications(open);
  const { grouped, unreadCount, hasHigh } = useEnrichedNotifications();

  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  // ── Sound unlock — only allowed after confirmed user interaction ──────────
  // We track this with a ref so the toast/sound effect can read it without
  // re-registering; the ref is populated by the open-state effect below.
  const audioUnlockedRef = useRef(false);

  // ── Stable refs — let effects read latest values without re-running ───────
  // Capturing mutate + unreadCount in refs prevents the open-side-effect from
  // needing them in its dependency array (which would re-fire on every render).
  const markAllMutateRef = useRef(markAllAsRead.mutate);
  markAllMutateRef.current = markAllAsRead.mutate;
  const unreadCountRef = useRef(unreadCount);
  unreadCountRef.current = unreadCount;

  // ── Side effects triggered by open state ─────────────────────────────────
  // Requirements:
  //   1. Unlock the audio system (requires a user gesture — opening counts).
  //   2. Mark all visible notifications as read so the count clears.
  // Guard: only fire once per open session using `markedOnOpenRef`.
  const markedOnOpenRef = useRef(false);

  useEffect(() => {
    if (!open) {
      // Reset the per-open guard so the next open fires again.
      markedOnOpenRef.current = false;
      return;
    }

    // 1. Unlock audio — opening the dropdown IS the user interaction.
    audioUnlockedRef.current = true;

    // 2. Mark all as read — one-shot, guarded against the effect re-firing.
    if (!markedOnOpenRef.current && unreadCountRef.current > 0) {
      markedOnOpenRef.current = true;
      markAllMutateRef.current();
    }
  }, [open]); // intentionally only [open] — side effects are one-shot per open

  // ── Toast + sound for new notifications arriving between polls ────────────
  // This effect only fires when `grouped` changes, which only happens while the
  // dropdown is closed (polling is paused while open), so there is no risk of
  // toasting items the user is currently looking at.
  const seenIdsRef = useRef<Set<number>>(new Set());
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    if (!grouped.length) return;

    const allItems: RichNotificationItem[] = grouped.flatMap((d) =>
      isGroup(d) ? d.items : [d],
    );

    if (isInitialLoadRef.current) {
      // Seed seen-set on first load — no toast for pre-existing notifications.
      allItems.forEach((n) => seenIdsRef.current.add(n.id));
      isInitialLoadRef.current = false;
      return;
    }

    const newUnread = allItems.filter(
      (n) => !n.isRead && !seenIdsRef.current.has(n.id),
    );
    if (newUnread.length === 0) return;

    const topPriority = newUnread.some((n) => n.priority === "high")
      ? "high"
      : newUnread.some((n) => n.priority === "medium")
      ? "medium"
      : "low";

    if (audioUnlockedRef.current) {
      playNotificationSound(topPriority);
      tryVibrate(topPriority);
    }

    if (newUnread.length > 2) {
      toast(`${newUnread.length} thông báo mới`, {
        description: newUnread[0]?.title,
        duration: 5_000,
      });
    } else {
      newUnread.forEach((n) =>
        toast(n.title, { description: n.message, duration: 5_000 }),
      );
    }

    allItems.forEach((n) => seenIdsRef.current.add(n.id));
  }, [grouped]);

  // ── Derived display values ────────────────────────────────────────────────
  const hasUnread = unreadCount > 0;
  const visibleItems = grouped.slice(0, 10);

  return (
    <>
      <style>{RING_KEYFRAMES}</style>

      {/*
        open + onOpenChange  — fully controlled; prevents uncontrolled state drift.
        modal={false}        — prevents Radix from treating background DOM updates
                               (from query cache writes) as outside-click dismissals.
      */}
      <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={
              hasUnread ? `${unreadCount} thông báo chưa đọc` : "Thông báo"
            }
            className={cn(
              "relative p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100",
              "transition-colors outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2",
              className,
            )}
          >
            {hasHigh ? (
              <BellDot
                className="h-4 w-4 text-red-500"
                style={{ animation: "bellRing 0.6s ease-in-out" }}
              />
            ) : hasUnread ? (
              <BellDot className="h-4 w-4 text-cyan-600" />
            ) : (
              <Bell className="h-4 w-4" />
            )}

            {hasUnread && (
              <span
                className={cn(
                  "absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white leading-none",
                  hasHigh ? "bg-red-500" : "bg-cyan-500",
                )}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={6}
          className="w-[340px] p-0 bg-white border border-gray-200 shadow-xl rounded-xl overflow-hidden"
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-900">Thông báo</span>
              {hasUnread && (
                <span
                  className={cn(
                    "text-[11px] font-semibold px-1.5 py-0.5 rounded-full",
                    hasHigh ? "bg-red-100 text-red-700" : "bg-cyan-100 text-cyan-700",
                  )}
                >
                  {unreadCount}
                </span>
              )}
            </div>
            {hasUnread && (
              <Button
                variant="ghost"
                size="sm"
                disabled={markAllAsRead.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  markAllAsRead.mutate();
                }}
                className="h-7 px-2 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 gap-1"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Đánh dấu tất cả
              </Button>
            )}
          </div>

          {/* ── Body ── */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-50">
            {isLoading ? (
              <>
                <NotificationSkeleton />
                <NotificationSkeleton />
                <NotificationSkeleton />
              </>
            ) : visibleItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <Bell className="h-8 w-8 text-gray-200" />
                <p className="text-sm text-gray-400">Chưa có thông báo nào</p>
                <p className="text-xs text-gray-300">
                  Thông báo sẽ xuất hiện khi có hoạt động mới
                </p>
              </div>
            ) : (
              visibleItems.map((item, i) => (
                <div key={isGroup(item) ? item.groupKey : item.id}>
                  <DisplayRow
                    item={item}
                    onRead={(id) => markAsRead.mutate(id)}
                    onClose={() => setOpen(false)}
                  />
                  {i < visibleItems.length - 1 && (
                    <DropdownMenuSeparator className="my-0 bg-gray-50" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* ── Footer ── */}
          <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between">
            <span className="text-[11px] text-gray-400">
              Cập nhật mỗi 10s · tạm dừng khi mở
            </span>
            <a
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1 transition-colors"
            >
              Xem tất cả
              <ArrowRight className="h-3 w-3" />
            </a>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
