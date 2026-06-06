"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRegister } from "@/hooks/useRegister";

const INPUT_CLASS =
  "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus-visible:ring-blue-500/40 focus-visible:border-blue-500";

export default function RegisterForm() {
  const { form, onSubmit, isSubmitting } = useRegister();
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-sm font-medium text-gray-700">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          {...register("email")}
          aria-invalid={!!errors.email}
          className={INPUT_CLASS}
        />
        {errors.email && (
          <p className="text-xs text-red-500">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
          Số điện thoại
        </Label>
        <Input
          id="phone"
          type="tel"
          autoComplete="tel"
          placeholder="0901234567"
          {...register("phone")}
          aria-invalid={!!errors.phone}
          className={INPUT_CLASS}
        />
        {errors.phone && (
          <p className="text-xs text-red-500">{errors.phone.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-sm font-medium text-gray-700">
          Mật khẩu
        </Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="Tối thiểu 6 ký tự"
          {...register("password")}
          aria-invalid={!!errors.password}
          className={INPUT_CLASS}
        />
        {errors.password && (
          <p className="text-xs text-red-500">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor="confirmPassword"
          className="text-sm font-medium text-gray-700"
        >
          Xác nhận mật khẩu
        </Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Nhập lại mật khẩu"
          {...register("confirmPassword")}
          aria-invalid={!!errors.confirmPassword}
          className={INPUT_CLASS}
        />
        {errors.confirmPassword && (
          <p className="text-xs text-red-500">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-gray-900 hover:bg-gray-700 text-white font-semibold transition-colors"
      >
        {isSubmitting ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
      </Button>

      <p className="text-center text-sm text-gray-500">
        Đã có tài khoản?{" "}
        <Link
          href="/login"
          className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
        >
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
