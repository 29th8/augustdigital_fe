import { z } from "zod";

export const PaymentMethodSchema = z.enum(["VNPAY", "MOMO"]);

export const RawPaymentResponseSchema = z.object({
  payment_url: z.string(),
  order_code: z.string(),
  amount: z.number(),
  method: PaymentMethodSchema,
  expired_at: z.string(),
});

export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
export type RawPaymentResponse = z.infer<typeof RawPaymentResponseSchema>;
