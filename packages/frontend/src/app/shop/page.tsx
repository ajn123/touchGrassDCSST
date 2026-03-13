import ProductCard from "@/components/ProductCard";
import { ShopPageTracker } from "@/components/ShopPageTracker";
import { TouchGrassDynamoDB } from "@/lib/dynamodb/TouchGrassDynamoDB";
import type { Product } from "@/lib/shop-types";
import { redirect } from "next/navigation";
import { Resource } from "sst";

export const revalidate = 900;

export default async function ShopPage() {
  if (process.env.NEXT_PUBLIC_SHOP_ENABLED !== "true") {
    redirect("/");
  }

  const db = new TouchGrassDynamoDB(Resource.Db.name);
  const products = (await db.getProducts()) as Product[];

  // Sort: in-stock first, then pre-order, coming-soon, sold-out last
  const statusOrder: Record<string, number> = {
    "in-stock": 0,
    "pre-order": 1,
    "coming-soon": 2,
    "sold-out": 3,
  };
  products.sort(
    (a, b) => (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4)
  );

  return (
    <main className="min-h-screen">
      <ShopPageTracker action="SHOP_PAGE_VISIT" />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-2 text-center">Shop</h1>
        <p className="text-center mb-8 theme-text-secondary">
          DC-inspired gear and gadgets from TouchGrass DC
        </p>

        {products.length === 0 ? (
          <div className="text-center py-16">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <h2 className="text-xl font-semibold mb-2">
              Products coming soon
            </h2>
            <p className="theme-text-secondary">
              Check back shortly — we&apos;re stocking the shelves.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard key={product.pk} product={product} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
