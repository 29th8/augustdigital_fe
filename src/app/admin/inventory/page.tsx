"use client";

import { useEffect, useRef, useState } from "react";
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
import type { InventoryItemType } from "@/types/inventory";

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
  const lines = text.split("\n");
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

  // ── Analytics ────────────────────────────────────────────────────────────
  const analytics =
    stats && selectedVariantId !== null
      ? computeAnalytics(selectedVariantId, stats.available, stats.sold)
      : null;

  const soldPct = stats && stats.total > 0 ? Math.round((stats.sold / stats.total) * 100) : 0;
  const availPct = stats && stats.total > 0 ? Math.round((stats.available / stats.total) * 100) : 0;
  const isLowStock = stats !== undefined && stats.available > 0 && stats.available <= LOW_STOCK_THRESHOLD;
  const isOutOfStock = stats !== undefined && stats.available === 0;

  // Reset baseline when switching variant
  useEffect(() => {
    setImportSuccess(false);
  }, [selectedVariantId]);

  // ── JSON import ──────────────────────────────────────────────────────────
  const jsonImportMutation = useMutation<string, ApiErrorResponse>({
    mutationFn: () => {
      const keys = keysText.split("\n").map((k) => k.trim()).filter(Boolean);
      return InventoryService.importKeys({ variantId: selectedVariantId!, type: importType, keys });
    },
    onSuccess: (msg) => {
      toast.success(msg);
      logActivity({
        action: "import_json",
        variantName: selectedVariant?.name ?? `Variant #${selectedVariantId}`,
        detail: msg,
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
      const detail = `Import thành công: ${result.imported} keys (bỏ qua ${result.skipped} dòng trống)`;
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
  const jsonKeys = keysText.split("\n").filter((l) => l.trim().length > 0).length;
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
              <Label className="text-xs text-gray-500">Loại dữ liệu</Label>
              <div className="flex gap-2">
                {(["KEY", "ACCOUNT"] as InventoryItemType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setImportType(t)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                      importType === t
                        ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                        : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {t === "KEY" ? "🔑 KEY" : "👤 ACCOUNT"}
                  </button>
                ))}
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
                      {keysText.split("\n").length - jsonKeys > 0 && (
                        <span className="text-gray-400">
                          · {keysText.split("\n").length - jsonKeys} dòng trống
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
        </div>
      </div>
    </div>
  );
}
