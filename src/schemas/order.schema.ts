import { z } from "zod";

export const OrderStatusSchema = z.enum([
  "PENDING",
  "PAID",
  "PROCESSING",
  "COMPLETED",
  "PARTIALLY_COMPLETED",
  "PAID_PENDING_STOCK",
  "FAILED",
  "EXPIRED",
]);

export const RawOrderItemSchema = z.object({
  variant_id: z.number(),
  variant_name: z.string(),
  product_name: z.string(),
  quantity: z.number().int().min(1),
  price: z.number(),
  subtotal: z.number(),
});

export const RawOrderSchema = z.object({
  order_code: z.string(),
  status: OrderStatusSchema,
  total_amount: z.number(),
  email: z.string(),
  phone: z.string(),
  created_at: z.string(),
  items: z.array(RawOrderItemSchema),
});

export const RawOrderListItemSchema = z.object({
  id: z.number(),
  order_code: z.string(),
  email: z.string(),
  phone: z.string(),
  total_amount: z.number(),
  status: OrderStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
});

export type RawOrder = z.infer<typeof RawOrderSchema>;
export type RawOrderItem = z.infer<typeof RawOrderItemSchema>;
export type RawOrderListItem = z.infer<typeof RawOrderListItemSchema>;
