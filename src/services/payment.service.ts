import apiClient from "./apiClient";
import { parseApiResponse } from "@/lib/parseApiResponse";
import { RawPaymentResponseSchema } from "@/schemas/payment.schema";
import type { ApiResponse } from "@/types/api";
import type { PaymentMethod } from "@/schemas/payment.schema";

export interface CreatePaymentResult {
  paymentUrl?: string;
  qrCode?: string;
  orderCode: string;
  amount: number;
  method: PaymentMethod;
  expiredAt: string;
}

export const PaymentService = {
  async createPayment(
    orderCode: string,
    method: PaymentMethod,
  ): Promise<CreatePaymentResult> {
    const res = await apiClient.post<ApiResponse<unknown>>("/api/v1/payments/create", {
      order_code: orderCode,
      method,
    });
    const raw = parseApiResponse(RawPaymentResponseSchema, res.data.data, "createPayment");
    return {
      paymentUrl: raw.payment_url,
      qrCode: raw.qr_code,
      orderCode: raw.order_code,
      amount: raw.amount,
      method: raw.method,
      expiredAt: raw.expired_at,
    };
  },
};
