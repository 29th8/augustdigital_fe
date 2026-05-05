"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
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

export default function AdminCreateCategoryPage() {
  const router = useRouter();
  const { createCategory, isCreating } = useCategoryMutations();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    try {
      await createCategory(values.name);
      router.push("/admin/categories");
    } catch {
      // toast already shown by useCategoryMutations onError
    }
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
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 mt-2">Thêm danh mục</h1>
        <p className="text-sm text-gray-500">Điền tên để tạo danh mục mới.</p>
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
              placeholder="VD: Game Keys"
              autoFocus
              className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus-visible:ring-cyan-500"
            />
          </FormField>

          <div className="flex justify-end pt-2 border-t border-gray-100">
            <Button
              type="submit"
              disabled={isCreating}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold min-w-[140px]"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang tạo…
                </>
              ) : (
                "Tạo danh mục"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
