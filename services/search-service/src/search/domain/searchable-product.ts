export interface SearchableProduct {
  productId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  imageUrl?: string;
  isActive: boolean;
}
