export interface Product {
  pk: string; // "PRODUCT#metro-arrival-display"
  sk: string; // "PRODUCT#metro-arrival-display"
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  price: number; // USD
  compareAtPrice?: number;
  image_url: string;
  category: string; // "Hardware" | "Apparel" | "Prints"
  status: "pre-order" | "in-stock" | "sold-out" | "coming-soon";
  preOrderEstimate?: string;
  externalUrl: string; // Gumroad checkout link
  features?: string[];
  isPublic: string; // "true"
  createdAt: number;
  updatedAt: number;
}
