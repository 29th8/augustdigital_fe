import { z } from "zod";

/**
 * Schema for the category shape returned by the backend.
 * The API already returns camelCase fields, so no normalization is needed.
 * The inferred type is structurally identical to the Category UI type.
 */
export const CategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  createdAt: z.string(),
});

export type CategoryApi = z.infer<typeof CategorySchema>;
