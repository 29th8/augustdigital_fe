export type RefundStatus = "PENDING" | "PROCESSED" | "REJECTED";

export interface Refund {
  id: number;
  orderId: number;
  orderCode: string;
  amount: number;
  reason: string;
  status: RefundStatus;
  adminId: number | null;
  notes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedRefunds {
  items: Refund[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
}

export interface CreateRefundPayload {
  orderId: number;
  amount: number;
  reason: string;
}

export interface UserCreateRefundPayload {
  orderId: number;
  reason: string;
}

export interface ProcessRefundPayload {
  status: "PROCESSED" | "REJECTED";
  notes?: string;
}

export interface RefundListParams {
  page?: number;
  size?: number;
  status?: RefundStatus | "all";
}
