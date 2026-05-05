import { z } from "zod";
import { logValidationBatch, type ValidationFailure } from "@/lib/logger";

// ─── Payload snippet ──────────────────────────────────────────────────────────

function toPayloadSnippet(data: unknown, maxLength = 200): string {
  try {
    const json = JSON.stringify(data);
    return json.length > maxLength ? `${json.slice(0, maxLength)}…` : json;
  } catch {
    return "[unserializable]";
  }
}

// ─── Batch buffer ─────────────────────────────────────────────────────────────
//
// Failures are grouped by context and flushed as a single log entry after the
// current synchronous call stack completes (via queueMicrotask). This means
// that a loop like:
//
//   for (const rawItem of rawPage.items) validateSafe(schema, rawItem, "product")
//
// ...emits ONE log entry containing all failures, not one per invalid item.

const batchBuffer = new Map<string, ValidationFailure[]>();

function scheduleFlush(context: string): void {
  queueMicrotask(() => {
    const failures = batchBuffer.get(context);
    batchBuffer.delete(context);
    if (failures?.length) {
      logValidationBatch(context, failures);
    }
  });
}

// ─── validateSafe ─────────────────────────────────────────────────────────────

/**
 * Soft-validates data against a Zod schema.
 *
 * Unlike parseApiResponse (which throws on structural failures), this helper
 * is used for per-item business rule validation in list responses — invalid
 * items are filtered out instead of crashing the entire list.
 *
 * On failure:
 *  - Failure metadata (context + issues + payload snippet) is buffered.
 *  - After the current synchronous stack completes, the buffer is flushed
 *    as ONE log entry via logValidationBatch().
 *  - Dev:  console.warn with full detail
 *  - Prod: sent to monitoring service (configure in lib/logger.ts)
 *
 * Returns null on failure so callers can filter:
 *   const valid = validateSafe(RawProductSchema, rawItem, "product");
 *   if (valid !== null) items.push(normalizeProduct(valid));
 */
export function validateSafe<T extends z.ZodType>(
  schema: T,
  data: unknown,
  context?: string,
): z.infer<T> | null {
  const result = schema.safeParse(data);

  if (!result.success) {
    const tag = context ?? "unknown";

    const failure: ValidationFailure = {
      context: tag,
      issues: result.error.issues,
      payloadSnippet: toPayloadSnippet(data),
    };

    if (!batchBuffer.has(tag)) {
      batchBuffer.set(tag, []);
      scheduleFlush(tag);
    }
    batchBuffer.get(tag)!.push(failure);

    return null;
  }

  return result.data;
}
