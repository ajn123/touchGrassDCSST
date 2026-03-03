"use client";

import { resolveImageUrl, shouldBeUnoptimized } from "@/lib/image-utils";
import type { Product } from "@/lib/shop-types";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const statusBadge: Record<Product["status"], { label: string; className: string }> = {
  "pre-order": {
    label: "Pre-Order",
    className: "bg-yellow-100 text-yellow-800",
  },
  "in-stock": {
    label: "In Stock",
    className: "bg-green-100 text-green-800",
  },
  "sold-out": {
    label: "Sold Out",
    className: "bg-red-100 text-red-800",
  },
  "coming-soon": {
    label: "Coming Soon",
    className: "bg-blue-100 text-blue-800",
  },
};

export default function ProductCard({ product }: { product: Product }) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const badge = statusBadge[product.status];
  const imageUrl = resolveImageUrl(product.image_url, product.category, product.title);

  return (
    <Link href={`/shop/${product.slug}`}>
      <div className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 hover:scale-105 transform h-full flex flex-col">
        <div className="relative h-48 flex-shrink-0">
          {!imageError ? (
            <Image
              src={imageUrl}
              alt={product.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover"
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
              unoptimized={shouldBeUnoptimized(imageUrl)}
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
            </div>
          )}
          {imageLoading && !imageError && (
            <div className="absolute inset-0 bg-gray-100 animate-pulse" />
          )}
          <div className="absolute top-2 right-2">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>
        </div>

        <div className="p-6 flex-1 flex flex-col">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
            {product.category}
          </span>
          <h3 className="text-xl font-semibold mb-2 text-black line-clamp-2 min-h-[3rem]">
            {product.title}
          </h3>
          <p className="text-gray-600 mb-4 flex-1 line-clamp-2 min-h-[2.5rem]">
            {product.shortDescription}
          </p>
          <div className="mt-auto flex items-baseline gap-2">
            <span className="text-lg font-bold text-gray-900">
              ${product.price.toFixed(2)}
            </span>
            {product.compareAtPrice && (
              <span className="text-sm text-gray-400 line-through">
                ${product.compareAtPrice.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
