export type ItemKind = 'PRODUCT' | 'SERVICE';

export interface SearchableItem {
  id: string;
  kind: ItemKind;
  name: string;
  description: string;
  category: string;
  price: number; // pesos colombianos, entero
  imageUrl: string | null;
}