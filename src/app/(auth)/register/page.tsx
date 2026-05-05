import type { Metadata } from "next";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Đăng ký",
};

export default function RegisterPage() {
  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-xl">
        {/* Brand */}
        <div className="mb-8 text-center space-y-1">
          <p className="text-2xl font-bold tracking-tight text-gray-900">
            August<span className="text-blue-600">Digital</span>
          </p>
          <p className="text-sm text-gray-500">
            Tạo tài khoản mới
          </p>
        </div>

        <RegisterForm />
      </div>
    </div>
  );
}
