"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  RefreshCcw,
  Settings2,
  ShieldCheck,
  ShoppingCart,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useLogout } from "@/hooks/useLogout";
import useAuthStore from "@/store/useAuthStore";
import { useCartItemCount } from "@/hooks/useCart";
import { useCartStore } from "@/store/useCartStore";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Trang chủ", href: "/" },
  { label: "Sản phẩm", href: "/products" },
  { label: "Đơn hàng", href: "/orders" },
  { label: "Bảo hành", href: "/warranty" },
] as const;

// Stub: wire to a real notification hook in a future phase
const NOTIFICATION_COUNT = 0;

function getInitials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

function Logo() {
  return (
    <span className="text-xl font-bold tracking-tight">
      <span className="text-gray-900">August</span>
      <span className="bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
        Digital
      </span>
    </span>
  );
}

export default function Header() {
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const handleLogout = useLogout();
  const cartCount = useCartItemCount();
  const toggleCart = useCartStore((s) => s.toggle);
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

        {/* ── Logo ── */}
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>

        {/* ── Desktop nav ── */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                pathname === href
                  ? "text-cyan-600"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* ── Right side ── */}
        <div className="flex items-center gap-2">

          {/* Cart button — always visible */}
          <button
            onClick={toggleCart}
            aria-label="Giỏ hàng"
            className="relative p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <ShoppingCart className="h-4 w-4" />
            {cartCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[9px] font-bold text-white">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </button>

          {isAuthenticated && user ? (
            <>
              {/* Notification bell */}
              <button
                aria-label="Thông báo"
                className="relative p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <Bell className="h-4 w-4" />
                {NOTIFICATION_COUNT > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[9px] font-bold text-white">
                    {NOTIFICATION_COUNT > 9 ? "9+" : NOTIFICATION_COUNT}
                  </span>
                )}
              </button>

              {/* User dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Menu tài khoản"
                    className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  >
                    <Avatar className="h-8 w-8 border border-gray-200 bg-gray-100">
                      <AvatarFallback className="bg-cyan-50 text-cyan-600 text-xs font-semibold">
                        {getInitials(user.email)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-white border-gray-200 text-gray-900 shadow-lg"
                >
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs text-gray-500">Đăng nhập với</p>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.email}
                      </p>
                      <p className="text-xs text-cyan-600 capitalize">
                        {user.role.toLowerCase()}
                      </p>
                    </div>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator className="bg-gray-100" />

                  {user.role === "ADMIN" && (
                    <DropdownMenuItem asChild className="text-cyan-700 focus:text-cyan-800 focus:bg-cyan-50 cursor-pointer font-medium">
                      <Link href="/admin">
                        <Settings2 className="mr-2 h-4 w-4" />
                        Bảng quản trị
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem asChild className="text-gray-700 focus:text-gray-900 focus:bg-gray-50 cursor-pointer">
                    <Link href="/dashboard">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Trang cá nhân
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-gray-700 focus:text-gray-900 focus:bg-gray-50 cursor-pointer">
                    <Link href="/orders">
                      <Package className="mr-2 h-4 w-4" />
                      Đơn hàng của tôi
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-gray-700 focus:text-gray-900 focus:bg-gray-50 cursor-pointer">
                    <Link href="/warranty">
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Bảo hành
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="text-gray-700 focus:text-gray-900 focus:bg-gray-50 cursor-pointer">
                    <Link href="/refunds">
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Hoàn tiền
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-gray-100" />

                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-500 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            /* Guest buttons — desktop only; mobile handled by Sheet */
            <div className="hidden md:flex items-center gap-2">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <Link href="/login">Đăng nhập</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
              >
                <Link href="/register">Đăng ký</Link>
              </Button>
            </div>
          )}

          {/* ── Mobile hamburger ── */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Mở menu điều hướng"
                className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>

            <SheetContent
              side="right"
              className="w-72 bg-white border-gray-200 p-0 flex flex-col gap-0"
            >
              <SheetTitle className="sr-only">Menu điều hướng</SheetTitle>

              {/* Sheet logo row */}
              <div className="flex items-center px-5 h-16 border-b border-gray-200 shrink-0">
                <Link href="/" onClick={closeMobile}>
                  <Logo />
                </Link>
              </div>

              {/* Nav links */}
              <nav className="flex flex-col gap-1 p-4 flex-1">
                {NAV_LINKS.map(({ label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeMobile}
                    className={cn(
                      "px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                      pathname === href
                        ? "text-cyan-600 bg-cyan-50"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    )}
                  >
                    {label}
                  </Link>
                ))}
              </nav>

              {/* Sheet footer — auth section */}
              <SheetFooter className="border-t border-gray-200">
                {isAuthenticated && user ? (
                  <div className="flex flex-col gap-3 w-full">
                    <div className="flex items-center gap-3 px-1">
                      <Avatar className="h-8 w-8 border border-gray-200">
                        <AvatarFallback className="bg-cyan-50 text-cyan-600 text-xs font-semibold">
                          {getInitials(user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 truncate">
                          {user.email}
                        </p>
                        <p className="text-xs text-cyan-600 capitalize">
                          {user.role.toLowerCase()}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => { closeMobile(); handleLogout(); }}
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Đăng xuất
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 w-full">
                    <Button
                      asChild
                      variant="ghost"
                      className="w-full text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    >
                      <Link href="/login" onClick={closeMobile}>
                        Đăng nhập
                      </Link>
                    </Button>
                    <Button
                      asChild
                      className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
                    >
                      <Link href="/register" onClick={closeMobile}>
                        Đăng ký
                      </Link>
                    </Button>
                  </div>
                )}
              </SheetFooter>
            </SheetContent>
          </Sheet>

        </div>
      </div>
    </header>
  );
}
