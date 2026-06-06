import { z } from "zod";

// ─── Raw API schema ───────────────────────────────────────────────────────────
// Used by the service layer to validate API responses before normalizing.
// Field names match actual backend camelCase JSON.

export const RawDiscountCodeSchema = z.object({
  id: z.number(),
  code: z.string(),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.number(),
  usageLimit: z.number().int(),
  usedCount: z.number().int(),
  remainingUses: z.number().int().optional(),
  isActive: z.boolean(),
  expiredAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string().nullable().optional(),
});

// ─── Form schemas ─────────────────────────────────────────────────────────────
// Field names are camelCase to match the API payload shape directly.

export const DiscountFormSchema = z
  .object({
    /** Present in edit mode only. */
    id: z.number().optional(),
    code: z
      .string()
      .min(1, "Mã không được để trống.")
      .max(50, "Mã tối đa 50 ký tự."),
    type: z.enum(["PERCENT", "FIXED"], { message: "Chọn loại giảm giá." }),
    value: z
      .number({ message: "Giá trị phải là số." })
      .positive("Giá trị phải lớn hơn 0."),
    usageLimit: z
      .number({ message: "Số lượt phải là số." })
      .int("Số lượt phải là số nguyên.")
      .min(1, "Số lượt tối thiểu là 1."),
    isActive: z.boolean().default(true),
    expiredAt: z.string().nullable().optional(),
    // Phantom — only used for cross-field validation on edit; NOT sent to backend.
    _usedCount: z.number().optional(),
  })
  .refine(
    (d) => !(d.type === "PERCENT" && d.value > 100),
    { message: "Giảm phần trăm không được vượt quá 100%.", path: ["value"] },
  )
  .refine(
    (d) => {
      if (!d.expiredAt) return true;
      return new Date(d.expiredAt) > new Date();
    },
    { message: "Ngày hết hạn phải ở tương lai.", path: ["expiredAt"] },
  )
  .refine(
    (d) => {
      if (d.usageLimit === undefined || d._usedCount === undefined) return true;
      return d.usageLimit >= d._usedCount;
    },
    {
      message: "Giới hạn không được nhỏ hơn số lượt đã dùng.",
      path: ["usageLimit"],
    },
  );

export type DiscountFormValues = z.input<typeof DiscountFormSchema>;

// ─── Backward-compat aliases (used by /admin/discount-codes page) ─────────────

/** @deprecated Use DiscountFormSchema */
export const CreateDiscountSchema = DiscountFormSchema;
/** @deprecated Use DiscountFormSchema */
export const UpdateDiscountSchema = DiscountFormSchema;
/** @deprecated Use DiscountFormValues */
export type CreateDiscountFormValues = DiscountFormValues;
/** @deprecated Use DiscountFormValues */
export type UpdateDiscountFormValues = DiscountFormValues;
