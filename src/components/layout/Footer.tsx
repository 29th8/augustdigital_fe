import Link from "next/link";
import { Mail, Send } from "lucide-react";

const QUICK_LINKS = [
  { label: "Sản phẩm", href: "/products" },
  { label: "Chính sách bảo hành", href: "/warranty" },
  { label: "Chính sách hoàn tiền", href: "/refunds" },
] as const;

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10">

          {/* Brand */}
          <div className="flex flex-col gap-4">
            <p className="text-xl font-bold tracking-tight">
              <span className="text-gray-900">August</span>
              <span className="bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
                Digital
              </span>
            </p>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
              Hàng số cao cấp &amp; đăng ký tự động.
              Giao hàng tức thì, key được xác minh đầy đủ.
            </p>
            <div className="h-px w-12 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full" />
          </div>

          {/* Quick links */}
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Liên kết nhanh
            </p>
            <ul className="flex flex-col gap-2.5">
              {QUICK_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-gray-600 hover:text-cyan-600 transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Hỗ trợ
            </p>
            <ul className="flex flex-col gap-3">
              <li>
                <a
                  href="mailto:support@augustdigital.com"
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-cyan-600 transition-colors"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  support@augustdigital.com
                </a>
              </li>
              <li>
                <a
                  href="https://t.me/augustdigital"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-cyan-600 transition-colors"
                >
                  <Send className="h-3.5 w-3.5 shrink-0" />
                  @augustdigital
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* ── Bottom bar ── */}
        <div className="mt-10 pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-500">
            © 2026 August Digital. Bảo lưu mọi quyền.
          </p>
          <p className="text-xs text-gray-400">
            Xây dựng với Next.js &amp; Spring Boot
          </p>
        </div>

      </div>
    </footer>
  );
}
