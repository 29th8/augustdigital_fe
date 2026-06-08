"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Zap,
  ShieldCheck,
  Lock,
  Package,
  ChevronRight,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/product/ProductCard";
import { ProductService } from "@/services/product.service";
import { cn } from "@/lib/utils";

// ─── Feature card ──────────────────────────────────────────────────────────────

function FeatureCard({
  icon: Icon,
  title,
  desc,
  accent = false,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border p-5 transition-shadow hover:shadow-md",
        accent
          ? "bg-gradient-to-br from-sky-50 to-cyan-50 border-sky-100"
          : "bg-white border-gray-100",
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          accent ? "bg-sky-100 text-sky-600" : "bg-gray-100 text-gray-500",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ─── Product skeleton ─────────────────────────────────────────────────────────

function ProductSkeleton() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white overflow-hidden animate-pulse">
      <div className="aspect-video bg-gray-100" />
      <div className="p-4 flex flex-col gap-2">
        <div className="h-3 w-20 bg-gray-100 rounded-full" />
        <div className="h-4 w-full bg-gray-100 rounded-full" />
        <div className="h-3 w-3/4 bg-gray-100 rounded-full" />
        <div className="h-3 w-24 bg-gray-100 rounded-full mt-2" />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const { data, isLoading } = useQuery({
    queryKey: ["products-home"],
    queryFn: () => ProductService.getProducts({ page: 0, limit: 6 }),
    staleTime: 5 * 60 * 1000,
  });

  const products = data?.items ?? [];

  return (
    <div className="flex flex-col gap-16 pb-16">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 px-8 py-16 md:px-16 md:py-24 text-white">
        {/* Dot pattern */}
        <div
          className="absolute inset-0 opacity-10 rounded-3xl"
          style={{
            backgroundImage: "radial-gradient(circle, #94a3b8 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Glow */}
        <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-sky-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-300 mb-6">
            <Star className="h-3 w-3 fill-sky-400 text-sky-400" />
            Nền tảng hàng số uy tín hàng đầu
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
            Hàng số.{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-sky-400 bg-clip-text text-transparent">
              Tức thì.
            </span>{" "}
            Tin cậy.
          </h1>

          <p className="mt-4 text-base text-slate-300 max-w-lg leading-relaxed">
            Mua sắm tài khoản, phần mềm và dịch vụ số với giao hàng tự động, bảo hành toàn diện và thanh toán an toàn.
          </p>

          <div className="flex flex-wrap gap-3 mt-8">
            <Button
              asChild
              size="lg"
              className="bg-sky-500 hover:bg-sky-400 text-white font-semibold shadow-lg shadow-sky-500/25"
            >
              <Link href="/products">
                Khám phá sản phẩm
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 hover:border-white/40"
            >
              <Link href="/orders">Đơn hàng của tôi</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Tại sao chọn AugustDigital?</h2>
            <p className="text-sm text-gray-400 mt-0.5">Cam kết chất lượng trên từng giao dịch.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FeatureCard
            icon={Zap}
            title="Giao hàng tức thì"
            desc="Nhận sản phẩm số ngay sau khi thanh toán thành công, không cần chờ đợi."
            accent
          />
          <FeatureCard
            icon={ShieldCheck}
            title="Bảo hành toàn diện"
            desc="Hỗ trợ bảo hành và đổi trả trong suốt thời gian sử dụng sản phẩm."
          />
          <FeatureCard
            icon={Lock}
            title="Thanh toán an toàn"
            desc="Tích hợp PayOS với mã hoá end-to-end, bảo vệ mọi giao dịch của bạn."
          />
        </div>
      </section>

      {/* ── Featured products ── */}
      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Sản phẩm nổi bật</h2>
            <p className="text-sm text-gray-400 mt-0.5">Các sản phẩm được mua nhiều nhất.</p>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-gray-200 text-gray-600 hover:bg-sky-50 hover:border-sky-200 hover:text-sky-700 transition-colors"
          >
            <Link href="/products">
              Xem tất cả
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 rounded-2xl border border-gray-100 bg-white text-center">
            <div className="p-4 bg-gray-50 rounded-2xl">
              <Package className="h-7 w-7 text-gray-200" />
            </div>
            <p className="text-sm text-gray-400">Chưa có sản phẩm nào.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* ── CTA banner ── */}
      <section className="rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-cyan-50 px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Không tìm thấy sản phẩm phù hợp?</h3>
          <p className="text-sm text-gray-500 mt-1">Khám phá toàn bộ danh mục sản phẩm của chúng tôi.</p>
        </div>
        <Button
          asChild
          className="bg-sky-600 hover:bg-sky-500 text-white font-semibold shrink-0 shadow-sm"
        >
          <Link href="/products">
            Xem tất cả sản phẩm
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Link>
        </Button>
      </section>
    </div>
  );
}
