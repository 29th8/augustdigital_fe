"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Tag } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/FormField";
import { useCategoryMutations } from "@/hooks/useCategoryMutations";

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Tên danh mục phải có ít nhất 2 ký tự.")
    .max(100, "Tên danh mục tối đa 100 ký tự."),
});

type FormValues = z.infer<typeof schema>;

export default function AdminEditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const categoryId = Number(id);
  const router = useRouter();
  const { data, isLoading, isError, updateCategory, isUpdating } = useCategoryMutations();

  const category = data?.find((c) => c.id === categoryId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (category) reset({ name: category.name });
  }, [category, reset]);

  async function onSubmit(values: FormValues) {
    try {
      await updateCategory(categoryId, values.name);
      router.push("/admin/categories");
    } catch {
      // toast already shown by useCategoryMutations onError
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 max-w-lg">
        <div className="h-5 w-32 bg-gray-100 rounded animate-pulse" />
        <div className="rounded-xl border border-gray-200 bg-white p-6 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
            <div className="h-9 w-full bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="flex justify-end pt-2 border-t border-gray-100">
            <div className="h-9 w-36 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !category) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <Tag className="h-12 w-12 text-gray-300" />
        <p className="text-gray-500">Không tìm thấy danh mục.</p>
        <Button asChild variant="outline" size="sm" className="border-gray-200">
          <Link href="/admin/categories">Quay lại danh sách</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg">
      <div className="flex flex-col gap-1">
        <Link
          href="/admin/categories"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 mt-2">Sửa danh mục</h1>
        <p className="text-sm text-gray-500">Cập nhật tên danh mục.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <FormField
            htmlFor="name"
            label="Tên danh mục"
            required
            error={errors.name?.message}
          >
            <Input
              id="name"
              {...register("name")}
              autoFocus
              className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-cyan-500"
            />
          </FormField>

          <div className="flex justify-end pt-2 border-t border-gray-100">
            <Button
              type="submit"
              disabled={isUpdating}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold min-w-[140px]"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang lưu…
                </>
              ) : (
                "Lưu thay đổi"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
