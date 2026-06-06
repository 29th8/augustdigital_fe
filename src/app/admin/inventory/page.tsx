"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Warehouse,
  Plus,
  Search,
  Loader2,
  ChevronDown,
  ChevronUp,
  Package,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldCheck,
  TrendingDown,
  BoxIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductService } from "@/services/product.service";
import { InventoryService } from "@/services/inventory.service";
import { formatVND } from "@/lib/formatVND";
import type { Product, ProductVariant } from "@/types/product";
import type { InventoryItemDetail } from "@/types/inventory";

const LOW_STOCK = 5;

// ─── Stock badge ──────────────────────────────────────────────────────────────

function StockPill({ count }: { count: number }) {
  if (count === 0)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 border border-red-100">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
        Hết hàng
      </span>
    );
  if (count <= LOW_STOCK)
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-600 border border-amber-100">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
        Sắp hết · {count}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
      Còn {count}
    </span>
  );
}

// ─── Item status badge ────────────────────────────────────────────────────────

function ItemStatusBadge({ status }: { status: InventoryItemDetail["status"] }) {
  const map = {
    AVAILABLE: { label: "Còn hàng", cls: "bg-emerald-50 text-emerald-700 border-emerald-100" },
    IN_USE:    { label: "Đang dùng", cls: "bg-blue-50 text-blue-600 border-blue-100" },
    SOLD:      { label: "Đã bán",    cls: "bg-gray-100 text-gray-500 border-gray-200" },
    REVOKED:   { label: "Thu hồi",   cls: "bg-red-50 text-red-500 border-red-100" },
  };
  const { label, cls } = map[status] ?? map.SOLD;
  return (
    <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${cls}`}>
      {label}
    </span>
  );
}

// ─── Mask helper ──────────────────────────────────────────────────────────────

function mask(value: string): string {
  if (value.length <= 4) return "••••••••";
  return value.slice(0, 2) + "•".repeat(Math.min(value.length - 4, 10)) + value.slice(-2);
}

// ─── Item row ─────────────────────────────────────────────────────────────────

function ItemRow({ item, index }: { item: InventoryItemDetail; index: number }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0 group">
      <span className="text-[11px] text-gray-300 w-5 shrink-0 mt-0.5 font-mono">{index + 1}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-mono text-gray-700 truncate">
          {item.value === null ? (
            <span className="text-red-400 italic not-italic">Không thể giải mã</span>
          ) : revealed ? (
            item.value
          ) : (
            mask(item.value)
          )}
        </p>
        {item.type === "ACCOUNT" && item.profiles.length > 0 && (
          <div className="mt-1.5 flex flex-col gap-1">
            {item.profiles.map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-[11px] text-gray-400">
                <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0" />
                <span>{p.profileName}</span>
                {p.pinCode && (
                  <span className="text-gray-300">PIN: {revealed ? p.pinCode : "••••"}</span>
                )}
                <span className="text-gray-300 ml-auto">{p.assignedSlots}/{p.maxSlots} slots</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {item.value !== null && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className="text-gray-200 hover:text-gray-500 transition-colors opacity-0 group-hover:opacity-100"
            title={revealed ? "Ẩn" : "Hiện"}
          >
            {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        )}
        <ItemStatusBadge status={item.status} />
      </div>
    </div>
  );
}

// ─── Variant row ──────────────────────────────────────────────────────────────

function VariantRow({
  variant,
  onImport,
}: {
  variant: ProductVariant;
  productId: number;
  onImport: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const { data: items, isLoading, isError, error } = useQuery({
    queryKey: ["inventory-items", variant.id],
    queryFn: () => InventoryService.listItems(variant.id),
    enabled: expanded,
    staleTime: 30_000,
    retry: false,
  });

  const stock = variant.stock ?? 0;

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/80 transition-colors">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
        >
          <div className={`p-0.5 rounded transition-colors ${expanded ? "text-sky-500" : "text-gray-300"}`}>
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </div>
          <span className="text-sm font-medium text-gray-800 truncate">{variant.name}</span>
          <span className="text-xs text-gray-400 shrink-0 font-medium">{formatVND(variant.price)}</span>
        </button>
        <StockPill count={stock} />
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onImport();
          }}
          className="h-7 px-3 text-xs bg-sky-600 hover:bg-sky-500 text-white shrink-0 shadow-sm"
        >
          <Plus className="h-3 w-3 mr-1" />
          Nhập hàng
        </Button>
      </div>

      {expanded && (
        <div className="border-t border-gray-50 px-4 py-2 bg-gray-50/40">
          {isLoading ? (
            <div className="flex items-center gap-2 py-4 text-xs text-gray-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" />
              Đang tải...
            </div>
          ) : isError ? (
            <div className="flex items-center gap-2 py-4 text-xs text-red-400">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {error instanceof Error ? error.message : "Lỗi tải dữ liệu"}
            </div>
          ) : !items || items.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 py-6 text-center">
              <BoxIcon className="h-6 w-6 text-gray-200" />
              <p className="text-xs text-gray-400">Chưa có hàng trong kho.</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-1.5 py-2 mb-1">
                <span className="text-[11px] font-medium text-gray-400">{items.length} items</span>
                <span className="text-[11px] text-gray-300">·</span>
                <span className="text-[11px] text-emerald-600 font-medium">
                  {items.filter(i => i.status === "AVAILABLE").length} còn
                </span>
                <span className="text-[11px] text-gray-300">·</span>
                <span className="text-[11px] text-gray-400">
                  {items.filter(i => i.status === "SOLD").length} đã bán
                </span>
              </div>
              {items.map((item, i) => (
                <ItemRow key={item.id} item={item} index={i} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Product card ─────────────────────────────────────────────────────────────

function ProductCard({ product, onImport }: { product: Product; onImport: (variantId: number) => void }) {
  const [open, setOpen] = useState(false);
  const totalStock = product.variants.reduce((s, v) => s + (v.stock ?? 0), 0);
  const hasLow = product.variants.some((v) => { const s = v.stock ?? 0; return s > 0 && s <= LOW_STOCK; });
  const isOutOfStock = totalStock === 0;

  return (
    <div className={`bg-white rounded-2xl overflow-hidden shadow-sm border transition-all ${
      isOutOfStock ? "border-gray-100" : hasLow ? "border-amber-100" : "border-gray-100"
    } ${open ? "shadow-md" : "hover:shadow-md"}`}>
      {/* Left accent bar */}
      <div className={`h-0.5 w-full ${
        isOutOfStock ? "bg-gray-100" : hasLow ? "bg-gradient-to-r from-amber-300 to-orange-300" : "bg-gradient-to-r from-sky-400 to-cyan-400"
      }`} />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors text-left"
      >
        {/* Icon */}
        <div className={`p-2 rounded-xl shrink-0 ${
          isOutOfStock ? "bg-gray-50" : hasLow ? "bg-amber-50" : "bg-sky-50"
        }`}>
          <Package className={`h-4 w-4 ${
            isOutOfStock ? "text-gray-300" : hasLow ? "text-amber-500" : "text-sky-500"
          }`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
            {hasLow && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-100 shrink-0">
                <TrendingDown className="h-2.5 w-2.5" />
                Sắp hết
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {product.variants.length} biến thể ·{" "}
            {product.fulfillmentType === "INSTANT_SHARED" ? "Chia sẻ" : "Giao ngay"}
          </p>
        </div>

        {/* Stock count */}
        <div className="text-right shrink-0">
          <p className={`text-2xl font-bold tabular-nums ${
            isOutOfStock ? "text-gray-300" : hasLow ? "text-amber-500" : "text-gray-900"
          }`}>
            {totalStock}
          </p>
          <p className="text-[10px] text-gray-400 uppercase tracking-wide">tồn kho</p>
        </div>

        <div className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <ChevronDown className="h-4 w-4 text-gray-300" />
        </div>
      </button>

      {open && (
        <div className="px-5 pb-4 flex flex-col gap-2 border-t border-gray-50">
          <div className="pt-3 flex flex-col gap-2">
            {product.variants.map((v) => (
              <VariantRow
                key={v.id}
                variant={v}
                productId={product.id}
                onImport={() => onImport(v.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminInventoryPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-inventory-products"],
    queryFn: () => ProductService.getProducts({ limit: 100 }),
    staleTime: 30_000,
  });

  const products = (data?.items ?? []).filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const reEncryptMutation = useMutation({
    mutationFn: () => InventoryService.reEncrypt(),
    onSuccess: (result) => {
      toast.success(
        `Re-encrypt xong: ${result.items_fixed} items + ${result.pins_fixed} PINs đã mã hóa, ${result.items_skipped + result.pins_skipped} đã bỏ qua.`,
      );
    },
    onError: () => {
      toast.error("Re-encrypt thất bại.");
    },
  });

  function handleImport(variantId: number) {
    router.push(`/admin/inventory/import?variantId=${variantId}`);
  }

  // Summary stats
  const totalProducts = data?.items.length ?? 0;
  const lowStockCount = (data?.items ?? []).filter(p =>
    p.variants.some(v => { const s = v.stock ?? 0; return s > 0 && s <= LOW_STOCK; })
  ).length;
  const outOfStockCount = (data?.items ?? []).filter(p =>
    p.variants.every(v => (v.stock ?? 0) === 0)
  ).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <div className="p-2 bg-sky-50 rounded-xl">
              <Warehouse className="h-5 w-5 text-sky-600" />
            </div>
            Kho hàng
          </h1>
          <p className="text-sm text-gray-400 mt-1 ml-0.5">
            Quản lý tồn kho và nhập hàng theo biến thể
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-gray-200 text-gray-500 hover:text-gray-700 h-9"
            disabled={reEncryptMutation.isPending}
            onClick={() => reEncryptMutation.mutate()}
          >
            {reEncryptMutation.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
            )}
            Re-encrypt
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-gray-200 text-gray-500 hover:text-gray-700 h-9"
            onClick={() => refetch()}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Stats row */}
      {!isLoading && !isError && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">Tổng sản phẩm</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{totalProducts}</p>
          </div>
          <div className="bg-white rounded-xl border border-amber-100 px-4 py-3 shadow-sm">
            <p className="text-[11px] text-amber-500 uppercase tracking-wide">Sắp hết hàng</p>
            <p className="text-2xl font-bold text-amber-500 mt-0.5">{lowStockCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-red-100 px-4 py-3 shadow-sm">
            <p className="text-[11px] text-red-400 uppercase tracking-wide">Hết hàng</p>
            <p className="text-2xl font-bold text-red-500 mt-0.5">{outOfStockCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm hidden sm:block">
            <p className="text-[11px] text-gray-400 uppercase tracking-wide">Hiển thị</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{products.length}</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
        <Input
          placeholder="Tìm sản phẩm..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 border-gray-200 bg-white h-10 rounded-xl shadow-sm focus-visible:ring-sky-400"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24 gap-2 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin text-sky-400" />
          <span className="text-sm">Đang tải...</span>
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <div className="p-4 bg-gray-50 rounded-2xl">
            <Package className="h-8 w-8 text-gray-200" />
          </div>
          <p className="text-sm text-gray-500">Không thể tải danh sách sản phẩm.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Thử lại</Button>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <div className="p-4 bg-gray-50 rounded-2xl">
            <Package className="h-8 w-8 text-gray-200" />
          </div>
          <p className="text-sm text-gray-400">
            {search ? "Không tìm thấy sản phẩm." : "Chưa có sản phẩm nào."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} onImport={handleImport} />
          ))}
        </div>
      )}
    </div>
  );
}
