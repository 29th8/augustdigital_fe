"use client";

import { LogOut, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import useAuthStore from "@/store/useAuthStore";
import { useLogout } from "@/hooks/useLogout";

function getInitials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

export default function UserNav() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const handleLogout = useLogout();

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center gap-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
        >
          <a href="/login">Sign in</a>
        </Button>
        <Button
          asChild
          size="sm"
          className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold"
        >
          <a href="/register">Register</a>
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          aria-label="User menu"
        >
          <Avatar className="h-8 w-8 border border-zinc-700 bg-zinc-800">
            <AvatarFallback className="bg-cyan-500/10 text-cyan-400 text-xs font-semibold">
              {getInitials(user.email)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-56 bg-zinc-900 border-zinc-800 text-zinc-100"
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <p className="text-xs text-zinc-500">Signed in as</p>
            <p className="text-sm font-medium text-zinc-100 truncate">
              {user.email}
            </p>
            <p className="text-xs text-cyan-500 capitalize">
              {user.role.toLowerCase()}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-zinc-800" />

        <DropdownMenuItem
          className="text-zinc-400 focus:text-zinc-100 focus:bg-zinc-800 cursor-default"
          disabled
        >
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-zinc-800" />

        <DropdownMenuItem
          onClick={handleLogout}
          className="text-red-400 focus:text-red-300 focus:bg-zinc-800 cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
