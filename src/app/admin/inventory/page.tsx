"use client";

import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Warehouse,
  RefreshCw,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  TrendingDown,
  Clock,
  Lightbulb,
  Activity,
  PackageX,
  Plus,
  Trash2,
  Users,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { InventoryService } from "@/services/inventory.service";
import { ProductService } from "@/services/product.service";
import type { ApiErrorResponse } from "@/types/api";
import type { InventoryItemType, ProfileInput, InventoryItemDetail } from "@/types/inventory";

// ─── Constants ────────────────────────────────────────────────────────────────

const LOW_STOCK_THRESHOLD = 5;
const AUTO_REFRESH_MS = 10_000;
const BASELINE_STORAGE_KEY = "inv-baseline";

// ─── Local types ──────────────────────────────────────────────────────────────

interface StockBaseline {
  variantId: number;
  sold: number;
  recordedAt: number; // epoch ms
}

interface ActivityEntry {
  id: number;
  action: "import_json" | "import_file" | "recovery";
  variantName: string;
  detail: string;
  timestamp: number;
}

interface ImportPreview {
  total: number;   // raw line count
  valid: number;   // non-empty trimmed lines
  empty: number;   // blank lines
}

// ─── Analytics helpers ────────────────────────────────────────────────────────

function readBaseline(variantId: number): StockBaseline | null {
  try {
    const raw = localStorage.getItem(`${BASELINE_STORAGE_KEY}-${variantId}`);
    return raw ? (JSON.parse(raw) as StockBaseline) : null;
  } catch {
    return null;
  }
}

function writeBaseline(variantId: number, sold: number) {
  const entry: StockBaseline = { variantId, sold, recordedAt: Date.now() };
  localStorage.setItem(`${BASELINE_STORAGE_KEY}-${variantId}`, JSON.stringify(entry));
}

function computeAnalytics(
  variantId: number,
  available: number,
  currentSold: number,
): {
  sellRatePerDay: number | null;
  daysRemaining: number | null;
  restockSuggestion: number | null;
  hoursObserved: number;
} {
  const baseline = readBaseline(variantId);
  if (!baseline) {
    writeBaseline(variantId, currentSold);
    return { sellRatePerDay: null, daysRemaining: null, restockSuggestion: null, hoursObserved: 0 };
  }

  const hoursObserved = (Date.now() - baseline.recordedAt) / (1000 * 60 * 60);
  const daysObserved = hoursObserved / 24;
  const deltaSold = Math.max(0, currentSold - baseline.sold);

  if (daysObserved < 0.1 || deltaSold === 0) {
    return { sellRatePerDay: null, daysRemaining: null, restockSuggestion: null, hoursObserved };
  }

  const sellRatePerDay = deltaSold / daysObserved;
  const daysRemaining = sellRatePerDay > 0 ? available / sellRatePerDay : null;
  const restockSuggestion = Math.ceil(sellRatePerDay * 7);

  return { sellRatePerDay, daysRemaining, restockSuggestion, hoursObserved };
}

function parseImportPreview(text: string): ImportPreview {
  const lines = text.split(/\r?\n|\r/);
  const valid = lines.filter((l) => l.trim().length > 0).length;
  return { total: lines.length, valid, empty: lines.length - valid };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
      <div className="h-3 w-12 bg-gray-100 rounded mb-2" />
      <div className="h-7 w-16 bg-gray-100 rounded" />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-1">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${color}`}>{value.toLocaleString()}</p>
    </div>
  );
}

function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-xs text-gray-400 text-center py-4">Chưa có hoạt động nào.</p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {entries.map((e) => (
        <li key={e.id} className="flex items-start gap-2.5 text-xs">
          <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
            e.action === "recovery"
              ? "bg-amber-50 text-amber-600"
              : "bg-emerald-50 text-emerald-600"
          }`}>
            {e.action === "recovery" ? (
              <RefreshCw className="h-2.5 w-2.5" />
            ) : (
              <CheckCircle2 className="h-2.5 w-2.5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-700 font-medium truncate">{e.detail}</p>
            <p className="text-gray-400">{e.variantName} · {new Date(e.timestamp).toLocaleTimeString("vi-VN")}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminInventoryPage() {
  const queryClient = useQueryClient();
  const activityIdRef = useRef(0);

  // ── Variant selection ────────────────────────────────────────────────────
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);

  // ── Import form state ────────────────────────────────────────────────────
  const [importTab, setImportTab] = useState<"json" | "file">("json");
  const [importType, setImportType] = useState<InventoryItemType>("KEY");
  const [keysText, setKeysText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Profile import state (ACCOUNT / INSTANT_SHARED) ─────────────────────
  const [lastItemIds, setLastItemIds] = useState<number[]>([]);
  const [lastItemIdsIndex, setLastItemIdsIndex] = useState(0);
  const [manualItemId, setManualItemId] = useState("");
  const [selectedItem, setSelectedItem] = useState<InventoryItemDetail | null>(null);
  const [itemSearch, setItemSearch] = useState("");
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  const [profiles, setProfiles] = useState<ProfileInput[]>([
    { profile_name: "", pin_code: null, max_slots: 1 },
  ]);

  // Derived: active item ID from queue, selected item, or manual input
  const lastItemId = lastItemIds[lastItemIdsIndex] ?? selectedItem?.id ?? null;

  // ── Activity log ─────────────────────────────────────────────────────────
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);

  function logActivity(entry: Omit<ActivityEntry, "id" | "timestamp">) {
    setActivityLog((prev) => [
      { ...entry, id: ++activityIdRef.current, timestamp: Date.now() },
      ...prev.slice(0, 9), // keep last 10
    ]);
  }

  // ── Products + variants ──────────────────────────────────────────────────
  const { data: productsPage, isLoading: productsLoading } = useQuery({
    queryKey: ["admin-products-all"],
    queryFn: () => ProductService.getProducts({ limit: 200 }),
  });
  const products = productsPage?.items ?? [];
  const selectedProduct = products.find((p) => p.id === selectedProductId) ?? null;
  const variants = selectedProduct?.variants ?? [];
  const selectedVariant = variants.find((v) => v.id === selectedVariantId) ?? null;

  // ── Stock stats — auto-refresh every 10s ────────────────────────────────
  const statsQueryKey = ["inventory-stats", selectedVariantId];
  const {
    data: stats,
    isLoading: statsLoading,
    isFetching: statsFetching,
    isError: statsError,
  } = useQuery({
    queryKey: statsQueryKey,
    queryFn: () => InventoryService.getStockStats(selectedVariantId!),
    enabled: selectedVariantId !== null,
    refetchInterval: AUTO_REFRESH_MS,
    staleTime: 5_000,
  });

  // ── Inventory items list (for profile assignment) ────────────────────────
  const {
    data: inventoryItems,
    isLoading: itemsLoading,
    refetch: refetchItems,
  } = useQuery({
    queryKey: ["inventory-items", selectedVariantId],
    queryFn: () => InventoryService.listItems(selectedVariantId!),
    enabled: selectedVariantId !== null,
    staleTime: 30_000,
  });

  const filteredItems = (inventoryItems ?? []).filter(
    (item) =>
      item.type === "ACCOUNT" &&
      item.value.toLowerCase().includes(itemSearch.toLowerCase()),
  );

  // ── Analytics ────────────────────────────────────────────────────────────
  const analytics =
    stats && selectedVariantId !== null
      ? computeAnalytics(selectedVariantId, stats.available, stats.sold)
      : null;

  const soldPct = stats && stats.total > 0 ? Math.round((stats.sold / stats.total) * 100) : 0;
  const availPct = stats && stats.total > 0 ? Math.round((stats.available / stats.total) * 100) : 0;
  const isLowStock = stats !== undefined && stats.available > 0 && stats.available <= LOW_STOCK_THRESHOLD;
  const isOutOfStock = stats !== undefined && stats.available === 0;

  // Reset state + auto-select import type when switching variant
  useEffect(() => {
    setImportSuccess(false);
    setSelectedItem(null);
    setLastItemIds([]);
    setLastItemIdsIndex(0);
    setManualItemId("");
    setItemSearch("");
    // Variant-level fulfillmentType takes priority over product-level
    const ft = selectedVariant?.fulfillmentType ?? selectedProduct?.fulfillmentType;
    if (ft === "INSTANT_SHARED") {
      setImportType("ACCOUNT");
    } else if (ft === "INSTANT_DIRECT") {
      setImportType("KEY");
    }
  }, [selectedVariantId, selectedVariant?.fulfillmentType, selectedProduct?.fulfillmentType]);

  // ── JSON import ──────────────────────────────────────────────────────────
  const jsonImportMutation = useMutation<{ inventoryItemIds: number[]; imported: number }, ApiErrorResponse>({
    mutationFn: () => {
      const keys = keysText.split(/\r?\n|\r/).map((k) => k.trim()).filter(Boolean);
      return InventoryService.importKeys({ variantId: selectedVariantId!, type: importType, keys });
    },
    onSuccess: (result) => {
      const label = importType === "ACCOUNT" ? "tài khoản" : "keys";
      const detail = `Đã nhập ${result.imported} ${label} cho "${selectedVariant?.name ?? selectedVariantId}"`;
      const firstId = result.inventoryItemIds[0];
      toast.success(
        importType === "ACCOUNT" && firstId
          ? `${detail} · Item ID: ${firstId}${result.inventoryItemIds.length > 1 ? ` (+${result.inventoryItemIds.length - 1})` : ""}`
          : detail,
      );
      if (importType === "ACCOUNT" && result.inventoryItemIds.length > 0) {
        setLastItemIds(result.inventoryItemIds);
        setLastItemIdsIndex(0);
        setManualItemId(String(result.inventoryItemIds[0]));
      }
      logActivity({
        action: "import_json",
        variantName: selectedVariant?.name ?? `Variant #${selectedVariantId}`,
        detail,
      });
      setKeysText("");
      setImportPreview(null);
      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 2500);
      queryClient.invalidateQueries({ queryKey: statsQueryKey });
    },
    onError: (err) => toast.error(err.message ?? "Import thất bại"),
  });

  // ── File import ──────────────────────────────────────────────────────────
  const fileImportMutation = useMutation({
    mutationFn: () =>
      InventoryService.importFile(selectedVariantId!, importType, selectedFile!),
    onSuccess: (result) => {
      const detail = `Đã nhập ${result.imported} keys cho "${selectedVariant?.name ?? selectedVariantId}"`;
      toast.success(detail);
      logActivity({
        action: "import_file",
        variantName: selectedVariant?.name ?? `Variant #${selectedVariantId}`,
        detail,
      });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setImportSuccess(true);
      setTimeout(() => setImportSuccess(false), 2500);
      queryClient.invalidateQueries({ queryKey: statsQueryKey });
    },
    onError: (err: ApiErrorResponse) => toast.error(err.message ?? "Import file thất bại"),
  });

  // ── Profile import ───────────────────────────────────────────────────────
  const profileImportMutation = useMutation({
    mutationFn: () => {
      const itemId = lastItemId ?? Number(manualItemId);
      return InventoryService.importProfiles({
        inventory_item_id: itemId,
        profiles: profiles.map((p) => ({
          ...p,
          pin_code: p.pin_code?.trim() || null,
        })),
      });
    },
    onSuccess: () => {
      const nextIndex = lastItemIdsIndex + 1;
      const hasMore = nextIndex < lastItemIds.length;
      if (hasMore) {
        toast.success(`Đã thêm ${profiles.length} profile cho tài khoản #${lastItemId}. Tiếp theo: #${lastItemIds[nextIndex]}`);
        setLastItemIdsIndex(nextIndex);
        setManualItemId(String(lastItemIds[nextIndex]));
      } else {
        toast.success(`Đã thêm ${profiles.length} profile thành công.`);
        setLastItemIds([]);
        setLastItemIdsIndex(0);
        setManualItemId("");
      }
      setProfiles([{ profile_name: "", pin_code: null, max_slots: 1 }]);
      queryClient.invalidateQueries({ queryKey: ["inventory-items", selectedVariantId] });
    },
    onError: (err: ApiErrorResponse) => toast.error(err.message ?? "Thêm profile thất bại"),
  });

  // ── Stuck-order recovery ─────────────────────────────────────────────────
  const recoveryMutation = useMutation({
    mutationFn: () => InventoryService.recoverStuckOrders(),
    onSuccess: () => {
      const detail = "Stuck-order recovery triggered";
      toast.success("Recovery triggered. Kiểm tra server logs để biết chi tiết.");
      logActivity({ action: "recovery", variantName: "—", detail });
    },
    onError: (err: ApiErrorResponse) =>
      toast.error(err.message ?? "Không thể trigger recovery"),
  });

  // ── Import preview handler ───────────────────────────────────────────────
  // Called by the ConfirmDialog trigger button — updates preview state before the
  // dialog renders, so the description is always fresh.
  function handleJsonImportClick() {
    setImportPreview(parseImportPreview(keysText));
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const canImport = selectedVariantId !== null;
  const jsonKeys = keysText.split(/\r?\n|\r/).filter((l) => l.trim().length > 0).length;
  const isImporting = jsonImportMutation.isPending || fileImportMutation.isPending;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Warehouse className="h-6 w-6 text-cyan-600" />
            Quản lý kho hàng
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Import keys · Analytics tồn kho · Phục hồi đơn kẹt
          </p>
        </div>

        <div className="flex items-center gap-2">
          {statsFetching && selectedVariantId && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Làm mới…
            </span>
          )}
          <ConfirmDialog
            trigger={
              <Button
                variant="outline"
                size="sm"
                disabled={recoveryMutation.isPending}
                className="border-amber-200 text-amber-700 hover:bg-amber-50"
              >
                {recoveryMutation.isPending ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <AlertTriangle className="mr-2 h-3.5 w-3.5" />
                )}
                Phục hồi đơn kẹt
              </Button>
            }
            title="Phục hồi đơn kẹt"
            description="Trigger thủ công stuck-order recovery. Endpoint này chạy đồng bộ và có thể mất vài giây. Chỉ dùng khi thực sự cần thiết."
            confirmLabel="Trigger Recovery"
            destructive={false}
            onConfirm={() => recoveryMutation.mutate()}
          />
        </div>
      </div>

      {/* ── Low-stock / out-of-stock banner ── */}
      {isOutOfStock && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <PackageX className="h-4 w-4 shrink-0" />
          <span>
            <strong>Hết hàng!</strong> Biến thể{" "}
            <span className="font-semibold">{selectedVariant?.name}</span> hiện không còn
            inventory. Import thêm keys ngay để tránh mất đơn.
          </span>
        </div>
      )}
      {isLowStock && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>Sắp hết hàng!</strong> Chỉ còn{" "}
            <span className="font-semibold">{stats?.available}</span> keys cho biến thể{" "}
            <span className="font-semibold">{selectedVariant?.name}</span>.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Left column: selector + stats + analytics + activity ── */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Variant selector */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-gray-700">Chọn biến thể</h2>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-gray-500">Sản phẩm</Label>
              <Select
                value={selectedProductId?.toString() ?? ""}
                onValueChange={(v) => {
                  setSelectedProductId(Number(v));
                  setSelectedVariantId(null);
                }}
              >
                <SelectTrigger className="border-gray-200 bg-white text-gray-900 text-sm">
                  <SelectValue placeholder={productsLoading ? "Đang tải…" : "Chọn sản phẩm"} />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()} className="text-sm text-gray-700 focus:bg-gray-50">
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-gray-500">Biến thể</Label>
              <Select
                value={selectedVariantId?.toString() ?? ""}
                onValueChange={(v) => setSelectedVariantId(Number(v))}
                disabled={!selectedProductId || variants.length === 0}
              >
                <SelectTrigger className="border-gray-200 bg-white text-gray-900 text-sm">
                  <SelectValue placeholder="Chọn biến thể" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  {variants.map((v) => (
                    <SelectItem key={v.id} value={v.id.toString()} className="text-sm text-gray-700 focus:bg-gray-50">
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stock stats */}
          {selectedVariantId !== null && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">Tồn kho thực tế</h2>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" />
                  Tự động mỗi 10s
                </span>
              </div>

              {statsLoading ? (
                <div className="grid grid-cols-3 gap-2">
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                </div>
              ) : statsError ? (
                <p className="text-sm text-red-500">Không thể tải dữ liệu tồn kho.</p>
              ) : stats ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    <StatCard
                      label="Còn lại"
                      value={stats.available}
                      color={isOutOfStock ? "text-red-600" : isLowStock ? "text-amber-600" : "text-emerald-600"}
                    />
                    <StatCard label="Đã bán" value={stats.sold} color="text-gray-700" />
                    <StatCard label="Tổng" value={stats.total} color="text-cyan-600" />
                  </div>

                  {stats.total > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Đã bán {soldPct}%</span>
                        <span>Còn {availPct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            isOutOfStock
                              ? "bg-red-400"
                              : isLowStock
                              ? "bg-amber-400"
                              : "bg-cyan-500"
                          }`}
                          style={{ width: `${availPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}

          {/* Analytics */}
          {analytics && stats && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                <TrendingDown className="h-4 w-4 text-gray-400" />
                Phân tích bán hàng
              </h2>

              {analytics.sellRatePerDay === null ? (
                <p className="text-xs text-gray-400">
                  Chưa đủ dữ liệu.{" "}
                  {analytics.hoursObserved > 0
                    ? `Theo dõi được ${analytics.hoursObserved.toFixed(1)}h — cần thêm thời gian.`
                    : "Baseline đã được ghi nhận. Quay lại sau."}
                </p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <TrendingDown className="h-3.5 w-3.5" />
                      Tốc độ bán
                    </span>
                    <span className="font-semibold text-gray-900">
                      {analytics.sellRatePerDay.toFixed(1)} keys/ngày
                    </span>
                  </div>

                  {analytics.daysRemaining !== null && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Hết hàng sau
                      </span>
                      <span className={`font-semibold ${
                        analytics.daysRemaining < 3
                          ? "text-red-600"
                          : analytics.daysRemaining < 7
                          ? "text-amber-600"
                          : "text-gray-900"
                      }`}>
                        ~{analytics.daysRemaining < 1
                          ? `${(analytics.daysRemaining * 24).toFixed(0)}h`
                          : `${analytics.daysRemaining.toFixed(0)} ngày`}
                      </span>
                    </div>
                  )}

                  {analytics.restockSuggestion !== null && (
                    <div className="flex items-start gap-2 bg-cyan-50 border border-cyan-200 rounded-lg px-3 py-2.5 text-xs text-cyan-700">
                      <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>
                        <strong>Đề xuất import:</strong> {analytics.restockSuggestion} keys
                        (đủ dùng ~7 ngày theo tốc độ hiện tại)
                      </span>
                    </div>
                  )}

                  <p className="text-xs text-gray-400">
                    Dựa trên {analytics.hoursObserved.toFixed(1)}h quan sát
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Activity log */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-gray-400" />
              Lịch sử hoạt động
            </h2>
            <ActivityFeed entries={activityLog} />
          </div>
        </div>

        {/* ── Right column: import panel ── */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-5">
            {/* Success animation overlay */}
            {importSuccess && (
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-700 animate-in fade-in slide-in-from-top-2 duration-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span className="font-medium">Import thành công! Tồn kho đã được cập nhật.</span>
              </div>
            )}

            <h2 className="text-sm font-semibold text-gray-700">Import kho hàng</h2>

            {/* Credential type */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-gray-500">
                Loại dữ liệu
                {(selectedVariant?.fulfillmentType ?? selectedProduct?.fulfillmentType) && (
                  <span className="ml-1.5 text-cyan-600 font-semibold">
                    (tự động: {selectedVariant?.fulfillmentType ?? selectedProduct?.fulfillmentType})
                  </span>
                )}
              </Label>
              <div className="flex gap-2">
                {(["KEY", "ACCOUNT"] as InventoryItemType[]).map((t) => {
                  const locked = (selectedVariant?.fulfillmentType ?? selectedProduct?.fulfillmentType) !== undefined;
                  return (
                    <button
                      key={t}
                      onClick={() => !locked && setImportType(t)}
                      disabled={locked}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                        importType === t
                          ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      {t === "KEY" ? "🔑 KEY" : "👤 ACCOUNT"}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400">
                {importType === "KEY"
                  ? "Mỗi dòng là một activation key (VD: XXXXX-XXXXX-XXXXX)"
                  : "Mỗi dòng là user:password (VD: user@email.com:password123)"}
              </p>
            </div>

            {/* Tab switcher */}
            <div className="flex gap-1 border-b border-gray-100">
              {(["json", "file"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setImportTab(tab)}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    importTab === tab
                      ? "border-cyan-500 text-cyan-700"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab === "json" ? (
                    <span className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      Paste keys
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Upload className="h-3.5 w-3.5" />
                      Upload file
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* JSON import */}
            {importTab === "json" && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-gray-500">Keys (mỗi dòng một key)</Label>
                  {keysText.length > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-cyan-600 font-semibold">{jsonKeys} keys hợp lệ</span>
                      {keysText.split(/\r?\n|\r/).length - jsonKeys > 0 && (
                        <span className="text-gray-400">
                          · {keysText.split(/\r?\n|\r/).length - jsonKeys} dòng trống
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <textarea
                  value={keysText}
                  onChange={(e) => setKeysText(e.target.value)}
                  rows={8}
                  disabled={isImporting}
                  placeholder={
                    importType === "KEY"
                      ? "ABCDE-12345-FGHIJ-67890\nKLMNO-11111-PQRST-22222\n..."
                      : "user1@example.com:P@ssw0rd1\nuser2@example.com:S3cur3Pass\n..."
                  }
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-mono text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none disabled:opacity-50"
                />

                {/* Import preview confirmation dialog */}
                <ConfirmDialog
                  trigger={
                    <Button
                      onClick={handleJsonImportClick}
                      disabled={!canImport || jsonKeys === 0 || isImporting}
                      className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold disabled:opacity-60"
                    >
                      {jsonImportMutation.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang import…</>
                      ) : (
                        <><CheckCircle2 className="mr-2 h-4 w-4" />Import {jsonKeys > 0 ? `${jsonKeys} keys` : "keys"}</>
                      )}
                    </Button>
                  }
                  title="Xác nhận import"
                  description={
                    importPreview
                      ? `Sẽ import ${importPreview.valid} keys cho biến thể "${selectedVariant?.name ?? ""}". ${
                          importPreview.empty > 0
                            ? `${importPreview.empty} dòng trống sẽ bị bỏ qua.`
                            : "Không có dòng trống."
                        }`
                      : "Kiểm tra lại số lượng keys trước khi import."
                  }
                  confirmLabel={`Import ${importPreview?.valid ?? jsonKeys} keys`}
                  destructive={false}
                  onConfirm={() => jsonImportMutation.mutate()}
                />

                {!canImport && (
                  <p className="text-xs text-amber-600">
                    Chọn sản phẩm và biến thể trước khi import.
                  </p>
                )}
              </div>
            )}

            {/* File import */}
            {importTab === "file" && (
              <div className="flex flex-col gap-3">
                <Label className="text-xs text-gray-500">
                  File CSV / XLSX / XLS · tối đa 5 MB · mỗi dòng một key
                </Label>
                <div
                  className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 text-center cursor-pointer transition-colors ${
                    isImporting
                      ? "border-gray-100 bg-gray-50 pointer-events-none"
                      : selectedFile
                      ? "border-cyan-400 bg-cyan-50/30"
                      : "border-gray-200 hover:border-cyan-400 hover:bg-cyan-50/30"
                  }`}
                  onClick={() => !isImporting && fileInputRef.current?.click()}
                >
                  {fileImportMutation.isPending ? (
                    <>
                      <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
                      <p className="text-sm text-cyan-600">Đang upload…</p>
                    </>
                  ) : selectedFile ? (
                    <>
                      <CheckCircle2 className="h-8 w-8 text-cyan-500" />
                      <p className="text-sm font-medium text-gray-700">{selectedFile.name}</p>
                      <p className="text-xs text-gray-400">
                        {(selectedFile.size / 1024).toFixed(1)} KB · Click để đổi file
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-gray-300" />
                      <p className="text-sm text-gray-500">Kéo thả hoặc click để chọn file</p>
                      <p className="text-xs text-gray-400">.csv · .xlsx · .xls</p>
                    </>
                  )}
                </div>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                />
                <Button
                  onClick={() => fileImportMutation.mutate()}
                  disabled={!canImport || !selectedFile || isImporting}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold disabled:opacity-60"
                >
                  {fileImportMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang upload…</>
                  ) : (
                    <><Upload className="mr-2 h-4 w-4" />Upload & Import</>
                  )}
                </Button>
                {!canImport && (
                  <p className="text-xs text-amber-600">
                    Chọn sản phẩm và biến thể trước khi import.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Profile import (always visible — dùng để thêm profiles vào bất kỳ account nào) ── */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-cyan-600" />
                <h2 className="text-sm font-semibold text-gray-700">
                  Bước 2 — Nhập profiles / slots
                </h2>
              </div>
              <p className="text-xs text-gray-400">
                Sau khi nhập tài khoản chính ở bước 1, thêm các profile (slot) cho tài khoản đó.
              </p>

              {/* Queue progress banner (when multiple accounts imported) */}
              {lastItemIds.length > 1 && (
                <div className="flex items-center justify-between bg-cyan-50 border border-cyan-200 rounded-lg px-3 py-2">
                  <span className="text-xs text-cyan-700 font-medium">
                    Tài khoản {lastItemIdsIndex + 1} / {lastItemIds.length}
                    {" · "}Item ID #{lastItemIds[lastItemIdsIndex]}
                  </span>
                  <div className="flex gap-1">
                    {lastItemIds.map((id, i) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setLastItemIdsIndex(i);
                          setManualItemId(String(id));
                          setProfiles([{ profile_name: "", pin_code: null, max_slots: 1 }]);
                        }}
                        className={`h-5 w-5 rounded-full text-[10px] font-bold transition-colors ${
                          i === lastItemIdsIndex
                            ? "bg-cyan-600 text-white"
                            : "bg-cyan-100 text-cyan-600 hover:bg-cyan-200"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Account picker */}
              {selectedVariantId ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-500">Chọn tài khoản</Label>
                    <button
                      type="button"
                      onClick={() => refetchItems()}
                      className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Làm mới
                    </button>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <Input
                      placeholder="Tìm theo email..."
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      className="pl-8 border-gray-200 bg-white text-gray-900 text-sm h-8"
                    />
                  </div>

                  {/* Table */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    {itemsLoading ? (
                      <div className="flex items-center justify-center py-6 gap-2 text-xs text-gray-400">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Đang tải...
                      </div>
                    ) : filteredItems.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6">
                        {itemSearch ? "Không tìm thấy kết quả." : "Không có tài khoản ACCOUNT nào."}
                      </p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                          <tr>
                            <th className="w-6 px-2 py-2" />
                            <th className="text-left px-3 py-2 text-gray-500 font-medium">Email</th>
                            <th className="text-center px-2 py-2 text-gray-500 font-medium">Profiles</th>
                            <th className="text-center px-2 py-2 text-gray-500 font-medium">Trạng thái</th>
                            <th className="px-2 py-2" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredItems.map((item) => {
                            const isSelected = selectedItem?.id === item.id || lastItemIds[lastItemIdsIndex] === item.id;
                            const isExpanded = expandedItemId === item.id;
                            return (
                              <React.Fragment key={item.id}>
                                <tr
                                  key={item.id}
                                  className={`transition-colors ${isSelected ? "bg-cyan-50" : "hover:bg-gray-50"}`}
                                >
                                  <td className="px-2 py-2 text-center">
                                    {item.profiles.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                        title={isExpanded ? "Thu gọn" : "Xem profiles"}
                                      >
                                        <span className={`inline-block transition-transform ${isExpanded ? "rotate-90" : ""}`}>▶</span>
                                      </button>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 font-mono text-gray-800 truncate max-w-[160px]">
                                    {item.value}
                                  </td>
                                  <td className="px-2 py-2 text-center">
                                    <span className={`font-semibold ${item.profileCount === 0 ? "text-amber-600" : "text-gray-700"}`}>
                                      {item.profileCount}
                                    </span>
                                    {item.profileCount === 0 && (
                                      <span className="ml-1 text-amber-500">⚠</span>
                                    )}
                                  </td>
                                  <td className="px-2 py-2 text-center">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                      item.status === "AVAILABLE"
                                        ? "bg-emerald-50 text-emerald-700"
                                        : item.status === "IN_USE"
                                        ? "bg-blue-50 text-blue-700"
                                        : "bg-gray-100 text-gray-500"
                                    }`}>
                                      {item.status === "AVAILABLE" ? "Còn trống" : item.status === "IN_USE" ? "Đang dùng" : "Đã bán"}
                                    </span>
                                  </td>
                                  <td className="px-2 py-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedItem(item);
                                        setManualItemId(String(item.id));
                                        setLastItemIds([]);
                                        setLastItemIdsIndex(0);
                                        setExpandedItemId(item.id);
                                      }}
                                      className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                                        isSelected
                                          ? "bg-cyan-600 text-white"
                                          : "bg-gray-100 text-gray-600 hover:bg-cyan-100 hover:text-cyan-700"
                                      }`}
                                    >
                                      {isSelected ? "✓ Đã chọn" : "Chọn"}
                                    </button>
                                  </td>
                                </tr>
                                {isExpanded && item.profiles.length > 0 && (
                                  <tr className="bg-gray-50">
                                    <td colSpan={5} className="px-4 py-2">
                                      <table className="w-full text-[11px]">
                                        <thead>
                                          <tr className="text-gray-400 border-b border-gray-200">
                                            <th className="text-left pb-1 font-medium">Tên profile</th>
                                            <th className="text-left pb-1 font-medium">PIN</th>
                                            <th className="text-center pb-1 font-medium">Slots</th>
                                            <th className="text-center pb-1 font-medium">Trạng thái</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                          {item.profiles.map((p) => (
                                            <tr key={p.id}>
                                              <td className="py-1 font-medium text-gray-700">{p.profileName}</td>
                                              <td className="py-1 font-mono text-gray-600">
                                                {p.pinCode ?? <span className="text-gray-400 italic">—</span>}
                                              </td>
                                              <td className="py-1 text-center text-gray-600">
                                                {p.assignedSlots}/{p.maxSlots}
                                              </td>
                                              <td className="py-1 text-center">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                                  p.status === "AVAILABLE"
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : "bg-blue-50 text-blue-700"
                                                }`}>
                                                  {p.status === "AVAILABLE" ? "Còn trống" : "Đã gán"}
                                                </span>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Selected account summary */}
                  {(selectedItem || lastItemId) && (
                    <p className="text-xs text-cyan-700 bg-cyan-50 border border-cyan-200 rounded-lg px-3 py-1.5">
                      Đang thêm profile cho:{" "}
                      <span className="font-mono font-semibold">
                        {selectedItem?.value ?? `Item #${lastItemId}`}
                      </span>
                      {" "}(ID: {lastItemId})
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400">Chọn biến thể để xem danh sách tài khoản.</p>
              )}

              {/* Profiles list */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-gray-500">Danh sách profiles</Label>
                  <button
                    type="button"
                    onClick={() =>
                      setProfiles((p) => [
                        ...p,
                        { profile_name: "", pin_code: null, max_slots: 1 },
                      ])
                    }
                    className="flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Thêm profile
                  </button>
                </div>

                {profiles.map((profile, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-[1fr_1fr_80px_32px] gap-2 items-center"
                  >
                    <Input
                      placeholder="Tên profile (VD: Profile 1)"
                      value={profile.profile_name}
                      onChange={(e) =>
                        setProfiles((p) =>
                          p.map((x, i) =>
                            i === idx ? { ...x, profile_name: e.target.value } : x,
                          ),
                        )
                      }
                      className="border-gray-200 bg-white text-gray-900 text-xs h-8"
                    />
                    <Input
                      placeholder="PIN (để trống nếu không có)"
                      value={profile.pin_code ?? ""}
                      onChange={(e) =>
                        setProfiles((p) =>
                          p.map((x, i) =>
                            i === idx
                              ? { ...x, pin_code: e.target.value || null }
                              : x,
                          ),
                        )
                      }
                      className="border-gray-200 bg-white text-gray-900 text-xs h-8"
                    />
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      placeholder="Slots"
                      value={profile.max_slots}
                      onChange={(e) =>
                        setProfiles((p) =>
                          p.map((x, i) =>
                            i === idx
                              ? { ...x, max_slots: Math.max(1, Number(e.target.value)) }
                              : x,
                          ),
                        )
                      }
                      className="border-gray-200 bg-white text-gray-900 text-xs h-8"
                    />
                    <button
                      type="button"
                      disabled={profiles.length === 1}
                      onClick={() =>
                        setProfiles((p) => p.filter((_, i) => i !== idx))
                      }
                      className="h-8 w-8 flex items-center justify-center text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                <div className="flex gap-1 text-[11px] text-gray-400 px-0.5">
                  <span className="flex-1">Tên profile</span>
                  <span className="flex-1">PIN</span>
                  <span className="w-20">Max slots</span>
                  <span className="w-8" />
                </div>
              </div>

              <ConfirmDialog
                trigger={
                  <Button
                    disabled={
                      profileImportMutation.isPending ||
                      (!lastItemId && !manualItemId) ||
                      profiles.some((p) => !p.profile_name.trim())
                    }
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold disabled:opacity-60"
                  >
                    {profileImportMutation.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang thêm…</>
                    ) : (
                      <><Users className="mr-2 h-4 w-4" />Thêm {profiles.length} profile</>
                    )}
                  </Button>
                }
                title="Xác nhận thêm profiles"
                description={`Thêm ${profiles.length} profile vào Inventory Item #${lastItemId ?? manualItemId}?`}
                confirmLabel="Thêm profiles"
                destructive={false}
                onConfirm={() => profileImportMutation.mutate()}
              />
            </div>
        </div>
      </div>
    </div>
  );
}
