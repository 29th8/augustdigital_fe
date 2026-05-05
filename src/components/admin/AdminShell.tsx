"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Tag, Warehouse, BarChart2, LogOut } from "lucide-react";
import { useLogout } from "@/hooks/useLogout";
import useAuthStore from "@/store/useAuthStore";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Tổng quan", href: "/admin", icon: LayoutDashboard },
  { label: "Sản phẩm", href: "/admin/products", icon: Package },
  { label: "Danh mục", href: "/admin/categories", icon: Tag },
  { label: "Kho hàng", href: "/admin/inventory", icon: Warehouse },
  { label: "Phân tích", href: "/admin/analytics", icon: BarChart2 },
] as const;

interface AdminShellProps {
  children: React.ReactNode;
}

export default function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const handleLogout = useLogout();

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 flex flex-col border-r border-gray-200 bg-white">
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-gray-200 shrink-0">
          <Link href="/" className="text-xl font-bold tracking-tight">
            <span className="text-gray-900">August</span>
            <span className="bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
              Digital
            </span>
          </Link>
          <span className="ml-2 text-[10px] font-semibold uppercase tracking-widest text-cyan-600 bg-cyan-50 border border-cyan-200 px-1.5 py-0.5 rounded">
            Quản trị
          </span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 p-3 flex-1">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const isActive =
              href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-cyan-50 text-cyan-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User row */}
        <div className="border-t border-gray-200 p-3">
          <div className="flex items-center gap-2.5 px-2 py-1.5 mb-1">
            <div className="h-7 w-7 rounded-full bg-cyan-50 border border-cyan-200 flex items-center justify-center text-xs font-semibold text-cyan-600 shrink-0">
              {user?.email.slice(0, 2).toUpperCase()}
            </div>
            <p className="text-xs text-gray-600 truncate flex-1">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
