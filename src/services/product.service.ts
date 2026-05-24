import apiClient from "./apiClient";
import { resolveImageUrl } from "@/lib/resolveImageUrl";
import { parseApiResponse } from "@/lib/parseApiResponse";
import { validateSafe } from "@/lib/validateSafe";
import { RawProductSchema, type RawProduct } from "@/schemas/product.schema";
import { PaginatedEnvelopeSchema } from "@/schemas/pagination.schema";
import type { ApiResponse, PaginatedData } from "@/types/api";
import type {
  Product,
  ProductListParams,
  CreateProductPayload,
  UpdateProductPayload,
} from "@/types/product";

// ─── Normalizer ───────────────────────────────────────────────────────────────
// Converts validated raw API shape (snake_case) to the UI Product type.
// Input is typed — the eslint-disable-any comment is no longer needed.
function normalizeProduct(raw: RawProduct): Product {
  // imageUrlSchema already coerces "" → null, so rawUrl is string | null
  const rawUrl = raw.image_url ?? raw.imageUrl ?? null;
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    category: raw.category_name ?? raw.category ?? "",
    categoryId: raw.category_id ?? raw.categoryId ?? undefined,
    imageUrl: resolveImageUrl(rawUrl) ?? undefined,
    // BE moved fulfillmentType to variant level — fall back to first variant if product level absent
    fulfillmentType:
      raw.fulfillment_type ??
      raw.fulfillmentType ??
      raw.variants[0]?.fulfillmentType ??
      undefined,
    variants: raw.variants,
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────
export const ProductService = {
  async getProducts(params: ProductListParams = {}, signal?: AbortSignal): Promise<PaginatedData<Product>> {
    const { page = 0, limit = 12, keyword, category_id, min_price, max_price, sort } = params;
    const res = await apiClient.get<ApiResponse<unknown>>("/api/v1/products", {
      params: {
        page,
        limit,
        ...(keyword && { keyword }),
        ...(category_id !== undefined && { category_id }),
        ...(min_price !== undefined && { min_price }),
        ...(max_price !== undefined && { max_price }),
        ...(sort && { sort }),
      },
      signal,
    });

    // Hard-validate the pagination envelope (structural).
    // items are left as unknown[] so one invalid item cannot fail the whole page.
    const rawPage = parseApiResponse(PaginatedEnvelopeSchema, res.data.data, "getProducts");

    // Soft-validate each item against business rules — invalid items are
    // warned (dev only) and filtered out rather than crashing the list.
    const items: Product[] = [];
    for (const rawItem of rawPage.items) {
      const valid = validateSafe(RawProductSchema, rawItem, "product");
      if (valid !== null) {
        items.push(normalizeProduct(valid));
      }
    }

    return { page_info: rawPage.page_info, items };
  },

  async getProductById(id: number, signal?: AbortSignal): Promise<Product> {
    const res = await apiClient.get<ApiResponse<unknown>>(`/api/v1/products/${id}`, { signal });
    const raw = parseApiResponse(RawProductSchema, res.data.data, "getProductById");
    return normalizeProduct(raw);
  },

  async createProduct(payload: CreateProductPayload): Promise<Product> {
    const body = {
      name: payload.name,
      description: payload.description,
      categoryId: Number(payload.categoryId),
      image_url: payload.imageUrl ?? null,
      fulfillment_type: payload.fulfillmentType ?? "INSTANT_DIRECT",
      variants: payload.variants.map((v) => ({
        name: v.name,
        price: Number(v.price),
        ...(v.costPrice != null && { cost_price: Number(v.costPrice) }),
      })),
    };
    const res = await apiClient.post<ApiResponse<unknown>>("/api/v1/admin/products", body);
    const raw = parseApiResponse(RawProductSchema, res.data.data, "createProduct");
    return normalizeProduct(raw);
  },

  async updateProduct(id: number, payload: UpdateProductPayload): Promise<Product> {
    const body = {
      ...(payload.name !== undefined && { name: payload.name }),
      ...(payload.description !== undefined && { description: payload.description }),
      ...(payload.categoryId !== undefined && { categoryId: Number(payload.categoryId) }),
      ...(payload.imageUrl !== undefined && { image_url: payload.imageUrl }),
      ...(payload.fulfillmentType !== undefined && { fulfillment_type: payload.fulfillmentType }),
      ...(payload.variants !== undefined && {
        variants: payload.variants.map((v) => ({
          ...(v.id !== undefined && { id: v.id }),
          name: v.name,
          price: Number(v.price),
          ...(v.costPrice != null && { cost_price: Number(v.costPrice) }),
          // BE reads fulfillmentType per-variant; propagate product-level value to all variants
          ...(payload.fulfillmentType !== undefined && { fulfillment_type: payload.fulfillmentType }),
        })),
      }),
    };
    console.log("[updateProduct] request body:", JSON.stringify(body, null, 2));
    const res = await apiClient.put<ApiResponse<unknown>>(`/api/v1/admin/products/${id}`, body);
    console.log("[updateProduct] response data:", JSON.stringify(res.data?.data, null, 2));
    // BE may return null data on update — fall back to re-fetching the product
    if (!res.data?.data) {
      return ProductService.getProductById(id);
    }
    const raw = parseApiResponse(RawProductSchema, res.data.data, "updateProduct");
    return normalizeProduct(raw);
  },

  async deleteProduct(id: number): Promise<void> {
    await apiClient.delete(`/api/v1/admin/products/${id}`);
  },
};
