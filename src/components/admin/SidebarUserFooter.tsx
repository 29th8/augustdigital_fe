"use client";

import { useState } from "react";
import {
  LogOut,
  ChevronUp,
  User,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/notifications/NotificationBell";
import { useLogout } from "@/hooks/useLogout";
import useAuthStore from "@/store/useAuthStore";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

function getUsername(email: string): string {
  return email.split("@")[0];
}

// Deterministic gradient from first character of email — stable across renders.
const GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-cyan-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-pink-500 to-rose-600",
  "from-sky-500 to-indigo-600",
];

function getAvatarGradient(email: string): string {
  return GRADIENTS[email.charCodeAt(0) % GRADIENTS.length];
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function UserAvatar({
  email,
  size = "md",
}: {
  email: string;
  size?: "sm" | "md";
}) {
  const gradient = getAvatarGradient(email);
  const initials = getInitials(email);

  return (
    <div className="relative shrink-0">
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white",
          "ring-2 ring-white shadow-sm",
          size === "sm" ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-xs",
          gradient,
        )}
      >
        {initials}
      </div>
      {/* Online indicator */}
      <span
        className={cn(
          "absolute rounded-full bg-emerald-400 ring-2 ring-white",
          size === "sm" ? "bottom-0 right-0 h-2 w-2" : "bottom-0 right-0 h-2.5 w-2.5",
        )}
      />
    </div>
  );
}

// ─── Dropdown content (shared between collapsed + expanded modes) ─────────────

function UserDropdownMenu({
  email,
  side,
  align,
  sideOffset,
  onLogoutRequest,
}: {
  email: string;
  side: "top" | "right";
  align: "start" | "end" | "center";
  sideOffset: number;
  onLogoutRequest: () => void;
}) {
  const gradient = getAvatarGradient(email);
  const initials = getInitials(email);
  const username = getUsername(email);

  return (
    <DropdownMenuContent
      side={side}
      align={align}
      sideOffset={sideOffset}
      className="w-60 p-1.5"
    >
      {/* User info header */}
      <DropdownMenuLabel className="p-2 font-normal">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white text-sm ring-2 ring-white shadow-sm",
              gradient,
            )}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-gray-900 leading-tight">
              {username}
            </p>
            <p className="truncate text-[11px] text-gray-500 leading-tight mt-0.5">
              {email}
            </p>
          </div>
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-cyan-700">
            Admin
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Online
          </span>
        </div>
      </DropdownMenuLabel>

      <DropdownMenuSeparator />

      <DropdownMenuGroup>
        <DropdownMenuItem asChild className="cursor-pointer">
          <a href="/profile">
            <User />
            Hồ sơ
          </a>
        </DropdownMenuItem>
      </DropdownMenuGroup>

      <DropdownMenuSeparator />

      {/* Logout: prevents default close, triggers controlled AlertDialog */}
      <DropdownMenuItem
        variant="destructive"
        className="cursor-pointer"
        onSelect={(e) => {
          e.preventDefault();
          onLogoutRequest();
        }}
      >
        <LogOut />
        Đăng xuất
      </DropdownMenuItem>
    </DropdownMenuContent>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SidebarUserFooterProps {
  /** When true, renders icon-only layout (collapsed sidebar). */
  iconOnly: boolean;
}

export default function SidebarUserFooter({ iconOnly }: SidebarUserFooterProps) {
  const user = useAuthStore((s) => s.user);
  const handleLogout = useLogout();
  const [logoutOpen, setLogoutOpen] = useState(false);

  if (!user) return null;

  const username = getUsername(user.email);

  return (
    <>
      {/* ── Logout confirmation dialog ─────────────────────────────────────── */}
      {/* Rendered outside the dropdown so it remains mounted after dropdown closes */}
      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Đăng xuất khỏi hệ thống?</AlertDialogTitle>
            <AlertDialogDescription>
              Phiên làm việc sẽ kết thúc. Bạn cần đăng nhập lại để tiếp tục quản trị.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleLogout}>
              Đăng xuất
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Collapsed layout ──────────────────────────────────────────────── */}
      {iconOnly ? (
        <div className="shrink-0 border-t border-gray-100 px-2 py-3">
          <div className="flex flex-col items-center gap-1.5">
            {/* Avatar → opens user dropdown to the right */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`${username} — Tùy chọn tài khoản`}
                  className={cn(
                    "rounded-full outline-none",
                    "ring-offset-2 focus-visible:ring-2 focus-visible:ring-cyan-500",
                    "hover:opacity-90 transition-opacity",
                  )}
                >
                  <UserAvatar email={user.email} />
                </button>
              </DropdownMenuTrigger>
              <UserDropdownMenu
                email={user.email}
                side="right"
                align="end"
                sideOffset={16}
                onLogoutRequest={() => setLogoutOpen(true)}
              />
            </DropdownMenu>

            {/* Notification bell */}
            <NotificationBell />
          </div>
        </div>
      ) : (
        /* ── Expanded layout ──────────────────────────────────────────────── */
        <div className="shrink-0 border-t border-gray-100 p-3">
          <div className="flex items-center gap-1">
            {/* User trigger — full-width, opens dropdown above */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`${username} — Tùy chọn tài khoản`}
                  className={cn(
                    "group flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-2",
                    "text-left outline-none transition-colors duration-150",
                    "hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2",
                  )}
                >
                  <UserAvatar email={user.email} />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-gray-900 leading-tight">
                      {username}
                    </p>
                    <p className="truncate text-[11px] text-gray-500 leading-tight mt-0.5">
                      {user.email}
                    </p>
                  </div>

                  <ChevronUp
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform duration-200",
                      "group-data-[state=open]:rotate-180",
                    )}
                  />
                </button>
              </DropdownMenuTrigger>
              <UserDropdownMenu
                email={user.email}
                side="top"
                align="start"
                sideOffset={8}
                onLogoutRequest={() => setLogoutOpen(true)}
              />
            </DropdownMenu>

            {/* Notification bell — sits outside the dropdown trigger */}
            <NotificationBell />
          </div>
        </div>
      )}
    </>
  );
}
