import { z } from "zod";

export const RefundStatusSchema = z.enum(["PENDING", "PROCESSED", "REJECTED"]);

export const RefundSchema = z.object({
  id: z.number(),
  orderId: z.number(),
  orderCode: z.string(),
  amount: z.number(),
  reason: z.string(),
  status: RefundStatusSchema,
  adminId: z.number().nullable(),
  notes: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type RawRefund = z.infer<typeof RefundSchema>;
