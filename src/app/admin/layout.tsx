"use client";

import { Loader2 } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import { useRequireRole } from "@/hooks/useRequireRole";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isChecking } = useRequireRole("ADMIN");

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-6 w-6 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return <AdminShell>{children}</AdminShell>;
}
