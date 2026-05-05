import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ProductForm from "@/components/product/ProductForm";

export default function AdminCreateProductPage() {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex flex-col gap-1">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 mt-2">Thêm sản phẩm</h1>
        <p className="text-sm text-gray-500">Điền thông tin để tạo sản phẩm mới.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <ProductForm mode="create" />
      </div>
    </div>
  );
}
