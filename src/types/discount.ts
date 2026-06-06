// ─── Primitives ───────────────────────────────────────────────────────────────

export type DiscountType = "PERCENT" | "FIXED";

/**
 * Computed display status — derived on the frontend, NOT returned by the API.
 * Priority: EXPIRED > FULLY_USED > DISABLED > ACTIVE
 * EXPIRED takes priority regardless of isActive flag.
 */
export type DiscountStatus = "ACTIVE" | "EXPIRED" | "DISABLED" | "FULLY_USED";

// ─── API shapes (camelCase — matches actual Jackson/Spring Boot JSON) ──────────

export interface DiscountCodeApi {
  id: number;
  code: string;
  type: DiscountType;
  value: number;
  usageLimit: number;
  /** READ-ONLY: incremented by backend on each redemption — never send in payloads. */
  usedCount: number;
  /** Backend pre-computed: usageLimit - usedCount. Fallback to computing locally. */
  remainingUses?: number;
  isActive: boolean;
  expiredAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

/**
 * Spring Boot Page<T> envelope.
 * `number` = 0-based current page index.
 */
export interface PaginatedDiscountCodeResponseApi {
  content: DiscountCodeApi[];
  totalElements: number;
  totalPages: number;
  /** 0-based current page index (Spring convention). */
  number: number;
  size: number;
  first?: boolean;
  last?: boolean;
  numberOfElements?: number;
  empty?: boolean;
}

/** Payload for POST /api/v1/admin/discounts. */
export interface DiscountCodeCreateRequestApi {
  /** Backend auto-uppercases; frontend must pre-trim whitespace. */
  code: string;
  type: DiscountType;
  value: number;
  usageLimit: number;
  isActive: boolean;
  expiredAt: string | null;
}

/**
 * Payload for PUT /api/v1/admin/discounts/{id}.
 * All fields optional — send only what changed.
 * `usedCount` must NEVER be included.
 */
export interface DiscountCodeUpdateRequestApi {
  code?: string;
  type?: DiscountType;
  value?: number;
  usageLimit?: number;
  isActive?: boolean;
  expiredAt?: string | null;
}

// ─── Frontend shapes (camelCase) ──────────────────────────────────────────────

export interface DiscountCode {
  id: number;
  code: string;
  type: DiscountType;
  value: number;
  usageLimit: number;
  usedCount: number;
  remainingUses: number;
  isActive: boolean;
  expiredAt: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface PaginatedDiscountCodes {
  items: DiscountCode[];
  /** 0-based — add 1 when displaying to users. */
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  isFirst?: boolean;
  isLast?: boolean;
}

// ─── Normalizers ──────────────────────────────────────────────────────────────

export function normalizeDiscountCode(d: DiscountCodeApi): DiscountCode {
  return {
    id: d.id,
    code: d.code,
    type: d.type,
    value: d.value,
    usageLimit: d.usageLimit,
    usedCount: d.usedCount,
    remainingUses: d.remainingUses ?? d.usageLimit - d.usedCount,
    isActive: d.isActive,
    expiredAt: d.expiredAt ?? null,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt ?? null,
  };
}

export function normalizePaginatedDiscountCodes(
  data: PaginatedDiscountCodeResponseApi,
): PaginatedDiscountCodes {
  return {
    items: data.content.map(normalizeDiscountCode),
    currentPage: data.number, // Spring `number` = 0-based index
    totalPages: data.totalPages,
    totalElements: data.totalElements,
    pageSize: data.size,
    isFirst: data.first,
    isLast: data.last,
  };
}

// ─── Status helpers ───────────────────────────────────────────────────────────

/** Derive display status from a normalized DiscountCode.
 *
 * Priority order:
 * 1. EXPIRED  — expiredAt is set and in the past, regardless of isActive
 * 2. FULLY_USED — remainingUses === 0 (not expired)
 * 3. DISABLED  — manually deactivated but not expired
 * 4. ACTIVE   — all clear
 */
export function getDiscountStatus(d: DiscountCode): DiscountStatus {
  const now = new Date();
  if (d.expiredAt && new Date(d.expiredAt) <= now) return "EXPIRED";
  if (d.remainingUses === 0) return "FULLY_USED";
  if (!d.isActive) return "DISABLED";
  return "ACTIVE";
}

/**
 * Whether this discount can be hard-deleted.
 * Backend blocks DELETE if usedCount > 0 — mirror this guard on the frontend.
 */
export function isDiscountDeletable(d: DiscountCode): boolean {
  return d.usedCount === 0;
}

/** Returns ms until expiry, or null if no expiry / already expired. */
export function msUntilExpiry(d: DiscountCode): number | null {
  if (!d.expiredAt) return null;
  const ms = new Date(d.expiredAt).getTime() - Date.now();
  return ms > 0 ? ms : null;
}

// ─── List params ─────────────────────────────────────────────────────────────

export interface DiscountListParams {
  page?: number;
  size?: number;
  /** Maps to `?isActive=` query param. */
  isActive?: boolean;
  /** Maps to `?type=` query param — server-side filter. */
  type?: DiscountType;
  /** e.g. "createdAt,desc" or "code,asc" */
  sort?: string;
  keyword?: string;
}

// ─── Backward-compat aliases ─────────────────────────────────────────────────

/** @deprecated Use DiscountCodeApi */
export type RawDiscountCode = DiscountCodeApi;
/** @deprecated Use normalizeDiscountCode */
export const mapRawDiscount = normalizeDiscountCode;
/** @deprecated Use DiscountCodeCreateRequestApi */
export type CreateDiscountPayload = DiscountCodeCreateRequestApi;
/** @deprecated Use DiscountCodeUpdateRequestApi */
export type UpdateDiscountPayload = DiscountCodeUpdateRequestApi;
