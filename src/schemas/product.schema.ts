import { z } from "zod";

// ─── Image URL ────────────────────────────────────────────────────────────────
// Accepts absolute HTTP/S URLs and relative paths (e.g. /uploads/img.jpg).
// Empty string is treated as absent — coerced to null before the refine so
// products with image_url:"" pass validation instead of being filtered out.
// resolveImageUrl() will convert relative paths to full URLs at normalize time.
const imageUrlSchema = z
  .string()
  .transform((val) => (val.trim() === "" ? null : val))
  .pipe(
    z
      .string()
      .refine(
        (val) =>
          val.startsWith("http://") ||
          val.startsWith("https://") ||
          val.startsWith("/"),
        { message: "image_url must be an absolute URL or a path starting with /" },
      )
      .nullable(),
  );

// ─── Variant ──────────────────────────────────────────────────────────────────
const RawVariantStockSchema = z.preprocess(
  (raw) => {
    if (typeof raw !== "object" || raw === null) return raw;
    const obj = raw as Record<string, unknown>;
    // BE returns stockCount; also accept legacy stock field
    return {
      ...obj,
      stock: obj.stockCount ?? obj.stock ?? null,
      fulfillmentType: obj.fulfillment_type ?? obj.fulfillmentType ?? undefined,
      costPrice: obj.cost_price ?? obj.costPrice ?? null,
    };
  },
  z.object({
    id: z.number(),
    name: z.string().min(1, "Variant name is required."),
    price: z.number().positive("Variant price must be greater than 0."),
    stock: z.number().int().min(0).nullable().optional(),
    fulfillmentType: z.enum(["INSTANT_DIRECT", "INSTANT_SHARED"]).optional(),
    costPrice: z.number().min(0).nullable().optional(),
  }),
);

export const RawVariantSchema = RawVariantStockSchema;

// ─── Product ──────────────────────────────────────────────────────────────────
/**
 * Schema for the raw product shape returned by the backend.
 *
 * Business rules encoded here:
 *   - name          ≥ 2 characters
 *   - variants      ≥ 1 item, each price > 0
 *   - category_id   positive integer when present
 *   - image_url     valid URL or relative path when present
 *
 * The backend sends snake_case field names. Some endpoints may send camelCase
 * variants (e.g. after create/update), so both are accepted as fallbacks.
 *
 * Used with validateSafe() for per-item soft validation in list responses —
 * invalid items are filtered out instead of crashing the entire list.
 */
export const RawProductSchema = z.object({
  id: z.number(),
  name: z.string().min(2, "Product name must be at least 2 characters."),
  description: z.string().default(""),
  // Category — snake_case primary, camelCase fallback
  category_name: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  category_id: z.number().int().positive("category_id must be a positive integer.").nullable().optional(),
  categoryId: z.number().int().positive().nullable().optional(),
  // Image — snake_case primary, camelCase fallback; validated when present
  image_url: imageUrlSchema.nullable().optional(),
  imageUrl: imageUrlSchema.nullable().optional(),
  // Fulfillment type — optional so existing products without the field still validate
  fulfillment_type: z.enum(["INSTANT_DIRECT", "INSTANT_SHARED"]).optional(),
  fulfillmentType: z.enum(["INSTANT_DIRECT", "INSTANT_SHARED"]).optional(),
  // Variants — at least one required; each variant is independently validated
  variants: z.array(RawVariantSchema).min(1, "Product must have at least one variant."),
});

export type RawVariant = z.infer<typeof RawVariantSchema>;
export type RawProduct = z.infer<typeof RawProductSchema>;
