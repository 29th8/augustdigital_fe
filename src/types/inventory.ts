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

export interface ImportInventoryResult {
  inventoryItemIds: number[];
  imported: number;
}

export interface ProfileInput {
  profile_name: string;
  pin_code: string | null;
  max_slots: number;
}

export interface ImportProfilesPayload {
  inventory_item_id: number;
  profiles: ProfileInput[];
}

export type InventoryItemStatus = "AVAILABLE" | "IN_USE" | "SOLD" | "REVOKED";
export type ProfileStatus = "AVAILABLE" | "ASSIGNED" | "IN_USE";

export interface AccountProfile {
  id: number;
  profileName: string;
  pinCode: string | null;
  maxSlots: number;
  assignedSlots: number;
  status: ProfileStatus;
}

export interface InventoryItemDetail {
  id: number;
  type: InventoryItemType;
  value: string | null;
  status: InventoryItemStatus;
  profileCount: number;
  usedSlots: number;
  profiles: AccountProfile[];
}
