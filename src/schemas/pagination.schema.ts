import { z } from "zod";

/**
 * Normalises the page_info block from whatever shape the backend sends.
 *
 * Spring Boot Jackson default: camelCase  { totalElements, totalPages, currentPage, pageSize }
 * Custom DTO snake_case:                  { total_elements, total_pages, current_page, page_size }
 * Both are accepted; defaults keep the UI functional even if a field is missing.
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

export const PageInfoSchema = z.preprocess(
  normalizePageInfo,
  z.object({
    total_elements: z.number().default(0),
    total_pages:    z.number().default(0),
    current_page:   z.number().default(0),
    page_size:      z.number().default(50),
  }),
);

/**
 * Normalises the top-level paginated envelope.
 *
 * Handles three common Spring Boot shapes:
 *   Custom DTO snake_case:  { items, page_info: { total_elements, ... } }
 *   Custom DTO camelCase:   { items, pageInfo:  { totalElements, ... } }
 *   Spring Data Page<T>:    { content, totalElements, totalPages, number, size }
 */
function normalizePaginatedEnvelope(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const obj = raw as Record<string, unknown>;

  const items = obj.items ?? obj.content ?? [];

  const page_info =
    obj.page_info ??
    obj.pageInfo ??
    // Flat Spring Data Page<T> shape — fields are at the top level
    {
      totalElements: obj.totalElements ?? 0,
      totalPages:    obj.totalPages    ?? 0,
      currentPage:   obj.currentPage   ?? obj.number ?? 0,
      pageSize:      obj.pageSize      ?? obj.size   ?? 50,
    };

  return { items, page_info };
}

/**
 * Factory that wraps a per-item schema in the standard paginated envelope.
 * Usage: PaginatedDataSchema(RawProductSchema)
 */
export function PaginatedDataSchema<T extends z.ZodType>(itemSchema: T) {
  return z.preprocess(
    normalizePaginatedEnvelope,
    z.object({
      items:     z.array(itemSchema),
      page_info: PageInfoSchema,
    }),
  );
}

/**
 * Validates the pagination envelope only — items are left as unknown[].
 * Use this when per-item validation is done individually (e.g. with validateSafe)
 * so that one invalid item does not fail the entire response.
 */
export const PaginatedEnvelopeSchema = z.preprocess(
  normalizePaginatedEnvelope,
  z.object({
    items:     z.array(z.unknown()).default([]),
    page_info: PageInfoSchema,
  }),
);
