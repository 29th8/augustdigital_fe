"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import useAuthStore from "@/store/useAuthStore";

export function useLogout() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  return () => {
    logout(); // clears Zustand state + cookie atomically
    toast.success("Đăng xuất thành công.");
    router.push("/login");
  };
}
