"use client";

import { useState } from "react";
import { Controller } from "react-hook-form";
import { Plus, Trash2, Loader2 } from "lucide-react";
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
import ImageUpload from "./ImageUpload";
import { useProductForm } from "@/hooks/useProductForm";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { useCategories } from "@/hooks/useCategories";
import type { Product } from "@/types/product";

interface ProductFormProps {
  mode?: "create" | "edit";
  initialProduct?: Product;
}

export default function ProductForm({ mode = "create", initialProduct }: ProductFormProps) {
  if (mode === "edit" && initialProduct) {
    console.log("EDIT CATEGORY:", initialProduct.categoryId, "| raw product:", initialProduct);
  }

  // imageUrl lives here — directly updated on upload success, no stale closure
  const [imageUrl, setImageUrl] = useState<string | null>(
    resolveImageUrl(initialProduct?.imageUrl ?? null)
  );
  const [isUploading, setIsUploading] = useState(false);

  const {
    form,
    variantFields,
    onSubmit,
    isSubmitting,
  } = useProductForm({ mode, initialProduct, imageUrl });

  const {
    register,
    control,
    formState: { errors },
  } = form;

  const { data: categories = [] } = useCategories();

  const isDisabled = isSubmitting || isUploading;
  const submitLabel = mode === "edit" ? "Lưu thay đổi" : "Tạo sản phẩm";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-8">
      {/* Image */}
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium text-gray-700">Hình ảnh sản phẩm</Label>
        <ImageUpload
          value={imageUrl ?? undefined}
          onUploadStart={() => setIsUploading(true)}
          onUpload={(rawUrl) => {
            setIsUploading(false);
            const fullUrl = resolveImageUrl(rawUrl) ?? rawUrl;
            console.log("RAW IMAGE:", rawUrl);
            console.log("FINAL IMAGE:", fullUrl);
            setImageUrl(fullUrl);
            toast.success("Upload thành công");
          }}
          onClear={() => setImageUrl(null)}
        />
      </div>

      {/* Name */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="name" className="text-sm font-medium text-gray-700">
          Tên sản phẩm <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          {...register("name")}
          placeholder="VD: Adobe Creative Cloud"
          className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-cyan-500"
        />
        {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
      </div>

      {/* Category */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="categoryId" className="text-sm font-medium text-gray-700">
          Danh mục <span className="text-red-500">*</span>
        </Label>
        <Controller
          name="categoryId"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value > 0 ? field.value.toString() : ""}
              onValueChange={(val) => field.onChange(Number(val))}
            >
              <SelectTrigger
                id="categoryId"
                className="border-gray-200 bg-white text-gray-900 focus:ring-cyan-500"
              >
                <SelectValue placeholder="Chọn danh mục" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                {categories.map((cat) => (
                  <SelectItem
                    key={cat.id}
                    value={cat.id.toString()}
                    className="text-gray-700 focus:bg-gray-50 focus:text-gray-900"
                  >
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.categoryId && (
          <p className="text-xs text-red-500">{errors.categoryId.message}</p>
        )}
      </div>

      {/* Fulfillment type */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="fulfillmentType" className="text-sm font-medium text-gray-700">
          Loại sản phẩm <span className="text-red-500">*</span>
        </Label>
        <Controller
          name="fulfillmentType"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger
                id="fulfillmentType"
                className="border-gray-200 bg-white text-gray-900 focus:ring-cyan-500"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                <SelectItem value="INSTANT_DIRECT" className="text-gray-700 focus:bg-gray-50 focus:text-gray-900">
                  Giao ngay
                </SelectItem>
                <SelectItem value="INSTANT_SHARED" className="text-gray-700 focus:bg-gray-50 focus:text-gray-900">
                  Chia sẻ
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.fulfillmentType && (
          <p className="text-xs text-red-500">{errors.fulfillmentType.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="description" className="text-sm font-medium text-gray-700">
          Mô tả <span className="text-red-500">*</span>
        </Label>
        <textarea
          id="description"
          {...register("description")}
          rows={3}
          placeholder="Mô tả sản phẩm…"
          className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
        />
        {errors.description && (
          <p className="text-xs text-red-500">{errors.description.message}</p>
        )}
      </div>

      {/* Variants */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-gray-700">
            Biến thể <span className="text-red-500">*</span>
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => variantFields.append({ name: "", price: 0, costPrice: null })}
            className="border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Thêm biến thể
          </Button>
        </div>

        {errors.variants?.root && (
          <p className="text-xs text-red-500">{errors.variants.root.message}</p>
        )}

        <div className="flex flex-col gap-3">
          {variantFields.fields.map((field, index) => (
            <div
              key={field.id}
              className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start p-3 rounded-lg border border-gray-200 bg-gray-50"
            >
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-gray-500">Tên</Label>
                <Input
                  {...register(`variants.${index}.name`)}
                  placeholder="VD: 1 năm"
                  className="h-8 text-sm border-gray-200 bg-white focus-visible:ring-cyan-500"
                />
                {errors.variants?.[index]?.name && (
                  <p className="text-xs text-red-500">{errors.variants[index]?.name?.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-gray-500">Giá bán (₫)</Label>
                <Input
                  type="number"
                  step="1"
                  min={0}
                  {...register(`variants.${index}.price`, { valueAsNumber: true })}
                  placeholder="35000"
                  className="h-8 text-sm border-gray-200 bg-white focus-visible:ring-cyan-500"
                />
                {errors.variants?.[index]?.price && (
                  <p className="text-xs text-red-500">{errors.variants[index]?.price?.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-gray-500">Giá vốn (₫)</Label>
                <Input
                  type="number"
                  step="1"
                  min={0}
                  {...register(`variants.${index}.costPrice`, {
                    setValueAs: (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
                  })}
                  placeholder="20000"
                  className="h-8 text-sm border-gray-200 bg-white focus-visible:ring-cyan-500"
                />
                {errors.variants?.[index]?.costPrice && (
                  <p className="text-xs text-red-500">{errors.variants[index]?.costPrice?.message}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => variantFields.remove(index)}
                disabled={variantFields.fields.length === 1}
                className="mt-5 p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                aria-label="Xóa biến thể"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-2 border-t border-gray-100">
        <Button
          type="submit"
          disabled={isDisabled}
          className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold min-w-[140px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {mode === "edit" ? "Đang lưu…" : "Đang tạo…"}
            </>
          ) : isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang tải ảnh…
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}
