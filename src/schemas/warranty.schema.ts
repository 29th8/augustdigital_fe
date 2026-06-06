import { z } from "zod";

export const WarrantyRequestStatusSchema = z.enum([
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "PENDING_STOCK",
]);

export const WarrantyLogSchema = z.object({
  id: z.number(),
  admin_id: z.number().nullable(),
  action: z.string(),
  created_at: z.string(),
});

export const WarrantyClaimSchema = z.object({
  id: z.number(),
  order_item_id: z.number(),
  product_name: z.string().nullable().optional(),
  variant_name: z.string().nullable().optional(),
  order_code: z.string().nullable().optional(),
  user_id: z.number().nullable().optional(),
  user_email: z.string(),
  description: z.string(),
  status: WarrantyRequestStatusSchema,
  logs: z.array(WarrantyLogSchema).default([]),
  created_at: z.string(),
  updated_at: z.string(),
});

export type RawWarrantyLog = z.infer<typeof WarrantyLogSchema>;
export type RawWarrantyClaim = z.infer<typeof WarrantyClaimSchema>;
