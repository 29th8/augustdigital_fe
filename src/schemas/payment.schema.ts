import { z } from "zod";

export const PaymentMethodSchema = z.enum(["PAYOS", "FREE"]);

export const RawPaymentResponseSchema = z.preprocess(
  (raw) => {
    if (typeof raw !== "object" || raw === null) return raw;
    const o = raw as Record<string, unknown>;
    return {
      payment_url: o.payment_url ?? o.paymentUrl,
      qr_code:     o.qr_code     ?? o.qrCode,
      order_code:  o.order_code  ?? o.orderCode,
      amount:      o.amount,
      method:      o.method,
      expired_at:  o.expired_at  ?? o.expiredAt,
    };
  },
  z.object({
    payment_url: z.string().optional(),
    qr_code:     z.string().optional(),
    order_code:  z.string(),
    amount:      z.number(),
    method:      PaymentMethodSchema,
    expired_at:  z.string(),
  }),
);

export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
export type RawPaymentResponse = z.infer<typeof RawPaymentResponseSchema>;
