export interface ProductVariant {
  id: number;
  name: string;
  price: number;
  costPrice?: number | null;
  /** null/undefined = BE didn't return stock info; 0 = confirmed out of stock */
  stock?: number | null;
  fulfillmentType?: FulfillmentType;
}

export type FulfillmentType = "INSTANT_DIRECT" | "INSTANT_SHARED";

export interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  categoryId?: number;
  imageUrl?: string;
  fulfillmentType?: FulfillmentType;
  variants: ProductVariant[];
}

export interface ProductListParams {
  page?: number;
  limit?: number;
  keyword?: string;
  category_id?: number;
  min_price?: number;
  max_price?: number;
  sort?: string;
}

export interface CreateVariantPayload {
  name: string;
  price: number;
  costPrice?: number | null;
}

export interface UpdateVariantPayload {
  id?: number; // present for existing variants, absent for new ones
  name: string;
  price: number;
  costPrice?: number | null;
}

export interface CreateProductPayload {
  name: string;
  categoryId: number;
  description: string;
  variants: CreateVariantPayload[];
  imageUrl?: string;
  fulfillmentType?: FulfillmentType;
}

export interface UpdateProductPayload {
  name?: string;
  categoryId?: number;
  description?: string;
  variants?: UpdateVariantPayload[];
  imageUrl?: string;
  fulfillmentType?: FulfillmentType;
}
