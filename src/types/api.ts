export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  code: number;
  message: string;
  errors?: FieldError[];
}

export interface FieldError {
  field: string;
  message: string;
}

export interface PageInfo {
  total_elements: number;
  total_pages: number;
  current_page: number;
  page_size: number;
}

export interface PaginatedData<T> {
  items: T[];
  page_info: PageInfo;
}
