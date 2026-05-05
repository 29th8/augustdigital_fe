import { z } from "zod";

export const PageInfoSchema = z.object({
  total_elements: z.number(),
  total_pages: z.number(),
  current_page: z.number(),
  page_size: z.number(),
});

/**
 * Factory that wraps a per-item schema in the standard paginated envelope.
 * Usage: PaginatedDataSchema(RawProductSchema)
 */
export function PaginatedDataSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    page_info: PageInfoSchema,
  });
}

/**
 * Validates the pagination envelope only — items are left as unknown[].
 * Use this when per-item validation is done individually (e.g. with validateSafe)
 * so that one invalid item does not fail the entire response.
 */
export const PaginatedEnvelopeSchema = z.object({
  items: z.array(z.unknown()),
  page_info: PageInfoSchema,
});
