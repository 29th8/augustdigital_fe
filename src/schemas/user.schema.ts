import { z } from "zod";

// ─── API response schema ───────────────────────────────────────────────────────
// Validates the raw user object returned by the backend.
// Field names match actual Jackson/Spring Boot JSON (camelCase).
// Java boolean `active` is NOT `isActive`.

export const UserApiSchema = z.object({
  id: z.number(),
  email: z.string().email("Email không hợp lệ."),
  role: z.enum(["CUSTOMER", "ADMIN"]),
  /** Java bean convention — field is named `active`, NOT `isActive`. */
  active: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ─── Paginated response schema ────────────────────────────────────────────────

export const PaginatedUserResponseApiSchema = z.object({
  content: z.array(z.unknown()),
  totalElements: z.number(),
  totalPages: z.number(),
  number: z.number(), // 0-based current page
  size: z.number(),
  first: z.boolean().optional(),
  last: z.boolean().optional(),
  numberOfElements: z.number().optional(),
  empty: z.boolean().optional(),
});

// ─── Mutation schemas ─────────────────────────────────────────────────────────

export const ChangeRoleSchema = z.object({
  role: z.enum(["CUSTOMER", "ADMIN"], {
    message: "Chọn role hợp lệ.",
  }),
});

// ─── Exported types ───────────────────────────────────────────────────────────

export type UserApiSchemaType = z.infer<typeof UserApiSchema>;
export type PaginatedUserResponseApiSchemaType = z.infer<typeof PaginatedUserResponseApiSchema>;
export type ChangeRoleFormValues = z.infer<typeof ChangeRoleSchema>;
