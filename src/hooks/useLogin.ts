"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import AuthService from "@/services/auth.service";
import { CartService } from "@/services/cart.service";
import useAuthStore from "@/store/useAuthStore";
import { redirectByRole } from "@/lib/redirectByRole";
import { peekSessionId } from "@/lib/sessionId";
import { CART_QUERY_KEY } from "@/hooks/useCart";
import { ApiErrorResponse } from "@/types/api";

const loginSchema = z.object({
  email: z.string().email("Vui lòng nhập địa chỉ email hợp lệ."),
  password: z.string().min(1, "Mật khẩu là bắt buộc."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export function useLogin() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      // ── 1. Snapshot guest cart BEFORE setting JWT ──────────────────────────
      // peekSessionId() returns null if no guest session exists — skip merge.
      const guestSessionId = peekSessionId();
      let guestItems: Array<{ variantId: number; quantity: number }> = [];

      if (guestSessionId) {
        try {
          const guestCart = await CartService.getCart();
          guestItems = guestCart.items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
          }));
        } catch {
          // Guest cart may be empty or unreachable — merge is best-effort.
        }
      }

      // ── 2. Authenticate ────────────────────────────────────────────────────
      const { accessToken } = await AuthService.login(values);
      const user = await AuthService.getMe(accessToken);
      setAuth(accessToken, user); // JWT is now in the store

      // ── 3. Merge guest items into user cart (best-effort) ──────────────────
      // apiClient interceptor now attaches JWT, so these calls go to user cart.
      if (guestItems.length > 0) {
        await Promise.allSettled(
          guestItems.map((item) =>
            CartService.addToCart(item.variantId, item.quantity),
          ),
        );

        // Clean up the guest cart in the backend (raw axios, no JWT).
        try {
          await CartService.clearGuestCart(guestSessionId!);
        } catch {
          // Guest cart cleanup is cosmetic — ignore failures.
        }

        // Sync the React Query cart cache after merge.
        queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      }

      toast.success("Chào mừng bạn trở lại!");
      redirectByRole(user, router);
    } catch (err) {
      const apiErr = err as ApiErrorResponse;
      toast.error(apiErr.message ?? "Đăng nhập thất bại. Vui lòng thử lại.");
    }
  });

  return { form, onSubmit, isSubmitting: form.formState.isSubmitting };
}
