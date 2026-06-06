import { z } from "zod";

// ─── Status enums ─────────────────────────────────────────────────────────────

export const OrderStatusSchema = z.enum([
  "PENDING",
  "PAID",
  "PROCESSING",
  "COMPLETED",
  "PARTIALLY_COMPLETED",
  "PAID_PENDING_STOCK",
  "CANCELLED",
  "FAILED",
  "EXPIRED",
]);

export const WarrantyClaimStatusSchema = z
  .enum(["NONE", "CLAIMED", "RESOLVED", "REJECTED", "PENDING_STOCK"])
  .default("NONE");

// ─── Order item ───────────────────────────────────────────────────────────────
// Backend returns camelCase (Jackson default, no @JsonProperty overrides).

export const RawOrderItemSchema = z.preprocess(
  (raw) => {
    if (typeof raw !== "object" || raw === null) return raw;
    const o = raw as Record<string, unknown>;
    return {
      variantId:   o.variantId   ?? o.variant_id,
      variantName: o.variantName ?? o.variant_name ?? "",
      productName: o.productName ?? o.product_name ?? "",
      quantity:    o.quantity,
      price:       o.price,
      subtotal:    o.subtotal,
    };
  },
  z.object({
    variantId:   z.number(),
    variantName: z.string().default(""),
    productName: z.string().default(""),
    quantity:    z.number().int().min(1),
    price:       z.number(),
    subtotal:    z.number().optional(),
  }),
);

// ─── Base order (used by checkout confirmation) ───────────────────────────────

export const RawOrderSchema = z.preprocess(
  (raw) => {
    if (typeof raw !== "object" || raw === null) return raw;
    const o = raw as Record<string, unknown>;
    return {
      orderCode:   o.orderCode   ?? o.order_code,
      status:      o.status,
      totalAmount: o.totalAmount ?? o.total_amount,
      email:       o.email       ?? "",
      phone:       o.phone       ?? "",
      createdAt:   o.createdAt   ?? o.created_at,
      items:       o.items       ?? [],
    };
  },
  z.object({
    orderCode:   z.string(),
    status:      OrderStatusSchema,
    totalAmount: z.number(),
    email:       z.string(),
    phone:       z.string().default(""),
    createdAt:   z.string(),
    items:       z.array(RawOrderItemSchema).default([]),
  }),
);

// ─── Order list item (compact row) ───────────────────────────────────────────

export const RawOrderListItemSchema = z.preprocess(
  (raw) => {
    if (typeof raw !== "object" || raw === null) return raw;
    const o = raw as Record<string, unknown>;
    return {
      id:          o.id,
      orderCode:   o.orderCode   ?? o.order_code,
      email:       o.email       ?? "",
      phone:       o.phone       ?? "",
      totalAmount: o.totalAmount ?? o.total_amount,
      status:      o.status,
      createdAt:   o.createdAt   ?? o.created_at,
      updatedAt:   o.updatedAt   ?? o.updated_at,
    };
  },
  z.object({
    id:          z.number(),
    orderCode:   z.string(),
    email:       z.string(),
    phone:       z.string().default(""),
    totalAmount: z.number(),
    status:      OrderStatusSchema,
    createdAt:   z.string(),
    updatedAt:   z.string(),
  }),
);

// ─── Admin order list item (extra fields) ────────────────────────────────────

export const RawAdminOrderListItemSchema = z.preprocess(
  (raw) => {
    if (typeof raw !== "object" || raw === null) return raw;
    const o = raw as Record<string, unknown>;
    return {
      id:          o.id,
      orderCode:   o.orderCode   ?? o.order_code,
      email:       o.email       ?? "",
      phone:       o.phone       ?? "",
      totalAmount: o.totalAmount ?? o.total_amount,
      status:      o.status,
      itemCount:   o.itemCount   ?? o.item_count   ?? 0,
      createdAt:   o.createdAt   ?? o.created_at,
      updatedAt:   o.updatedAt   ?? o.updated_at,
    };
  },
  z.object({
    id:          z.number(),
    orderCode:   z.string(),
    email:       z.string(),
    phone:       z.string().default(""),
    totalAmount: z.number(),
    status:      OrderStatusSchema,
    itemCount:   z.number().int().min(0).default(0),
    createdAt:   z.string(),
    updatedAt:   z.string(),
  }),
);

// ─── Delivery credentials (discriminated union) ───────────────────────────────
//
// Backend sends:
//   { "type": "KEY",     "key": "..." }
//   { "type": "ACCOUNT", "email": "...", "password": "...", ... }

export const RawKeyCredentialSchema = z.object({
  type: z.literal("KEY"),
  key: z.string(),
});

export const RawAccountCredentialSchema = z.object({
  type: z.literal("ACCOUNT"),
  email: z.string(),
  password: z.string(),
  profile: z.string().nullable().optional(),
  pin: z.string().nullable().optional(),
});

/**
 * Preprocess normalises the `type` field to uppercase so "key" / "account"
 * from case-insensitive backends are still accepted.
 */
export const RawDeliveryCredentialSchema = z.preprocess(
  (raw) => {
    if (typeof raw !== "object" || raw === null) return raw;
    const obj = raw as Record<string, unknown>;
    const type = typeof obj.type === "string" ? obj.type.toUpperCase() : obj.type;
    return { ...obj, type };
  },
  z.discriminatedUnion("type", [RawKeyCredentialSchema, RawAccountCredentialSchema]),
);

// ─── Delivery item (legacy — kept for admin/lookup compatibility) ─────────────

export const RawDeliveryItemSchema = z.object({
  id: z.number(),
  variantId: z.number(),
  variantName: z.string(),
  productName: z.string(),
  deliveredAt: z.string(),
  warrantyStatus: WarrantyClaimStatusSchema,
  credential: RawDeliveryCredentialSchema,
});

// ─── Order detail — new BE structure ─────────────────────────────────────────
// Deliveries are nested inside each item (not a flat top-level array).
// Credential uses { type, value, password, profileName, pinCode }.

export const RawOrderCredentialSchema = z.object({
  type: z.enum(["KEY", "ACCOUNT"]),
  /** KEY → the key string. ACCOUNT → the email/username. */
  value: z.string(),
  password: z.string().nullable().optional(),
  profileName: z.string().nullable().optional(),
  pinCode: z.string().nullable().optional(),
});

export const RawOrderItemDeliverySchema = z.object({
  deliveryId: z.number(),
  deliveredAt: z.string(),
  credential: RawOrderCredentialSchema,
});

export const RawOrderDetailItemSchema = z.object({
  orderItemId: z.number().optional(),
  variantId: z.number(),
  variantName: z.string(),
  productName: z.string(),
  quantity: z.number().int().min(1),
  price: z.number(),
  subtotal: z.number().optional(),
  warrantyStatus: WarrantyClaimStatusSchema,
  deliveries: z.array(RawOrderItemDeliverySchema).default([]),
});

export const RawOrderDetailSchema = z.object({
  orderCode: z.string(),
  status: OrderStatusSchema,
  totalAmount: z.number(),
  email: z.string(),
  phone: z.string().default(""),
  createdAt: z.string(),
  updatedAt: z.string().nullable().optional(),
  paidAt: z.string().nullable().optional(),
  expiredAt: z.string().nullable().optional(),
  items: z.array(RawOrderDetailItemSchema).default([]),
  pendingStockCount: z.number().int().min(0).default(0),
});

// ─── Admin order detail ───────────────────────────────────────────────────────

export const RawInventoryAllocationSchema = z.object({
  variantId: z.number(),
  variantName: z.string(),
  productName: z.string().optional(),
  requested: z.number().int().min(0),
  allocated: z.number().int().min(0),
  pending: z.number().int().min(0),
  failed: z.number().int().min(0).default(0),
});

export const RawAuditLogSchema = z.object({
  id: z.number().optional(),
  action: z.string(),
  performedBy: z.string(),
  performedAt: z.string(),
  details: z.string().nullable().optional(),
});

export const RawAdminOrderDetailSchema = RawOrderDetailSchema.extend({
  customerId: z.number().nullable().optional(),
  inventoryAllocations: z.array(RawInventoryAllocationSchema).default([]).optional(),
  auditLogs: z.array(RawAuditLogSchema).default([]).optional(),
});

export type RawOrderCredential = z.infer<typeof RawOrderCredentialSchema>;
export type RawOrderItemDelivery = z.infer<typeof RawOrderItemDeliverySchema>;
export type RawOrderDetailItem = z.infer<typeof RawOrderDetailItemSchema>;

// ─── Inferred raw types ───────────────────────────────────────────────────────

export type RawOrder = z.infer<typeof RawOrderSchema>;
export type RawOrderItem = z.infer<typeof RawOrderItemSchema>;
export type RawOrderListItem = z.infer<typeof RawOrderListItemSchema>;
export type RawAdminOrderListItem = z.infer<typeof RawAdminOrderListItemSchema>;
export type RawDeliveryItem = z.infer<typeof RawDeliveryItemSchema>;
export type RawOrderDetail = z.infer<typeof RawOrderDetailSchema>;
export type RawAdminOrderDetail = z.infer<typeof RawAdminOrderDetailSchema>;
export type RawInventoryAllocation = z.infer<typeof RawInventoryAllocationSchema>;
export type RawAuditLog = z.infer<typeof RawAuditLogSchema>;

// ─── Lookup order schemas (supports both snake_case and camelCase) ─────────────

function normalizeStr(raw: unknown): unknown {
  return typeof raw === "string" && raw.trim() === "" ? undefined : raw;
}

export const RawLookupOrderItemSchema = z.preprocess(
  (raw) => {
    if (typeof raw !== "object" || raw === null) return raw;
    const obj = raw as Record<string, unknown>;
    return {
      product_name: obj.product_name ?? obj.productName ?? "",
      variant_name: obj.variant_name ?? obj.variantName ?? "",
      quantity: obj.quantity ?? 1,
      unit_price: obj.unit_price ?? obj.unitPrice ?? obj.price ?? 0,
    };
  },
  z.object({
    product_name: z.string(),
    variant_name: z.string(),
    quantity: z.number().int().min(1),
    unit_price: z.number(),
  }),
);

export const RawLookupDeliverySchema = z.preprocess(
  (raw) => {
    if (typeof raw !== "object" || raw === null) return raw;
    const obj = raw as Record<string, unknown>;
    return {
      product_name: obj.product_name ?? obj.productName ?? "",
      credentials: obj.credentials ?? [],
    };
  },
  z.object({
    product_name: z.string(),
    credentials: z.array(z.string()).default([]),
  }),
);

export const RawLookupOrderSchema = z.preprocess(
  (raw) => {
    if (typeof raw !== "object" || raw === null) return raw;
    const obj = raw as Record<string, unknown>;
    return {
      id: obj.id,
      order_code: obj.order_code ?? obj.orderCode ?? "",
      status: obj.status ?? "PENDING",
      email: obj.email ?? "",
      phone: obj.phone ?? "",
      total_amount: obj.total_amount ?? obj.totalAmount ?? 0,
      created_at: obj.created_at ?? obj.createdAt ?? "",
      updated_at: normalizeStr(obj.updated_at ?? obj.updatedAt),
      paid_at: obj.paid_at ?? obj.paidAt ?? null,
      expired_at: obj.expired_at ?? obj.expiredAt ?? null,
      items: obj.items ?? [],
      deliveries: obj.deliveries ?? [],
    };
  },
  z.object({
    id: z.number().optional(),
    order_code: z.string(),
    status: OrderStatusSchema,
    email: z.string(),
    phone: z.string().default(""),
    total_amount: z.number(),
    created_at: z.string(),
    updated_at: z.string().optional(),
    paid_at: z.string().nullable().optional(),
    expired_at: z.string().nullable().optional(),
    items: z.array(RawLookupOrderItemSchema).default([]),
    deliveries: z.array(RawLookupDeliverySchema).default([]),
  }),
);

export type RawLookupOrderItem = z.infer<typeof RawLookupOrderItemSchema>;
export type RawLookupDelivery = z.infer<typeof RawLookupDeliverySchema>;
export type RawLookupOrder = z.infer<typeof RawLookupOrderSchema>;
