import PreOrderButton from "@/components/PreOrderButton";
import { ShopPageTracker } from "@/components/ShopPageTracker";
import { TouchGrassDynamoDB } from "@/lib/dynamodb/TouchGrassDynamoDB";
import { resolveImageUrl, shouldBeUnoptimized } from "@/lib/image-utils";
import type { Product } from "@/lib/shop-types";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Resource } from "sst";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const db = new TouchGrassDynamoDB(Resource.Db.name);
  const product = (await db.getProductBySlug(slug)) as Product | null;

  if (!product) {
    return { title: "Product Not Found" };
  }

  const description = product.description
    ? product.description.substring(0, 160)
    : `${product.title} — available at TouchGrass DC Shop`;

  return {
    title: product.title,
    description,
    openGraph: {
      title: product.title,
      description,
      url: `https://touchgrassdc.com/shop/${product.slug}`,
      siteName: "TouchGrass DC",
      images: product.image_url ? [{ url: product.image_url }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      description,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const db = new TouchGrassDynamoDB(Resource.Db.name);
  const product = (await db.getProductBySlug(slug)) as Product | null;

  if (!product) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
          <p className="theme-text-secondary mb-6">
            This product doesn&apos;t exist or is no longer available.
          </p>
          <Link
            href="/shop"
            className="text-green-600 hover:text-green-700 font-medium"
          >
            Back to Shop
          </Link>
        </div>
      </main>
    );
  }

  const imageUrl = resolveImageUrl(
    product.image_url,
    product.category,
    product.title
  );

  return (
    <main className="min-h-screen">
      <ShopPageTracker action="PRODUCT_VIEW" productSlug={product.slug} />
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm theme-text-secondary">
          <Link href="/shop" className="hover:text-green-600">
            Shop
          </Link>
          <span className="mx-2">/</span>
          <span>{product.title}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
            <Image
              src={imageUrl}
              alt={product.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
              unoptimized={shouldBeUnoptimized(imageUrl)}
            />
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-1">
              {product.category}
            </span>
            <h1 className="text-3xl font-bold mb-4">{product.title}</h1>

            <div className="flex items-baseline gap-3 mb-4">
              <span className="text-2xl font-bold">
                ${product.price.toFixed(2)}
              </span>
              {product.compareAtPrice && (
                <span className="text-lg text-gray-400 line-through">
                  ${product.compareAtPrice.toFixed(2)}
                </span>
              )}
            </div>

            {product.preOrderEstimate && (
              <p className="text-sm text-yellow-700 bg-yellow-50 px-3 py-2 rounded-md mb-4">
                Estimated availability: {product.preOrderEstimate}
              </p>
            )}

            <p className="theme-text-secondary mb-6 leading-relaxed">
              {product.description}
            </p>

            {/* Features list */}
            {product.features && product.features.length > 0 && (
              <div className="mb-6">
                <h2 className="font-semibold mb-2">Features</h2>
                <ul className="space-y-1">
                  {product.features.map((feature, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 theme-text-secondary"
                    >
                      <svg
                        className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-auto">
              <PreOrderButton
                externalUrl={product.externalUrl}
                status={product.status}
                productSlug={product.slug}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
