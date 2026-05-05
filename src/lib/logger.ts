import type { ZodIssue } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ValidationFailure {
  /** Service method or schema context, e.g. "product", "category" */
  context: string;
  /** Zod issues from safeParse — field paths + messages */
  issues: ZodIssue[];
  /** First 200 chars of JSON-serialised payload for quick inspection */
  payloadSnippet: string;
}

// ─── Core reporter ────────────────────────────────────────────────────────────

/**
 * Logs a batch of validation failures.
 *
 * Receives all failures collected for one context (e.g. all invalid products
 * from a single getProducts call) so monitoring is one event per request,
 * not one event per invalid item.
 *
 * Dev  → structured console.warn with full detail
 * Prod → send to your monitoring service (Sentry / LogRocket / custom API)
 */
export function logValidationBatch(
  context: string,
  failures: ValidationFailure[],
): void {
  if (failures.length === 0) return;

  if (process.env.NODE_ENV === "production") {
    // ── Wire up your monitoring service here ─────────────────────────────
    //
    // Sentry:
    // import * as Sentry from "@sentry/nextjs";
    // Sentry.withScope((scope) => {
    //   scope.setContext("validation", { context, failureCount: failures.length, failures });
    //   Sentry.captureMessage(
    //     `[Validation] ${failures.length} item(s) failed in "${context}"`,
    //     "warning",
    //   );
    // });
    //
    // Custom ingest endpoint:
    // fetch("/api/errors", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ type: "validation", context, failures }),
    // }).catch(() => {});
    //
    // ─────────────────────────────────────────────────────────────────────
  } else {
    console.warn(
      `[Validation Warning] [${context}]: ${failures.length} item(s) failed`,
      failures.map((f) => ({
        issues: f.issues,
        payload: f.payloadSnippet,
      })),
    );
  }
}
