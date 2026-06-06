import apiClient from "./apiClient";
import { parseApiResponse } from "@/lib/parseApiResponse";
import {
  NotificationItemSchema,
  NotificationsPageRawSchema,
} from "@/schemas/notification.schema";
import type { ApiResponse } from "@/types/api";
import type { NotificationItem, NotificationsPage } from "@/types/notification";

// ─── Normalizer ───────────────────────────────────────────────────────────────

function normalizePage(
  raw: ReturnType<typeof NotificationsPageRawSchema.parse>,
): NotificationsPage {
  return {
    items: raw.items,
    pageInfo: {
      totalElements: raw.page_info.total_elements,
      totalPages: raw.page_info.total_pages,
      currentPage: raw.page_info.current_page,
      pageSize: raw.page_info.page_size,
    },
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const NotificationService = {
  /**
   * GET /api/v1/notifications
   * Returns the authenticated user's notifications, newest first.
   */
  async getNotifications(page = 0, size = 50): Promise<NotificationsPage> {
    const res = await apiClient.get<ApiResponse<unknown>>("/api/v1/notifications", {
      params: { page, size },
    });
    const raw = parseApiResponse(
      NotificationsPageRawSchema,
      res.data.data,
      "getNotifications",
    );
    return normalizePage(raw);
  },

  /**
   * PUT /api/v1/notifications/{id}/read
   * Marks a single notification as read. Returns the updated item.
   */
  async markAsRead(id: number): Promise<NotificationItem> {
    const res = await apiClient.put<ApiResponse<unknown>>(
      `/api/v1/notifications/${id}/read`,
    );
    return parseApiResponse(NotificationItemSchema, res.data.data, "markAsRead");
  },

  /**
   * PUT /api/v1/notifications/read-all
   * Marks all notifications for the authenticated user as read.
   */
  async markAllAsRead(): Promise<void> {
    await apiClient.put<ApiResponse<unknown>>("/api/v1/notifications/read-all");
  },
};
