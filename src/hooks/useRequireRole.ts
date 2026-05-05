"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useAuthStore from "@/store/useAuthStore";
import type { UserRole } from "@/types/auth";

interface UseRequireRoleResult {
  isChecking: boolean;
}

export function useRequireRole(requiredRole: UserRole): UseRequireRoleResult {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  // Track Zustand hydration: persist rehydrates asynchronously on mount
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Wait one tick for Zustand persist to rehydrate from localStorage
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    if (!isAuthenticated || !user) {
      router.replace("/login");
      return;
    }

    if (user.role !== requiredRole) {
      router.replace("/");
    }
  }, [isHydrated, isAuthenticated, user, requiredRole, router]);

  const isChecking =
    !isHydrated ||
    !isAuthenticated ||
    !user ||
    user.role !== requiredRole;

  return { isChecking };
}
