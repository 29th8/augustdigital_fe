// ─── Primitives ───────────────────────────────────────────────────────────────

export type UserRole = "CUSTOMER" | "ADMIN";

// ─── API shapes (camelCase — matches actual Jackson/Spring Boot JSON) ──────────

/**
 * Raw user object returned by the backend.
 * Note: Java boolean field `active` is NOT `isActive`.
 */
export interface UserApi {
  id: number;
  email: string;
  role: UserRole;
  /** Java bean convention — field name is `active`, NOT `isActive`. */
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Spring Boot Page<User> envelope.
 * `number` = 0-based current page index.
 */
export interface PaginatedUserResponseApi {
  content: UserApi[];
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

// ─── Frontend shapes (camelCase) ──────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  role: UserRole;
  /** Normalized from API `active` field. */
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedUsers {
  items: User[];
  /** 0-based — add 1 when displaying to users. */
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
  isFirst?: boolean;
  isLast?: boolean;
}

// ─── List params ──────────────────────────────────────────────────────────────

export interface UserListParams {
  page?: number;
  size?: number;
  keyword?: string;
  /** Maps to `?active=` query param. */
  active?: boolean;
}

// ─── Normalizers ──────────────────────────────────────────────────────────────

export function normalizeUser(u: UserApi): User {
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    isActive: u.active,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

export function normalizePaginatedUsers(data: PaginatedUserResponseApi): PaginatedUsers {
  return {
    items: data.content.map(normalizeUser),
    currentPage: data.number, // Spring `number` = 0-based index
    totalPages: data.totalPages,
    totalElements: data.totalElements,
    pageSize: data.size,
    isFirst: data.first,
    isLast: data.last,
  };
}
