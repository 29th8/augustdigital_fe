"use client";

import axios from "axios";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * Returns true when the query should be retried.
 *
 * Rules:
 *  1. NEVER retry a cancelled request — the user intentionally navigated away.
 *     Retrying would fire a ghost request, potentially racing with the new mount's
 *     own fetch and leaving the query in a stuck/inconsistent state.
 *  2. Retry real errors up to once (mirrors the original `retry: 1` behaviour).
 *
 * Using a function (not a number) is the only way to apply rule 1, because a
 * numeric `retry: 1` does not have access to the error and cannot discriminate.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (axios.isCancel(error)) return false;
  return failureCount < 1;
}

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: shouldRetry,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
