export interface CartItem {
  variantId: number;
  productId: number;
  productName: string;
  variantName: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Cart {
  items: CartItem[];
  totalAmount: number;
}
