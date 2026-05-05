"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ProductService } from "@/services/product.service";
import type { ApiErrorResponse } from "@/types/api";
import type { Product } from "@/types/product";

const variantSchema = z.object({
  name: z.string().min(1, "Tên biến thể là bắt buộc"),
  price: z.number().min(0, "Giá phải từ 0 trở lên"),
});

export const productFormSchema = z.object({
  name: z.string().min(1, "Tên sản phẩm là bắt buộc"),
  categoryId: z.number().min(1, "Vui lòng chọn danh mục"),
  description: z.string().min(1, "Mô tả là bắt buộc"),
  fulfillmentType: z.enum(["INSTANT_DIRECT", "INSTANT_SHARED"]),
  variants: z.array(variantSchema).min(1, "Cần có ít nhất một gói"),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

interface UseProductFormOptions {
  mode: "create" | "edit";
  initialProduct?: Product;
  /** Current image URL — managed by the consuming component to avoid stale closures. */
  imageUrl: string | null;
}

export function useProductForm({ mode, initialProduct, imageUrl }: UseProductFormOptions) {
  const router = useRouter();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues:
      mode === "edit" && initialProduct
        ? {
            name: initialProduct.name,
            categoryId: initialProduct.categoryId ?? 0,
            description: initialProduct.description,
            fulfillmentType: initialProduct.fulfillmentType ?? "INSTANT_DIRECT",
            variants: initialProduct.variants.map((v) => ({
              name: v.name,
              price: v.price,
            })),
          }
        : {
            name: "",
            categoryId: 0,
            description: "",
            fulfillmentType: "INSTANT_DIRECT" as const,
            variants: [{ name: "", price: 0 }],
          },
  });

  const variantFields = useFieldArray({ control: form.control, name: "variants" });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (mode === "create" && !imageUrl) {
        toast.error("Vui lòng tải ảnh sản phẩm trước khi tạo.");
        return;
      }
      console.log("[useProductForm] imageUrl at submit:", imageUrl);
      if (mode === "edit" && initialProduct) {
        await ProductService.updateProduct(initialProduct.id, {
          ...values,
          imageUrl: imageUrl ?? undefined,
        });
        toast.success("Cập nhật sản phẩm thành công.");
        router.push("/admin/products");
      } else {
        await ProductService.createProduct({ ...values, imageUrl: imageUrl ?? undefined });
        toast.success("Tạo sản phẩm thành công.");
        router.push("/admin/products");
      }
    } catch (err) {
      const message = (err as ApiErrorResponse)?.message ?? `Không thể ${mode === "create" ? "tạo" : "cập nhật"} sản phẩm.`;
      toast.error(message);
    }
  });

  return {
    form,
    variantFields,
    onSubmit,
    isSubmitting: form.formState.isSubmitting,
    mode,
  };
}
