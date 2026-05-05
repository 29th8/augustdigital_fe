export type InventoryItemType = "KEY" | "ACCOUNT";

export interface VariantStockStats {
  variantId: number;
  variantName: string;
  available: number;
  sold: number;
  total: number;
}

export interface ImportInventoryPayload {
  variantId: number;
  type: InventoryItemType;
  keys: string[];
}

export interface FileImportResult {
  imported: number;
  skipped: number;
  totalRows: number;
}
