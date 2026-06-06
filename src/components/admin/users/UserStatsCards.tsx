"use client";

import { Users, UserCheck, UserX } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserStatsCardsProps {
  total: number | undefined;
  active: number | undefined;
  locked: number | undefined;
  isLoading: boolean;
}

interface CardConfig {
  label: string;
  value: number | undefined;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UserStatsCards({ total, active, locked, isLoading }: UserStatsCardsProps) {
  const cards: CardConfig[] = [
    {
      label: "Tổng người dùng",
      value: total,
      icon: Users,
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Đang hoạt động",
      value: active,
      icon: UserCheck,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
      valueColor: "text-green-700",
    },
    {
      label: "Bị khoá",
      value: locked,
      icon: UserX,
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
      valueColor: locked ? "text-red-600" : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map(({ label, value, icon: Icon, iconBg, iconColor, valueColor }) => (
        <div
          key={label}
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">{label}</p>
              {isLoading ? (
                <div className="h-7 w-16 bg-gray-100 rounded animate-pulse" />
              ) : (
                <p className={`text-2xl font-bold ${valueColor ?? "text-gray-900"}`}>
                  {value !== undefined ? value.toLocaleString() : "—"}
                </p>
              )}
            </div>
            <div className={`rounded-lg ${iconBg} p-2 shrink-0`}>
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
