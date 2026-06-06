export type AppNotificationType = "ORDER" | "WARRANTY" | "SYSTEM";
export type NotificationPriority = "high" | "medium" | "low";

// ─── Raw API shape ─────────────────────────────────────────────────────────────

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: AppNotificationType;
  isRead: boolean;
  createdAt: string; // ISO-8601 local datetime, no tz suffix
}

export interface NotificationPageInfo {
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface NotificationsPage {
  items: NotificationItem[];
  pageInfo: NotificationPageInfo;
}

// ─── Client-enriched shape ─────────────────────────────────────────────────────

export interface RichNotificationItem extends NotificationItem {
  priority: NotificationPriority;
  /** Derived navigation URL — null for SYSTEM with no clear target. */
  actionUrl: string | null;
}

// ─── Grouping ─────────────────────────────────────────────────────────────────

/**
 * Represents 2+ notifications of the same type that arrived within a 30-second
 * window and are collapsed into a single row in the bell dropdown.
 */
export interface NotificationGroup {
  groupKey: string;
  type: AppNotificationType;
  priority: NotificationPriority;
  count: number;
  items: RichNotificationItem[];
  latestCreatedAt: string;
  hasUnread: boolean;
  /** Shared actionUrl — typically the list page for that type. */
  actionUrl: string | null;
}

export type NotificationDisplayItem = RichNotificationItem | NotificationGroup;

/** Type guard: true when the item is a collapsed group. */
export function isGroup(item: NotificationDisplayItem): item is NotificationGroup {
  return "count" in item && "groupKey" in item;
}
