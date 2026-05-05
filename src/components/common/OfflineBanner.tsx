"use client";

import { WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

/**
 * Fixed banner shown at the bottom of the screen when the device is offline.
 * Disappears automatically when connectivity is restored.
 */
export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-full shadow-lg animate-in fade-in slide-in-from-bottom-2"
    >
      <WifiOff className="h-4 w-4 text-red-400 shrink-0" />
      Mất kết nối — các thay đổi sẽ được đồng bộ khi có mạng
    </div>
  );
}
