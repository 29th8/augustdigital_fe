export const SESSION_KEY = "x-session-id";

/**
 * Returns the guest session UUID, creating and persisting one on first call.
 * Returns an empty string during SSR (window not available).
 */
export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/**
 * Returns the current session ID if one already exists, without creating a new one.
 * Returns null if the user has never had a guest session.
 * Used to check whether a guest cart merge is needed before login.
 */
export function peekSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_KEY);
}

/**
 * Returns the X-Session-ID header object for cart/order requests.
 * Always include this so guests can use their session cart.
 * The backend ignores it when a valid JWT is present.
 */
export function sessionHeader(): Record<string, string> {
  const id = getSessionId();
  return id ? { "X-Session-ID": id } : {};
}
