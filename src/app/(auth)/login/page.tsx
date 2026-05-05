import type { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Đăng nhập",
};

export default function LoginPage() {
  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-xl">
        {/* Brand */}
        <div className="mb-8 text-center space-y-1">
          <p className="text-2xl font-bold tracking-tight text-gray-900">
            August<span className="text-blue-600">Digital</span>
          </p>
          <p className="text-sm text-gray-500">Đăng nhập vào tài khoản của bạn</p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
