/**
 * Typed BroadcastChannel wrapper for cross-tab state sync.
 *
 * BroadcastChannel does NOT deliver messages back to the sending context,
 * so there is no risk of self-looping: a tab that posts CART_UPDATED will
 * never receive its own message.
 *
 * The module-level singleton ensures one channel per browser context. All
 * message types are discriminated-union typed for exhaustive handling.
 */

import type { Cart } from "@/types/cart";
import type { OrderStatus } from "@/types/order";

// ─── Message union ────────────────────────────────────────────────────────────

export type AppChannelMessage =
  | { type: "CART_UPDATED"; cart: Cart }
  | { type: "LOGGED_OUT" }
  | { type: "ORDER_STATUS"; orderCode: string; status: OrderStatus }
  | { type: "NOTIFICATIONS_READ" };

// ─── Channel implementation ───────────────────────────────────────────────────

const CHANNEL_NAME = "ad-app";

class AppChannelImpl {
  private bc: BroadcastChannel | null = null;

  /** Lazy-initialise: safe to call at module load time (SSR guard inside). */
  private getInstance(): BroadcastChannel | null {
    if (typeof window === "undefined") return null;
    if (!("BroadcastChannel" in window)) return null;
    if (!this.bc) this.bc = new BroadcastChannel(CHANNEL_NAME);
    return this.bc;
  }

  post(msg: AppChannelMessage): void {
    this.getInstance()?.postMessage(msg);
  }

  /** Returns an unsubscribe function. */
  subscribe(handler: (msg: AppChannelMessage) => void): () => void {
    const bc = this.getInstance();
    if (!bc) return () => {};
    const listener = (e: MessageEvent<AppChannelMessage>) => handler(e.data);
    bc.addEventListener("message", listener);
    return () => bc.removeEventListener("message", listener);
  }
}

// One singleton per browsing context.
let _channel: AppChannelImpl | null = null;

export function getAppChannel(): AppChannelImpl {
  if (!_channel) _channel = new AppChannelImpl();
  return _channel;
}
