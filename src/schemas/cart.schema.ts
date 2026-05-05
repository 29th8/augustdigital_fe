import { z } from "zod";

// Cart item — accept both snake_case (backend standard) and camelCase variants
export const RawCartItemSchema = z.object({
  variant_id: z.number().optional(),
  variantId: z.number().optional(),
  product_id: z.number().optional(),
  productId: z.number().optional(),
  product_name: z.string().optional(),
  productName: z.string().optional(),
  variant_name: z.string().optional(),
  variantName: z.string().optional(),
  price: z.number(),
  quantity: z.number().int().min(1),
  subtotal: z.number(),
});

// Cart envelope — total_amount is snake_case per API docs
export const RawCartSchema = z.object({
  items: z.array(z.unknown()),
  total_amount: z.number().optional(),
  totalAmount: z.number().optional(),
});

export type RawCartItem = z.infer<typeof RawCartItemSchema>;
export type RawCart = z.infer<typeof RawCartSchema>;
