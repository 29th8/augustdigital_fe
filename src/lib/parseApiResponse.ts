import { z } from "zod";
import { toast } from "sonner";

/** Timestamp of the last toast shown per context — prevents toast spam on polling. */
const _lastToastAt: Record<string, number> = {};
const TOAST_THROTTLE_MS = 30_000;

/**
 * Validates the raw data portion of an API response against a Zod schema.
 *
 * Flow: API response → parseApiResponse() → normalized data → UI
 *
 * On failure:
 * - Logs structured parse errors to the console for debugging
 * - Shows a user-facing toast throttled per context (max once per 30s)
 *   so background polling errors don't spam the user
 * - Throws so the React Query error state is triggered
 */
export function parseApiResponse<T extends z.ZodType>(
  schema: T,
  data: unknown,
  context?: string,
): z.infer<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    const tag = context ? ` [${context}]` : "";
    console.error(`[Zod Parse Error]${tag}:`, result.error.issues);

    const now = Date.now();
    const key = context ?? "__global__";
    if (!_lastToastAt[key] || now - _lastToastAt[key] > TOAST_THROTTLE_MS) {
      _lastToastAt[key] = now;
      toast.error("Dữ liệu không hợp lệ từ server.");
    }

    throw new Error(`Invalid API response${tag}`);
  }

  return result.data;
}
