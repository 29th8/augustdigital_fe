"use client";

import { useEffect, useState } from "react";

/**
 * Tracks browser online/offline status.
 * Always initialises to `true` (matches SSR) and syncs the real value in
 * useEffect to avoid a server/client hydration mismatch.
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Sync the real value after mount (browser-only API).
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline };
}
