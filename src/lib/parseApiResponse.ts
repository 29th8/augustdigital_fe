import { z } from "zod";
import { toast } from "sonner";

/**
 * Validates the raw data portion of an API response against a Zod schema.
 *
 * Flow: API response → parseApiResponse() → normalized data → UI
 *
 * On failure:
 * - Logs structured parse errors to the console for debugging
 * - Shows a user-facing toast ("Dữ liệu không hợp lệ từ server.")
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
    toast.error("Dữ liệu không hợp lệ từ server.");
    throw new Error(`Invalid API response${tag}`);
  }

  return result.data;
}
