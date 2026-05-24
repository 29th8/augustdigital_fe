"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ProductService } from "@/services/product.service";
import type { ApiErrorResponse } from "@/types/api";
import type { Product } from "@/types/product";

const variantSchema = z.object({
  id: z.number().optional(), // present for existing variants
  name: z.string().min(1, "Tên biến thể là bắt buộc"),
  price: z.number().min(0, "Giá phải từ 0 trở lên"),
  costPrice: z.number().min(0, "Giá vốn phải từ 0 trở lên").nullable().optional(),
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

function translateProductError(message: string): string {
  // "Cannot remove variant 'X' — it has N existing inventory item(s)"
  const inventoryMatch = message.match(
    /Cannot remove variant '(.+?)' — it has (\d+) existing inventory item/,
  );
  if (inventoryMatch) {
    return `Không thể xóa biến thể "${inventoryMatch[1]}" — còn ${inventoryMatch[2]} sản phẩm trong kho. Hãy xóa hết inventory trước.`;
  }
  return message;
}

export function useProductForm({ mode, initialProduct, imageUrl }: UseProductFormOptions) {
  const router = useRouter();
  const queryClient = useQueryClient();

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
              id: v.id,
              name: v.name,
              price: v.price,
              costPrice: v.costPrice ?? null,
            })),
          }
        : {
            name: "",
            categoryId: 0,
            description: "",
            fulfillmentType: "INSTANT_DIRECT" as const,
            variants: [{ name: "", price: 0, costPrice: null }],
          },
  });

  // Reset form when product data updates (e.g. background refetch after stale cache)
  useEffect(() => {
    if (mode === "edit" && initialProduct) {
      form.reset({
        name: initialProduct.name,
        categoryId: initialProduct.categoryId ?? 0,
        description: initialProduct.description,
        fulfillmentType: initialProduct.fulfillmentType ?? "INSTANT_DIRECT",
        variants: initialProduct.variants.map((v) => ({
          id: v.id,
          name: v.name,
          price: v.price,
          costPrice: v.costPrice ?? null,
        })),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProduct]);

  const variantFields = useFieldArray({ control: form.control, name: "variants" });

  const onSubmit = form.handleSubmit(
    async (values) => {
      try {
        if (mode === "create" && !imageUrl) {
          toast.error("Vui lòng tải ảnh sản phẩm trước khi tạo.");
          return;
        }
        console.log("[useProductForm] submit values:", JSON.stringify(values, null, 2));
        if (mode === "edit" && initialProduct) {
          const payload = { ...values, imageUrl: imageUrl ?? undefined };
          console.log("[useProductForm] updateProduct payload:", JSON.stringify(payload, null, 2));
          await ProductService.updateProduct(initialProduct.id, payload);
          // Invalidate cache so next visit to edit page fetches fresh data
          await queryClient.invalidateQueries({ queryKey: ["product", initialProduct.id] });
          await queryClient.invalidateQueries({ queryKey: ["products"] });
          toast.success("Cập nhật sản phẩm thành công.");
          router.push("/admin/products");
        } else {
          await ProductService.createProduct({ ...values, imageUrl: imageUrl ?? undefined });
          toast.success("Tạo sản phẩm thành công.");
          router.push("/admin/products");
        }
      } catch (err) {
        const raw = (err as ApiErrorResponse)?.message ?? "";
        const message = translateProductError(raw) || `Không thể ${mode === "create" ? "tạo" : "cập nhật"} sản phẩm.`;
        toast.error(message);
      }
    },
    (validationErrors) => {
      console.error("[useProductForm] validation errors:", validationErrors);
    },
  );

  return {
    form,
    variantFields,
    onSubmit,
    isSubmitting: form.formState.isSubmitting,
    mode,
  };
}
