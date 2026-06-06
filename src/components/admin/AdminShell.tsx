"use client";

import { useState, useEffect, useCallback } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import AdminSidebar from "@/components/admin/AdminSidebar";
import NotificationBell from "@/components/notifications/NotificationBell";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "admin-sidebar-collapsed";

// ─── AdminShell ───────────────────────────────────────────────────────────────

interface AdminShellProps {
  children: React.ReactNode;
}

export default function AdminShell({ children }: AdminShellProps) {
  // ── Collapsed state ────────────────────────────────────────────────────────
  // Initialized to `false` to match server render — avoids hydration mismatch.
  // After mount, synced from localStorage. The CSS transition handles the
  // expansion/collapse animation so there is no visible "jump".
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // ── Mobile sheet state ─────────────────────────────────────────────────────
  // Not persisted — always starts closed on page load.
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) setCollapsed(stored === "true");
    } catch {
      // localStorage may be unavailable (private mode, etc.) — keep default.
    }
    setMounted(true);
  }, []);

  const handleToggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Ignore write failures.
      }
      return next;
    });
  }, []);

  // The sidebar is collapsed only after hydration is confirmed (`mounted`).
  // Before mounted we always render expanded to match SSR.
  const isCollapsed = mounted && collapsed;

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* ── Desktop sidebar ─────────────────────────────────────────────────── */}
      <aside
        className={cn(
          // Hide on mobile; flex on md+
          "hidden md:flex shrink-0 flex-col",
          "border-r border-gray-100 bg-white",
          // Width transition — GPU-composited, no layout thrashing
          "transition-[width] duration-300 ease-in-out",
          // overflow-hidden keeps content clipped while width animates
          "overflow-hidden",
          isCollapsed ? "w-[72px]" : "w-[260px]",
        )}
      >
        <AdminSidebar
          collapsed={isCollapsed}
          onToggle={handleToggle}
        />
      </aside>

      {/* ── Mobile sheet (drawer) ────────────────────────────────────────────── */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[260px] p-0 gap-0"
        >
          <AdminSidebar
            collapsed={false}
            isMobile
            onClose={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* ── Content area ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile top bar — only visible below md breakpoint */}
        <header className="md:hidden flex h-14 shrink-0 items-center gap-3 border-b border-gray-100 bg-white px-4">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Mở menu"
            className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link
            href="/"
            className="flex items-center gap-0.5 text-[16px] font-bold tracking-tight"
          >
            <span className="text-gray-900">August</span>
            <span className="bg-gradient-to-r from-cyan-500 to-blue-600 bg-clip-text text-transparent">
              Digital
            </span>
          </Link>

          <div className="ml-auto">
            <NotificationBell />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto min-w-0">
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
