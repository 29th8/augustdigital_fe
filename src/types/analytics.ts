export interface VariantProfit {
  variantId: number;
  variantName: string;
  revenue: number;
  cost: number;
  grossProfit: number;
  itemsSold: number;
}

export interface TopVariant {
  variantId: number;
  variantName: string;
  itemsSold: number;
  revenue: number;
}

export interface ProfitResponse {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  grossMarginPercent: number;
  ordersCount: number;
  itemsSold: number;
  byVariant: VariantProfit[];
}

export interface SummaryResponse {
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
  totalOrders: number;
  topVariants: TopVariant[];
}

export interface ProfitParams {
  from: string;  // yyyy-MM-dd
  to: string;    // yyyy-MM-dd
  variantId?: number;
}

export interface VariantOrderLine {
  orderCode: string;
  orderedAt: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  effectivePrice: number;
  revenue: number;
  cost: number;
  grossProfit: number;
}

export interface VariantOrderLinesParams {
  variantId: number;
  from: string;
  to: string;
}
