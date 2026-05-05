import type { UserProfile } from "@/types/auth";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export function redirectByRole(user: UserProfile, router: AppRouterInstance): void {
  if (user.role === "ADMIN") {
    router.push("/admin");
  } else {
    router.push("/");
  }
}
