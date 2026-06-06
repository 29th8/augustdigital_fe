'use client';

import { CheckCircle2, Clock, PauseCircle, Ticket } from 'lucide-react';

export interface DiscountStatsCardsProps {
  total: number | undefined;
  active: number | undefined;
  expired: number | undefined;
  disabled: number | undefined;
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

export function DiscountStatsCards({
  total,
  active,
  expired,
  disabled,
  isLoading,
}: DiscountStatsCardsProps) {
  const cards: CardConfig[] = [
    {
      label: 'Tổng mã giảm giá',
      value: total,
      icon: Ticket,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Đang hoạt động',
      value: active,
      icon: CheckCircle2,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
      valueColor: 'text-green-700',
    },
    {
      label: 'Đã hết hạn',
      value: expired,
      icon: Clock,
      iconBg: 'bg-red-50',
      iconColor: 'text-red-500',
      valueColor: expired ? 'text-red-600' : undefined,
    },
    {
      label: 'Đã tắt',
      value: disabled,
      icon: PauseCircle,
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                <p className={`text-2xl font-bold ${valueColor ?? 'text-gray-900'}`}>
                  {value !== undefined ? value : '—'}
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
