"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  BarChart2,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Percent,
  AlertCircle,
  RefreshCw,
  Calendar,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfit, useSummary } from "@/hooks/useAnalytics";
import { formatVND } from "@/lib/formatVND";
import type { VariantProfit } from "@/types/analytics";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultFrom(): string {
  const d = new Date();
  d.setDate(1);
  return toYMD(d);
}

function defaultTo(): string {
  return toYMD(new Date());
}

// ─── Number format helpers ────────────────────────────────────────────────────

function fmtPct(v: number): string {
  return `${v.toFixed(2)}%`;
}

function fmtShort(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}T`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

// ─── Skeleton helpers ─────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
      <div className="h-3 w-24 bg-gray-100 rounded mb-3" />
      <div className="h-7 w-32 bg-gray-100 rounded mb-1" />
      <div className="h-3 w-16 bg-gray-100 rounded" />
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <tr>
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-100 rounded animate-pulse" style={{ width: `${50 + i * 8}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  accent?: string; // tailwind text color
  border?: string; // tailwind border color
}

function MetricCard({ label, value, sub, icon, accent = "text-gray-900", border = "border-gray-200" }: MetricCardProps) {
  return (
    <div className={`bg-white border ${border} rounded-xl p-5 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</p>
        <span className="text-gray-300">{icon}</span>
      </div>
      <p className={`text-2xl font-bold tabular-nums ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// Custom recharts tooltip
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1.5 truncate max-w-[180px]">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex justify-between gap-4">
          <span className="text-gray-500">{p.name === "revenue" ? "Doanh thu" : "Chi phí"}</span>
          <span className="font-semibold text-gray-900">{formatVND(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [appliedFrom, setAppliedFrom] = useState(defaultFrom);
  const [appliedTo, setAppliedTo] = useState(defaultTo);

  function applyFilter() {
    setAppliedFrom(from);
    setAppliedTo(to);
  }

  // ── Queries ──────────────────────────────────────────────────────────────
  const {
    data: profit,
    isLoading: profitLoading,
    isError: profitError,
    refetch: refetchProfit,
  } = useProfit({ from: appliedFrom, to: appliedTo });

  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchSummary,
  } = useSummary();

  // ── Chart data ───────────────────────────────────────────────────────────
  const chartData = (profit?.byVariant ?? []).map((v) => ({
    name: v.variantName.length > 18 ? v.variantName.slice(0, 16) + "…" : v.variantName,
    fullName: v.variantName,
    revenue: v.revenue,
    cost: v.cost,
    grossProfit: v.grossProfit,
  }));

  // ── Table data — sorted by revenue DESC ─────────────────────────────────
  const tableRows: VariantProfit[] = [...(profit?.byVariant ?? [])].sort(
    (a, b) => b.revenue - a.revenue,
  );

  const hasData = profit && profit.totalRevenue > 0;

  return (
    <div className="flex flex-col gap-7">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-cyan-600" />
            Phân tích doanh thu
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Lợi nhuận · Hiệu suất biến thể · Xu hướng bán hàng
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-gray-200 text-gray-600"
          onClick={() => { refetchProfit(); refetchSummary(); }}
        >
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Làm mới
        </Button>
      </div>

      {/* ── Section 1: Summary snapshot ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Snapshot tháng này</h2>
        {summaryError ? (
          <ErrorBanner onRetry={refetchSummary} />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryLoading ? (
              [1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)
            ) : summary ? (
              <>
                <MetricCard
                  label="Hôm nay"
                  value={formatVND(summary.revenueToday)}
                  icon={<TrendingUp className="h-5 w-5" />}
                  accent="text-cyan-600"
                  border="border-cyan-100"
                />
                <MetricCard
                  label="7 ngày qua"
                  value={formatVND(summary.revenueWeek)}
                  icon={<Calendar className="h-5 w-5" />}
                />
                <MetricCard
                  label="Tháng này"
                  value={formatVND(summary.revenueMonth)}
                  icon={<DollarSign className="h-5 w-5" />}
                  accent="text-emerald-600"
                />
                <MetricCard
                  label="Tổng đơn hàng"
                  value={summary.totalOrders.toLocaleString()}
                  sub="(tháng này, mọi trạng thái)"
                  icon={<ShoppingBag className="h-5 w-5" />}
                />
              </>
            ) : null}
          </div>
        )}
      </section>

      {/* ── Section 5: Date filter ── */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-gray-500">Từ ngày</Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              max={to}
              className="border-gray-200 bg-white text-gray-900 text-sm w-40"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-gray-500">Đến ngày</Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              min={from}
              max={toYMD(new Date())}
              className="border-gray-200 bg-white text-gray-900 text-sm w-40"
            />
          </div>
          <Button
            onClick={applyFilter}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
          >
            Áp dụng
          </Button>
          <p className="text-xs text-gray-400 self-center">
            Đang xem: <span className="font-medium text-gray-600">{appliedFrom}</span>
            {" → "}
            <span className="font-medium text-gray-600">{appliedTo}</span>
          </p>
        </div>
      </section>

      {/* ── Error state for profit ── */}
      {profitError && <ErrorBanner onRetry={refetchProfit} />}

      {/* ── Section 2: Profit overview ── */}
      {!profitError && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Tổng quan lợi nhuận
            {profitLoading && <Loader2 className="inline ml-2 h-3.5 w-3.5 animate-spin text-gray-400" />}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {profitLoading ? (
              [1, 2, 3, 4].map((i) => <CardSkeleton key={i} />)
            ) : profit ? (
              <>
                <MetricCard
                  label="Tổng doanh thu"
                  value={formatVND(profit.totalRevenue)}
                  sub={`${profit.ordersCount} đơn COMPLETED · ${profit.itemsSold} items`}
                  icon={<DollarSign className="h-5 w-5" />}
                  accent="text-cyan-600"
                  border="border-cyan-100"
                />
                <MetricCard
                  label="Tổng chi phí"
                  value={formatVND(profit.totalCost)}
                  sub="Dựa trên cost_price đã khai báo"
                  icon={<ShoppingBag className="h-5 w-5" />}
                  accent="text-gray-700"
                />
                <MetricCard
                  label="Lợi nhuận gộp"
                  value={formatVND(profit.grossProfit)}
                  sub={profit.totalRevenue > 0 ? `Margin ${fmtPct(profit.grossMarginPercent)}` : "Chưa có doanh thu"}
                  icon={<TrendingUp className="h-5 w-5" />}
                  accent={profit.grossProfit >= 0 ? "text-emerald-600" : "text-red-600"}
                  border={profit.grossProfit >= 0 ? "border-emerald-100" : "border-red-100"}
                />
                <MetricCard
                  label="Biên lợi nhuận"
                  value={profit.totalRevenue > 0 ? fmtPct(profit.grossMarginPercent) : "—"}
                  sub={profit.totalRevenue === 0 ? "Không chia cho 0" : undefined}
                  icon={<Percent className="h-5 w-5" />}
                  accent={profit.grossMarginPercent >= 30 ? "text-emerald-600" : profit.grossMarginPercent > 0 ? "text-amber-600" : "text-gray-400"}
                />
              </>
            ) : null}
          </div>
        </section>
      )}

      {/* ── Section 3: Chart ── */}
      {!profitError && (
        <section className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-gray-700">Doanh thu vs Chi phí theo biến thể</h2>

          {profitLoading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-gray-200 animate-spin" />
            </div>
          ) : !hasData || chartData.length === 0 ? (
            <EmptyState />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={fmtShort}
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  width={52}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => (
                    <span className="text-xs text-gray-500">
                      {v === "revenue" ? "Doanh thu" : "Chi phí"}
                    </span>
                  )}
                />
                <Bar dataKey="revenue" name="revenue" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? "#06b6d4" : "#0891b2"} />
                  ))}
                </Bar>
                <Bar dataKey="cost" name="cost" radius={[4, 4, 0, 0]} maxBarSize={48}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i % 2 === 0 ? "#e5e7eb" : "#d1d5db"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>
      )}

      {/* ── Section 4: Variant table ── */}
      {!profitError && (
        <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">
              Hiệu suất từng biến thể
            </h2>
            {profit && profit.byVariant.length > 0 && (
              <span className="text-xs text-gray-400">{profit.byVariant.length} biến thể</span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Biến thể</th>
                  <th className="px-4 py-3 text-right">Doanh thu</th>
                  <th className="px-4 py-3 text-right">Chi phí</th>
                  <th className="px-4 py-3 text-right">Lợi nhuận</th>
                  <th className="px-4 py-3 text-right">Đã bán</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {profitLoading ? (
                  [1, 2, 3].map((i) => <TableRowSkeleton key={i} />)
                ) : tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                      Chưa có dữ liệu cho khoảng thời gian này.
                    </td>
                  </tr>
                ) : (
                  tableRows.map((v) => {
                    const margin = v.revenue > 0 ? (v.grossProfit / v.revenue) * 100 : 0;
                    return (
                      <tr key={v.variantId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {v.variantName}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-cyan-700 tabular-nums">
                          {formatVND(v.revenue)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500 tabular-nums">
                          {formatVND(v.cost)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <span className={v.grossProfit >= 0 ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold"}>
                            {formatVND(v.grossProfit)}
                          </span>
                          <span className="ml-1.5 text-xs text-gray-400">
                            {margin > 0 ? `(${margin.toFixed(1)}%)` : ""}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                          {v.itemsSold.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {profit && tableRows.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 border-t border-gray-200 font-semibold text-sm">
                    <td className="px-4 py-3 text-gray-700">Tổng cộng</td>
                    <td className="px-4 py-3 text-right text-cyan-700 tabular-nums">{formatVND(profit.totalRevenue)}</td>
                    <td className="px-4 py-3 text-right text-gray-500 tabular-nums">{formatVND(profit.totalCost)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={profit.grossProfit >= 0 ? "text-emerald-600" : "text-red-500"}>
                        {formatVND(profit.grossProfit)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 tabular-nums">
                      {profit.itemsSold.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>
      )}

      {/* ── Top variants from summary ── */}
      {!summaryError && summary && summary.topVariants.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-gray-700">Top biến thể tháng này</h2>
          <div className="flex flex-col gap-2">
            {summary.topVariants.map((v, i) => {
              const maxRevenue = summary.topVariants[0]?.revenue ?? 1;
              const pct = maxRevenue > 0 ? (v.revenue / maxRevenue) * 100 : 0;
              return (
                <div key={v.variantId} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-4 shrink-0">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-700 font-medium truncate">{v.variantName}</span>
                      <span className="text-xs text-gray-500 shrink-0 ml-2">{v.itemsSold} sold</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-cyan-700 w-28 text-right tabular-nums shrink-0">
                    {formatVND(v.revenue)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Error / empty states ─────────────────────────────────────────────────────

function ErrorBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <span className="flex-1">Không thể tải dữ liệu analytics.</span>
      <button
        onClick={onRetry}
        className="flex items-center gap-1 text-red-600 hover:text-red-800 font-medium transition-colors"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Thử lại
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="h-64 flex flex-col items-center justify-center gap-2 text-center">
      <BarChart2 className="h-10 w-10 text-gray-200" />
      <p className="text-sm text-gray-500">Chưa có dữ liệu cho khoảng thời gian này.</p>
      <p className="text-xs text-gray-400">Thử chọn một khoảng thời gian khác.</p>
    </div>
  );
}
