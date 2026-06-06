'use client';

import { Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface DiscountEmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
  onCreateNew: () => void;
}

export function DiscountEmptyState({
  hasFilters,
  onClearFilters,
  onCreateNew,
}: DiscountEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-50">
        <Ticket className="h-12 w-12 text-gray-200" />
      </div>

      {hasFilters ? (
        <>
          <h3 className="mb-1 text-base font-semibold text-gray-900">
            Không tìm thấy mã nào khớp với bộ lọc.
          </h3>
          <p className="mb-5 max-w-xs text-sm text-gray-500">
            Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh bộ lọc để xem thêm kết quả.
          </p>
          <Button variant="outline" onClick={onClearFilters}>
            Xóa bộ lọc
          </Button>
        </>
      ) : (
        <>
          <h3 className="mb-1 text-base font-semibold text-gray-900">
            Chưa có mã giảm giá nào.
          </h3>
          <p className="mb-5 max-w-xs text-sm text-gray-500">
            Tạo mã giảm giá đầu tiên để bắt đầu khuyến mãi cho khách hàng.
          </p>
          <Button
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={onCreateNew}
          >
            Tạo mã đầu tiên
          </Button>
        </>
      )}
    </div>
  );
}
