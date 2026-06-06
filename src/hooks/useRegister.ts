"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import AuthService from "@/services/auth.service";
import useAuthStore from "@/store/useAuthStore";
import { ApiErrorResponse } from "@/types/api";

const registerSchema = z
  .object({
    email: z.string().email("Vui lòng nhập địa chỉ email hợp lệ."),
    phone: z.string().min(9, "Số điện thoại không hợp lệ.").max(15, "Số điện thoại không hợp lệ."),
    password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự."),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu."),
  })
  .refine((d) => d.password === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu xác nhận không khớp.",
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export function useRegister() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const { accessToken } = await AuthService.register({
        email: values.email,
        password: values.password,
        phone: values.phone,
      });
      const user = await AuthService.getMe(accessToken);
      setAuth(accessToken, user);
      toast.success("Tạo tài khoản thành công! Chào mừng bạn đến với AugustDigital.");
      router.push("/");
    } catch (err) {
      const apiErr = err as ApiErrorResponse;
      // Surface backend field-level validation errors when present
      const message =
        apiErr.errors?.length
          ? apiErr.errors.map((e) => e.message).join(" ")
          : (apiErr.message ?? "Đăng ký thất bại. Vui lòng thử lại.");
      toast.error(message);
    }
  });

  return { form, onSubmit, isSubmitting: form.formState.isSubmitting };
}
