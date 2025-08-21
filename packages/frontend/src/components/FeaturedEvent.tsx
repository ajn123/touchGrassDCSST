"use client";

import { resolveImageUrl } from "@/lib/image-utils";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Cost } from "./Cost";
import { DateDisplay } from "./Date";

interface Event {
  pk?: string;
  id?: string;
  title?: string;
  description?: string;
  date?: string | number;
  location?: string;
  venue?: string;
  image_url?: string;
  imageKey?: string;
  cost?: {
    type: string;
    currency?: string;
    amount?: string | number;
  };
  category?: string;
}

function EventImage({
  imageUrl,
  title,
  onLoad,
  onError,
}: {
  imageUrl: string;
  title?: string;
  onLoad: () => void;
  onError: () => void;
}) {
  return (
    <Image
      src={resolveImageUrl(imageUrl) || "/images/placeholder.jpg"}
      alt={title || "Event"}
      fill
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      className="object-cover"
      onLoad={onLoad}
      onError={onError}
    />
  );
}

function ImageLoadingFallback() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative overflow-hidden">
      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer"></div>

      {/* Loading spinner */}
      <div className="relative z-10 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-green-600 mx-auto mb-2"></div>
        <span className="text-gray-600 text-sm font-medium">Loading...</span>
      </div>
    </div>
  );
}

export default function FeaturedEvent({ event }: { event: Event }) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const eventId = event.pk || event.id;
  const eventTitle = event.title || "";

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  return (
    <Link
      href={`/items/${eventTitle}`}
      onClick={() => {
        fetch("/api/analytics/track", {
          method: "POST",
          body: JSON.stringify({
            event: "view_event",
            userId: "123",
            properties: { eventId },
          }),
        });
      }}
    >
      <div className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 hover:scale-105 transform h-full flex flex-col min-h-[400px]">
        <div className="relative h-48 flex-shrink-0">
          {event.image_url ? (
            <>
              {/* Actual image - always rendered */}
              <EventImage
                imageUrl={event.image_url}
                title={event.title}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />

              {/* Loading overlay */}
              {imageLoading && (
                <div className="absolute inset-0 z-10">
                  <ImageLoadingFallback />
                </div>
              )}

              {/* Error state */}
              {imageError && (
                <div className="absolute inset-0 z-10 bg-gray-200 flex items-center justify-center">
                  <div className="text-center">
                    <svg
                      className="w-8 h-8 text-gray-400 mx-auto mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="text-gray-500 text-sm">
                      Image unavailable
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <div className="text-center">
                <svg
                  className="w-8 h-8 text-gray-400 mx-auto mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-gray-500 text-sm">No image</span>
              </div>
            </div>
          )}
        </div>
        <div className="p-6 flex-1 flex flex-col">
          {event.date && (
            <div className="mb-2">
              <DateDisplay date={event.date} />
            </div>
          )}

          <h3 className="text-xl font-semibold mb-2 text-black line-clamp-2 min-h-[3rem]">
            {event.title}
          </h3>
          <p className="text-gray-600 mb-4 flex-1 line-clamp-2 min-h-[2.5rem]">
            {event.venue || event.location}
          </p>

          <div className="mt-auto">
            <Cost cost={event.cost} />
          </div>
        </div>
      </div>
    </Link>
  );
}
