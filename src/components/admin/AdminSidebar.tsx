"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Package,
  Tag,
  Warehouse,
  BarChart2,
  ShoppingBag,
  Ticket,
  Users,
  ShieldCheck,
  RotateCcw,
  ChevronsLeft,
  ChevronsRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SidebarUserFooter from "@/components/admin/SidebarUserFooter";

// ─── Navigation config ────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "Tổng quan", href: "/admin/analytics", icon: BarChart2 },
  { label: "Đơn hàng", href: "/admin/orders", icon: ShoppingBag },
  { label: "Sản phẩm", href: "/admin/products", icon: Package },
  { label: "Danh mục", href: "/admin/categories", icon: Tag },
  { label: "Kho hàng", href: "/admin/inventory", icon: Warehouse },
  { label: "Mã giảm giá", href: "/admin/discounts", icon: Ticket },
  { label: "Bảo hành", href: "/admin/warranty", icon: ShieldCheck },
  { label: "Hoàn tiền", href: "/admin/refunds", icon: RotateCcw },
  { label: "Người dùng", href: "/admin/users", icon: Users },
] as const;

// ─── Lightweight tooltip (no external dep, named group pattern) ───────────────
// Only rendered when sidebar is collapsed (icon-only mode).

function NavTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative group/tip">
      {children}
      <div
        className={cn(
          // Position: to the right of the icon
          "pointer-events-none absolute left-full top-1/2 z-[60] ml-3 -translate-y-1/2",
          // Appearance
          "whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg",
          // Animation: fade in after 200ms delay to prevent flicker on quick scans
          "opacity-0 transition-opacity duration-150 delay-[200ms]",
          "group-hover/tip:opacity-100",
        )}
      >
        {/* Arrow pointing left */}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
        {label}
      </div>
    </div>
  );
}

// ─── SidebarItem ──────────────────────────────────────────────────────────────

interface SidebarItemProps {
  href: string;
  label: string;
  icon: React.ElementType;
  isActive: boolean;
  /** When true the item renders icon-only (no text) with a tooltip. */
  iconOnly: boolean;
  onClick?: () => void;
}

function SidebarItem({ href, label, icon: Icon, isActive, iconOnly, onClick }: SidebarItemProps) {
  const linkEl = (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group relative flex items-center rounded-md text-sm font-medium transition-colors duration-150",
        iconOnly
          ? "mx-auto h-10 w-10 justify-center"
          : "w-full gap-3 px-3 py-2",
        isActive
          ? "bg-cyan-50 text-cyan-700"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
      )}
    >
      {/* Left accent bar — expanded mode only */}
      {isActive && !iconOnly && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-cyan-500" />
      )}

      {/* Ring highlight — icon-only mode */}
      {isActive && iconOnly && (
        <span className="absolute inset-0 rounded-md ring-1 ring-inset ring-cyan-200" />
      )}

      <Icon
        className={cn(
          "shrink-0 transition-colors",
          iconOnly ? "h-[18px] w-[18px]" : "h-4 w-4",
          isActive
            ? "text-cyan-600"
            : "text-gray-500 group-hover:text-gray-700",
        )}
      />

      {!iconOnly && <span className="truncate">{label}</span>}
    </Link>
  );

  if (iconOnly) {
    return <NavTooltip label={label}>{linkEl}</NavTooltip>;
  }
  return linkEl;
}

// ─── AdminSidebar ─────────────────────────────────────────────────────────────

export interface AdminSidebarProps {
  /** Whether the sidebar is in collapsed (icon-only) mode. Ignored on mobile. */
  collapsed: boolean;
  /** Called when the toggle button is clicked (desktop only). */
  onToggle?: () => void;
  /** Called when the close / X button is clicked (mobile only). */
  onClose?: () => void;
  /** When true, sidebar always renders in expanded mode (used inside Sheet). */
  isMobile?: boolean;
}

export default function AdminSidebar({
  collapsed,
  onToggle,
  onClose,
  isMobile = false,
}: AdminSidebarProps) {
  const pathname = usePathname();

  // In mobile mode the sidebar is always "expanded"
  const isIconOnly = collapsed && !isMobile;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Header: logo + toggle / close ── */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b border-gray-100",
          isIconOnly ? "flex-col justify-center gap-1 py-2" : "justify-between px-4",
        )}
      >
        {/* Logo — hidden when icon-only */}
        {!isIconOnly && (
          <Link
            href="/"
            onClick={onClose}
            className="flex items-center gap-1 text-[17px] font-bold tracking-tight"
          >
            <span className="text-gray-900">August</span>
            <span className="bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
              Digital
            </span>
            <span className="ml-1 rounded border border-cyan-200 bg-cyan-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-cyan-600">
              Admin
            </span>
          </Link>
        )}

        {/* Logo icon substitute when icon-only */}
        {isIconOnly && (
          <NavTooltip label="August Digital">
            <Link
              href="/"
              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-gray-100 transition-colors"
            >
              <span className="bg-gradient-to-br from-cyan-500 to-blue-600 bg-clip-text text-transparent text-sm font-black">
                A
              </span>
            </Link>
          </NavTooltip>
        )}

        {/* Toggle (desktop) or Close (mobile) */}
        {isMobile ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng sidebar"
            className="flex h-7 w-7 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <NavTooltip label={isIconOnly ? "Mở rộng" : "Thu gọn"}>
            <button
              type="button"
              onClick={onToggle}
              aria-label={isIconOnly ? "Mở rộng sidebar" : "Thu gọn sidebar"}
              className={cn(
                "flex items-center justify-center rounded-md text-gray-400",
                "hover:bg-gray-100 hover:text-gray-600 transition-colors",
                isIconOnly ? "h-8 w-8" : "h-7 w-7",
              )}
            >
              {isIconOnly ? (
                <ChevronsRight className="h-4 w-4" />
              ) : (
                <ChevronsLeft className="h-4 w-4" />
              )}
            </button>
          </NavTooltip>
        )}
      </div>

      {/* ── Nav ── */}
      <nav
        className={cn(
          "flex flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden py-3 scrollbar-none",
          isIconOnly ? "px-2 items-center" : "px-3",
        )}
      >
        {NAV_ITEMS.map(({ label, href, icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <SidebarItem
              key={href}
              href={href}
              label={label}
              icon={icon}
              isActive={isActive}
              iconOnly={isIconOnly}
              onClick={onClose}
            />
          );
        })}
      </nav>

      {/* ── User footer ── */}
      <SidebarUserFooter iconOnly={isIconOnly} />
    </div>
  );
}
