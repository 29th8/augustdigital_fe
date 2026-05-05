"use client";

import { useEffect, useState } from "react";
import { useCrossTabSync } from "@/hooks/useCrossTabSync";
import { usePendingOrderRecovery } from "@/hooks/usePendingOrderRecovery";

/**
 * Inner component — only rendered after the client has mounted.
 * Calling browser-only hooks (BroadcastChannel, localStorage, etc.) here
 * ensures they never run during SSR pre-rendering.
 */
function MountedAppInit() {
  useCrossTabSync();
  usePendingOrderRecovery();
  return null;
}

/**
 * Headless client component that mounts app-level side-effects once.
 * Placed in the main layout so it lives for the full user session.
 *
 * The mounted guard delays MountedAppInit until after hydration so that
 * browser-only APIs (BroadcastChannel, localStorage, navigator) never
 * run on the server and never cause a hydration mismatch.
 */
export function AppInit() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return <MountedAppInit />;
}
