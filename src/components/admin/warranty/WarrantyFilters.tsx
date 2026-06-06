"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WarrantyRequestStatus } from "@/types/warranty";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WarrantyStatusFilter = WarrantyRequestStatus | "all";

export interface WarrantyFiltersProps {
  status: WarrantyStatusFilter;
  onStatusChange: (status: WarrantyStatusFilter) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

// ─── Status options ───────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: WarrantyStatusFilter; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "OPEN", label: "Chờ xét duyệt" },
  { value: "IN_PROGRESS", label: "Đang xử lý" },
  { value: "RESOLVED", label: "Đã giải quyết" },
  { value: "PENDING_STOCK", label: "Chờ nhập kho" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function WarrantyFilters({
  status,
  onStatusChange,
  onRefresh,
  isRefreshing = false,
}: WarrantyFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Select
        value={status}
        onValueChange={(v) => onStatusChange(v as WarrantyStatusFilter)}
      >
        <SelectTrigger className="w-full sm:w-52 bg-white">
          <SelectValue placeholder="Lọc trạng thái" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="w-full sm:w-auto"
      >
        <RefreshCw
          className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`}
        />
        Làm mới
      </Button>
    </div>
  );
}
