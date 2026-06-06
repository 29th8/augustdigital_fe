import { z } from "zod";

/**
 * Normalises a single notification item from the backend.
 *
 * Spring Boot Jackson quirks handled here:
 *  - Boolean getter `isRead()` may be serialised as "read" (Jackson strips "is" prefix).
 *  - Field may also arrive as "is_read" when SNAKE_CASE naming strategy is active.
 *  - "createdAt" may arrive as "created_at" under SNAKE_CASE config.
 *  - "type" enum may arrive in lowercase ("order") from some serialisers.
 */
function normalizeItem(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const obj = raw as Record<string, unknown>;

  const isRead =
    "isRead" in obj ? obj.isRead :
    "is_read" in obj ? obj.is_read :
    "read" in obj ? obj.read :
    undefined;

  const createdAt =
    "createdAt" in obj ? obj.createdAt :
    "created_at" in obj ? obj.created_at :
    undefined;

  const type =
    typeof obj.type === "string" ? obj.type.toUpperCase() : obj.type;

  return { ...obj, isRead, createdAt, type };
}

export const NotificationItemSchema = z.preprocess(
  normalizeItem,
  z.object({
    id: z.number(),
    title: z.string(),
    message: z.string().default(""),
    type: z.enum(["ORDER", "WARRANTY", "SYSTEM"]),
    isRead: z.boolean(),
    createdAt: z.string(),
  }),
);

/**
 * Normalises the page_info block.
 *
 * Spring Boot Jackson default is camelCase, so the backend sends:
 *   { totalElements, totalPages, currentPage, pageSize }
 * but a custom DTO may send the snake_case variant.
 * Both are accepted here.
 */
function normalizePageInfo(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const obj = raw as Record<string, unknown>;
  return {
    total_elements: obj.total_elements ?? obj.totalElements ?? 0,
    total_pages:    obj.total_pages    ?? obj.totalPages    ?? 0,
    current_page:   obj.current_page   ?? obj.currentPage   ?? 0,
    page_size:      obj.page_size      ?? obj.pageSize      ?? 50,
  };
}

export const NotificationPageInfoRawSchema = z.preprocess(
  normalizePageInfo,
  z.object({
    total_elements: z.number().default(0),
    total_pages:    z.number().default(0),
    current_page:   z.number().default(0),
    page_size:      z.number().default(50),
  }),
);

/**
 * Normalises the top-level page wrapper.
 *
 * Handles:
 *  - Custom DTO:  { items, page_info }
 *  - Custom DTO (camelCase Jackson): { items, pageInfo }
 *  - Spring Data Page<T>: { content, totalElements, totalPages, number, size }
 */
function normalizePage(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const obj = raw as Record<string, unknown>;

  const items = obj.items ?? obj.content ?? [];

  const page_info =
    obj.page_info ??
    obj.pageInfo ??
    // Flat Spring Data Page shape
    {
      totalElements: obj.totalElements ?? 0,
      totalPages:    obj.totalPages    ?? 0,
      currentPage:   obj.currentPage   ?? obj.number ?? 0,
      pageSize:      obj.pageSize      ?? obj.size   ?? 50,
    };

  return { items, page_info };
}

export const NotificationsPageRawSchema = z.preprocess(
  normalizePage,
  z.object({
    items:     z.array(NotificationItemSchema).default([]),
    page_info: NotificationPageInfoRawSchema,
  }),
);
