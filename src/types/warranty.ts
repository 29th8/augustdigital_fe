export type WarrantyRequestStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "PENDING_STOCK";

export interface WarrantyLog {
  id: number;
  adminId: number | null;
  action: string;
  createdAt: string;
}

export interface WarrantyClaim {
  id: number;
  orderItemId: number;
  productName: string | null;
  variantName: string | null;
  orderCode: string | null;
  userId: number | null;
  userEmail: string;
  description: string;
  status: WarrantyRequestStatus;
  logs: WarrantyLog[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedWarrantyClaims {
  items: WarrantyClaim[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
}

export interface SubmitWarrantyPayload {
  order_item_id: number;
  description: string;
  user_email?: string;
}

export interface ResolveWarrantyPayload {
  notes?: string;
}

export interface WarrantyListParams {
  page?: number;
  size?: number;
  status?: WarrantyRequestStatus | "all";
}
