"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Package,
  ShieldCheck,
  Info,
  Search,
  CheckCheck,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useNotificationsPage, useMarkAsRead, useMarkAllAsRead } from "@/hooks/useNotifications";
import {
  enrichAll,
  PRIORITY_CONFIG,
  timeAgo,
} from "@/lib/notificationUtils";
import type { AppNotificationType, RichNotificationItem } from "@/types/notification";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

// ─── Filter tabs ──────────────────────────────────────────────────────────────

type TypeFilter = "ALL" | AppNotificationType;

const TYPE_FILTERS: { value: TypeFilter; label: string; icon: React.ElementType }[] = [
  { value: "ALL", label: "Tất cả", icon: Bell },
  { value: "ORDER", label: "Đơn hàng", icon: Package },
  { value: "WARRANTY", label: "Bảo hành", icon: ShieldCheck },
  { value: "SYSTEM", label: "Hệ thống", icon: Info },
];

const TYPE_ICON_CLASS: Record<AppNotificationType, string> = {
  ORDER: "text-blue-500",
  WARRANTY: "text-purple-500",
  SYSTEM: "text-gray-400",
};

const TYPE_ICONS: Record<AppNotificationType, React.ElementType> = {
  ORDER: Package,
  WARRANTY: ShieldCheck,
  SYSTEM: Info,
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <div className="flex items-start gap-4 px-5 py-4 animate-pulse border-b border-gray-50">
      <div className="h-8 w-8 rounded-full bg-gray-100 shrink-0 mt-0.5" />
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex justify-between gap-4">
          <div className="h-3.5 w-40 bg-gray-100 rounded" />
          <div className="h-3 w-16 bg-gray-100 rounded" />
        </div>
        <div className="h-3 w-64 bg-gray-100 rounded" />
        <div className="h-2.5 w-20 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

// ─── Notification row ─────────────────────────────────────────────────────────

function NotificationHistoryRow({
  item,
  onRead,
}: {
  item: RichNotificationItem;
  onRead: (id: number) => void;
}) {
  const router = useRouter();
  const p = PRIORITY_CONFIG[item.priority];
  const Icon = TYPE_ICONS[item.type];

  function handleClick() {
    if (!item.isRead) onRead(item.id);
    if (item.actionUrl) router.push(item.actionUrl);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      className={cn(
        "flex items-start gap-4 px-5 py-4 border-b border-gray-50 transition-colors group",
        "hover:bg-gray-50/70 focus-visible:outline-none focus-visible:bg-gray-50",
        p.border,
        !item.isRead && p.bg,
        item.actionUrl ? "cursor-pointer" : "cursor-default",
      )}
    >
      {/* Icon circle */}
      <div
        className={cn(
          "h-9 w-9 rounded-full flex items-center justify-center shrink-0 mt-0.5",
          item.type === "ORDER" && "bg-blue-50",
          item.type === "WARRANTY" && "bg-purple-50",
          item.type === "SYSTEM" && "bg-gray-100",
        )}
      >
        <Icon className={cn("h-4 w-4", TYPE_ICON_CLASS[item.type])} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className={cn(
                "text-sm font-medium leading-tight",
                item.isRead ? "text-gray-600" : "text-gray-900",
              )}
            >
              {item.title}
            </p>
            {/* Priority badge */}
            {item.priority !== "low" && (
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded",
                  p.badge,
                )}
              >
                {p.label}
              </span>
            )}
            {/* Unread dot */}
            {!item.isRead && (
              <span className="h-2 w-2 rounded-full bg-cyan-500 shrink-0" />
            )}
          </div>
          <span className="text-[11px] text-gray-400 shrink-0 mt-0.5 whitespace-nowrap">
            {timeAgo(item.createdAt)}
          </span>
        </div>

        <p className="text-sm text-gray-500 mt-1 leading-snug">{item.message}</p>

        <div className="flex items-center gap-3 mt-1.5">
          {/* Type chip */}
          <span
            className={cn(
              "text-[11px] px-1.5 py-0.5 rounded font-medium",
              item.type === "ORDER" && "bg-blue-50 text-blue-600",
              item.type === "WARRANTY" && "bg-purple-50 text-purple-600",
              item.type === "SYSTEM" && "bg-gray-100 text-gray-500",
            )}
          >
            {item.type === "ORDER" ? "Đơn hàng" : item.type === "WARRANTY" ? "Bảo hành" : "Hệ thống"}
          </span>

          {/* "Mark read" hint for unread + "View" arrow for actionable */}
          {!item.isRead && (
            <span
              className="text-[11px] text-gray-400 hover:text-cyan-600 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onRead(item.id);
              }}
            >
              Đánh dấu đã đọc
            </span>
          )}
          {item.actionUrl && (
            <span className="text-[11px] text-cyan-500 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              Xem chi tiết <ArrowRight className="h-2.5 w-2.5" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [apiPage, setApiPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading, isError, refetch, isFetching } =
    useNotificationsPage(apiPage, PAGE_SIZE);
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const rich = useMemo(() => enrichAll(data?.items ?? []), [data?.items]);

  // Client-side filter on the current page.
  const filtered = useMemo(() => {
    return rich.filter((n) => {
      if (typeFilter !== "ALL" && n.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!n.title.toLowerCase().includes(q) && !n.message.toLowerCase().includes(q))
          return false;
      }
      return true;
    });
  }, [rich, typeFilter, search]);

  const unreadCount = rich.filter((n) => !n.isRead).length;
  const totalPages = data?.pageInfo.totalPages ?? 1;

  function applySearch() {
    setSearch(searchInput);
    setApiPage(0);
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-5 w-5 text-cyan-600" />
            Thông báo
          </h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">
              {unreadCount} chưa đọc trên trang này
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="border-gray-200 text-gray-600 gap-1.5"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            Làm mới
          </Button>
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              disabled={markAllAsRead.isPending}
              onClick={() => markAllAsRead.mutate()}
              className="border-cyan-200 text-cyan-700 hover:bg-cyan-50 gap-1.5"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Đọc tất cả
            </Button>
          )}
        </div>
      </div>

      {/* ── Search ── */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            placeholder="Tìm kiếm tiêu đề, nội dung…"
            className="pl-9 border-gray-200 bg-white text-sm"
          />
        </div>
        <Button
          onClick={applySearch}
          className="bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium"
        >
          Tìm
        </Button>
        {search && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(""); setSearchInput(""); }}
            className="text-gray-500 hover:text-gray-900"
          >
            Xóa
          </Button>
        )}
      </div>

      {/* ── Type filter chips ── */}
      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map(({ value, label, icon: Icon }) => {
          const count =
            value === "ALL"
              ? rich.length
              : rich.filter((n) => n.type === value).length;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTypeFilter(value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
                typeFilter === value
                  ? "bg-cyan-600 text-white border-cyan-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-cyan-300 hover:text-cyan-700",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
              {count > 0 && (
                <span
                  className={cn(
                    "text-[11px] font-bold px-1.5 py-0.5 rounded-full",
                    typeFilter === value
                      ? "bg-white/20 text-white"
                      : "bg-gray-100 text-gray-500",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── List ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => <RowSkeleton key={i} />)}
          </>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
            <Bell className="h-10 w-10 text-gray-200" />
            <p className="text-sm text-gray-500">Không thể tải thông báo.</p>
            <Button
              size="sm"
              onClick={() => refetch()}
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Thử lại
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-2 text-center">
            <Bell className="h-10 w-10 text-gray-200" />
            <p className="text-sm text-gray-500">
              {search
                ? `Không tìm thấy thông báo cho "${search}"`
                : typeFilter !== "ALL"
                ? "Không có thông báo loại này"
                : "Chưa có thông báo nào"}
            </p>
          </div>
        ) : (
          <>
            {isFetching && (
              <div className="flex items-center gap-2 px-5 py-2 bg-cyan-50 border-b border-cyan-100 text-xs text-cyan-700">
                <Loader2 className="h-3 w-3 animate-spin" />
                Đang tải…
              </div>
            )}
            {filtered.map((item) => (
              <NotificationHistoryRow
                key={item.id}
                item={item}
                onRead={(id) => markAsRead.mutate(id)}
              />
            ))}
          </>
        )}
      </div>

      {/* ── Pagination ── */}
      {!isLoading && !isError && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Trang {apiPage + 1} / {totalPages}
            {data?.pageInfo.totalElements
              ? ` · ${data.pageInfo.totalElements} thông báo`
              : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={apiPage === 0 || isFetching}
              onClick={() => setApiPage((p) => Math.max(0, p - 1))}
              className="border-gray-200 text-gray-600 gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={apiPage >= totalPages - 1 || isFetching}
              onClick={() => setApiPage((p) => p + 1)}
              className="border-gray-200 text-gray-600 gap-1"
            >
              Sau
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        Bộ lọc áp dụng trên trang hiện tại · {PAGE_SIZE} thông báo / trang
      </p>
    </div>
  );
}
