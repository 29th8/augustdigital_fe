"use client";

import { RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RefundStatus } from "@/types/refund";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RefundFiltersProps {
  statusFilter: "all" | RefundStatus;
  onStatusFilterChange: (v: "all" | RefundStatus) => void;
  isFetching: boolean;
  onRefresh: () => void;
  onCreateNew: () => void;
}

// ─── Status options ───────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: "all" | RefundStatus; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "PENDING", label: "Chờ xử lý" },
  { value: "PROCESSED", label: "Đã hoàn tiền" },
  { value: "REJECTED", label: "Đã từ chối" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function RefundFilters({
  statusFilter,
  onStatusFilterChange,
  isFetching,
  onRefresh,
  onCreateNew,
}: RefundFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Select
        value={statusFilter}
        onValueChange={(v) => onStatusFilterChange(v as "all" | RefundStatus)}
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
        disabled={isFetching}
        className="w-full sm:w-auto"
      >
        <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} />
        Làm mới
      </Button>

      <Button
        size="sm"
        onClick={onCreateNew}
        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        Tạo hoàn tiền
      </Button>
    </div>
  );
}
