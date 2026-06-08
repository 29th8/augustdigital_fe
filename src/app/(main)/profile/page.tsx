"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Mail,
  ShieldCheck,
  CalendarDays,
  RefreshCw,
  AlertCircle,
  Hash,
  Clock,
  Sparkles,
  Phone,
  Pencil,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import AuthService from "@/services/auth.service";
import useAuthStore from "@/store/useAuthStore";
import { cn } from "@/lib/utils";
import type { UserProfile } from "@/types/auth";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const AVATAR_GRADIENTS = [
  "from-violet-500 via-purple-500 to-pink-500",
  "from-cyan-500 via-blue-500 to-indigo-600",
  "from-emerald-400 via-teal-500 to-cyan-600",
  "from-orange-400 via-amber-500 to-yellow-500",
  "from-pink-500 via-rose-500 to-red-500",
  "from-sky-400 via-blue-500 to-violet-600",
];

const COVER_GRADIENTS = [
  "from-violet-50 via-purple-50 to-pink-50",
  "from-cyan-50 via-blue-50 to-indigo-50",
  "from-emerald-50 via-teal-50 to-cyan-50",
  "from-orange-50 via-amber-50 to-yellow-50",
  "from-pink-50 via-rose-50 to-red-50",
  "from-sky-50 via-blue-50 to-violet-50",
];

function getGradient(email: string, type: "avatar" | "cover"): string {
  const idx = email.charCodeAt(0) % AVATAR_GRADIENTS.length;
  return type === "avatar" ? AVATAR_GRADIENTS[idx] : COVER_GRADIENTS[idx];
}

// ─── Edit profile schema ───────────────────────────────────────────────────────

const EditProfileSchema = z.object({
  phone: z
    .string()
    .min(9, "Số điện thoại không hợp lệ.")
    .max(15, "Số điện thoại không hợp lệ."),
});
type EditProfileValues = z.infer<typeof EditProfileSchema>;

// ─── Edit dialog ──────────────────────────────────────────────────────────────

function EditProfileDialog({
  open,
  onClose,
  profile,
}: {
  open: boolean;
  onClose: () => void;
  profile: UserProfile;
}) {
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<EditProfileValues>({
    resolver: zodResolver(EditProfileSchema),
    defaultValues: { phone: profile.phone ?? "" },
  });

  async function onSubmit(values: EditProfileValues) {
    try {
      const updated = await AuthService.updateProfile({ phone: values.phone });
      updateUser(updated);
      queryClient.setQueryData<UserProfile>(["profile"], updated);
      toast.success("Cập nhật hồ sơ thành công.");
      onClose();
    } catch {
      toast.error("Không thể cập nhật hồ sơ. Vui lòng thử lại.");
    }
  }

  function handleClose() {
    reset({ phone: profile.phone ?? "" });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-gray-900">
            Chỉnh sửa hồ sơ
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 py-2">
          {/* Email — read-only */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Email</Label>
            <Input
              value={profile.email}
              disabled
              className="bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
            />
            <p className="text-[11px] text-gray-400">Email không thể thay đổi.</p>
          </div>

          {/* Phone — editable */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-phone" className="text-sm font-medium text-gray-700">
              Số điện thoại <span className="text-red-500">*</span>
            </Label>
            <Input
              id="edit-phone"
              type="tel"
              autoComplete="tel"
              placeholder="0901234567"
              {...register("phone")}
              aria-invalid={!!errors.phone}
              className="border-gray-200 focus-visible:ring-cyan-500/40 focus-visible:border-cyan-500"
            />
            {errors.phone && (
              <p className="text-xs text-red-500">{errors.phone.message}</p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="border-gray-200"
            >
              Huỷ
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Đang lưu…
                </>
              ) : (
                "Lưu thay đổi"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-32 rounded-2xl bg-gray-100 mb-0" />
      <div className="px-6 -mt-10 mb-6 flex items-end gap-4">
        <div className="h-20 w-20 rounded-2xl bg-gray-200 ring-4 ring-white" />
        <div className="pb-2 flex flex-col gap-2">
          <div className="h-5 w-32 bg-gray-200 rounded" />
          <div className="h-3.5 w-44 bg-gray-100 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-gray-50 border border-gray-100" />
        ))}
      </div>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent = false,
  mono = false,
  empty = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  mono?: boolean;
  empty?: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl border p-4 transition-shadow hover:shadow-md",
        accent
          ? "border-cyan-100 bg-gradient-to-br from-cyan-50 to-blue-50"
          : "border-gray-100 bg-white",
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg",
          accent ? "bg-cyan-100 text-cyan-600" : "bg-gray-100 text-gray-500",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
          {label}
        </p>
        <p
          className={cn(
            "mt-1 text-[15px] font-semibold truncate",
            mono && "font-mono",
            empty ? "text-gray-300 italic text-sm" : "text-gray-900",
          )}
        >
          {value}
        </p>
        {sub && <p className="mt-0.5 text-xs text-gray-400 truncate">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [editOpen, setEditOpen] = useState(false);

  const {
    data: profile,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery<UserProfile>({
    queryKey: ["profile"],
    queryFn: ({ signal }) => AuthService.getProfile(signal),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  if (isLoading) return <ProfileSkeleton />;

  if (isError || !profile) {
    return (
      <div className="flex flex-col items-center gap-4 py-32 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 border border-red-100">
          <AlertCircle className="h-6 w-6 text-red-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Không thể tải hồ sơ</p>
          <p className="text-xs text-gray-400 mt-1">Đã xảy ra lỗi khi kết nối máy chủ.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", isFetching && "animate-spin")} />
          Thử lại
        </Button>
      </div>
    );
  }

  const avatarGradient = getGradient(profile.email, "avatar");
  const coverGradient = getGradient(profile.email, "cover");
  const initials = getInitials(profile.email);
  const username = profile.email.split("@")[0];
  const isAdmin = profile.role === "ADMIN";
  const hasPhone = !!profile.phone;

  return (
    <div className="max-w-2xl mx-auto">
      {/* ── Cover + avatar ── */}
      <div className="relative">
        <div
          className={cn(
            "h-28 rounded-2xl bg-gradient-to-r",
            coverGradient,
            "border border-gray-100",
          )}
        >
          <div
            className="absolute inset-0 rounded-2xl overflow-hidden opacity-40"
            style={{
              backgroundImage: "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          />
        </div>

        <div className="absolute -bottom-10 left-5">
          <div
            className={cn(
              "relative flex h-20 w-20 items-center justify-center rounded-2xl",
              "bg-gradient-to-br text-white font-bold text-2xl tracking-tight",
              "shadow-lg ring-4 ring-white",
              avatarGradient,
            )}
          >
            {initials}
            <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-400 ring-2 ring-white shadow-sm" />
          </div>
        </div>

        {isFetching && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-white/80 backdrop-blur px-2.5 py-1 text-[11px] text-gray-500 border border-gray-200 shadow-sm">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Đang cập nhật
          </div>
        )}
      </div>

      {/* ── Identity block ── */}
      <div className="mt-14 mb-6 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{username}</h1>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest border",
                isAdmin
                  ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                  : "border-gray-200 bg-gray-50 text-gray-600",
              )}
            >
              {isAdmin && <Sparkles className="h-2.5 w-2.5" />}
              {isAdmin ? "Admin" : "Khách hàng"}
            </span>
            <span className="inline-flex items-center gap-1 text-[12px] text-emerald-600 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Online
            </span>
          </div>
          <p className="text-sm text-gray-500">{profile.email}</p>
        </div>

        {/* Edit button */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setEditOpen(true)}
          className="shrink-0 h-8 px-3 border-gray-200 text-gray-600 hover:text-cyan-700 hover:border-cyan-200 hover:bg-cyan-50 transition-colors"
        >
          <Pencil className="h-3.5 w-3.5 mr-1.5" />
          Chỉnh sửa
        </Button>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <StatCard
          icon={Hash}
          label="ID tài khoản"
          value={`#${profile.id}`}
          mono
        />
        <StatCard
          icon={Mail}
          label="Email"
          value={profile.email}
          sub="Địa chỉ đăng nhập"
          accent={isAdmin}
        />
        <StatCard
          icon={Phone}
          label="Số điện thoại"
          value={hasPhone ? profile.phone : "Chưa cập nhật"}
          sub={hasPhone ? "Dùng để liên hệ & thanh toán" : undefined}
          empty={!hasPhone}
        />
        <StatCard
          icon={ShieldCheck}
          label="Vai trò"
          value={isAdmin ? "Quản trị viên" : "Khách hàng"}
          sub={isAdmin ? "Toàn quyền truy cập" : "Tài khoản cá nhân"}
          accent={isAdmin}
        />
        <StatCard
          icon={CalendarDays}
          label="Ngày tham gia"
          value={formatDate(profile.createdAt)}
          sub={`Cập nhật ${formatDateTime(profile.updatedAt)}`}
        />
      </div>

      {/* ── Footer note ── */}
      <div className="mt-4 flex items-center gap-1.5 text-[11px] text-gray-400 border-t border-gray-100 pt-4">
        <Clock className="h-3 w-3" />
        Dữ liệu được đồng bộ từ máy chủ · cache 5 phút
      </div>

      {/* ── Edit dialog ── */}
      <EditProfileDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        profile={profile}
      />
    </div>
  );
}
