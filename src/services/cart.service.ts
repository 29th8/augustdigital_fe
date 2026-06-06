import axios from "axios";
import { z } from "zod";
import apiClient from "./apiClient";
import { parseApiResponse } from "@/lib/parseApiResponse";
import { validateSafe } from "@/lib/validateSafe";
import { sessionHeader } from "@/lib/sessionId";
import { RawCartSchema, RawCartItemSchema, type RawCartItem } from "@/schemas/cart.schema";
import type { ApiResponse } from "@/types/api";
import type { Cart, CartItem } from "@/types/cart";

// Some endpoints return only { code, message } with no data payload.
const EmptyResponseSchema = z.object({
  code: z.number(),
  message: z.string(),
});

// ─── Normalizer ───────────────────────────────────────────────────────────────

function normalizeCartItem(raw: RawCartItem): CartItem {
  return {
    variantId: raw.variant_id ?? raw.variantId ?? 0,
    productId: raw.product_id ?? raw.productId ?? 0,
    productName: raw.product_name ?? raw.productName ?? "",
    variantName: raw.variant_name ?? raw.variantName ?? "",
    price: raw.price,
    quantity: raw.quantity,
    subtotal: raw.subtotal,
  };
}

function parseCart(data: unknown, context: string): Cart {
  const rawCart = parseApiResponse(RawCartSchema, data, context);
  const items: CartItem[] = [];
  for (const rawItem of rawCart.items) {
    const valid = validateSafe(RawCartItemSchema, rawItem, "cartItem");
    if (valid !== null) items.push(normalizeCartItem(valid));
  }
  return { items, totalAmount: rawCart.total_amount ?? 0 };
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const CartService = {
  async getCart(): Promise<Cart> {
    const res = await apiClient.get<ApiResponse<unknown>>("/api/v1/cart", {
      headers: sessionHeader(),
    });
    return parseCart(res.data.data, "getCart");
  },

  async addToCart(variantId: number, quantity: number): Promise<void> {
    const res = await apiClient.post<unknown>(
      "/api/v1/cart",
      { variantId, quantity },
      { headers: sessionHeader() },
    );
    // Response has no `data` payload — validate only the envelope shape.
    parseApiResponse(EmptyResponseSchema, res.data, "addToCart");
  },

  async updateCartItem(variantId: number, quantity: number): Promise<void> {
    const res = await apiClient.put<unknown>(
      `/api/v1/cart/${variantId}`,
      { quantity },
      { headers: sessionHeader() },
    );
    parseApiResponse(EmptyResponseSchema, res.data, "updateCart");
  },

  async removeFromCart(variantId: number): Promise<void> {
    const res = await apiClient.delete<unknown>(
      `/api/v1/cart/${variantId}`,
      { headers: sessionHeader() },
    );
    parseApiResponse(EmptyResponseSchema, res.data, "removeFromCart");
  },

  async clearCart(): Promise<void> {
    await apiClient.delete("/api/v1/cart/clear", { headers: sessionHeader() });
  },

  /**
   * Clears a guest cart identified by a specific sessionId.
   * Uses raw axios (no apiClient interceptor) so no JWT is injected.
   * Call this during cart merge after login to clean up the guest session.
   */
  async clearGuestCart(sessionId: string): Promise<void> {
    const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
    await axios.delete(`${baseURL}/api/v1/cart/clear`, {
      headers: { "Content-Type": "application/json", "X-Session-ID": sessionId },
    });
  },
};
