"use client";

import Categories from "@/components/Categories";
import { resolveImageUrl } from "@/lib/image-utils";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

interface Group {
  pk?: string;
  title?: string;
  description?: string;
  category?: string;
  image_url?: string;
  imageKey?: string;
  scheduleDay?: string;
  scheduleTime?: string;
  scheduleLocation?: string;
  cost?: string;
  schedules?: any[];
  socials?: {
    website?: string;
    instagram?: string;
    facebook?: string;
    twitter?: string;
    youtube?: string;
    linkedin?: string;
    meetup?: string;
  };
}

function GroupImage({
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
  const resolvedUrl = resolveImageUrl(imageUrl) || "/images/placeholder.jpg";
  // Use unoptimized for external images to avoid 404 errors in Next.js image optimization
  const isExternal = resolvedUrl.startsWith('http://') || resolvedUrl.startsWith('https://');
  
  return (
    <Image
      src={resolvedUrl}
      alt={title || "Group"}
      fill
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      className="object-cover"
      onLoad={onLoad}
      onError={onError}
      unoptimized={isExternal}
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

export default function FeaturedGroup({ group }: { group: Group }) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const groupTitle = group.title || "";

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  // Format schedule information
  const formatSchedule = () => {
    if (group.scheduleDay && group.scheduleTime && group.scheduleLocation) {
      return `${group.scheduleDay}s at ${group.scheduleTime} - ${group.scheduleLocation}`;
    }
    return "Schedule varies";
  };

  return (
    <Link href={`/groups/${encodeURIComponent(groupTitle)}`}>
      <div className="bg-white rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 hover:scale-105 transform h-full flex flex-col min-h-[400px] border border-black">
        <div className="relative h-48 flex-shrink-0">
          {group.image_url ? (
            <>
              {/* Actual image - always rendered */}
              <GroupImage
                imageUrl={group.image_url}
                title={group.title}
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
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
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
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                  />
                </svg>
                <span className="text-gray-500 text-sm">No image</span>
              </div>
            </div>
          )}
        </div>
        <div className="p-6 flex-1 flex flex-col">
          {/* Categories */}
          <div className="mb-2">
            {group.category ? (
              <Categories
                displayMode="display"
                eventCategories={group.category}
                disableLinks={true}
              />
            ) : (
              <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                Uncategorized
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold mb-2 text-black line-clamp-2 min-h-[3rem]">
            {group.title}
          </h3>

          {/* Description */}
          {group.description && (
            <p className="text-gray-600 mb-4 flex-1 line-clamp-2 min-h-[2.5rem]">
              {group.description}
            </p>
          )}

          {/* Schedule Information */}
          <div className="mt-auto">
            <div className="flex items-center text-sm text-gray-600">
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="line-clamp-1">{formatSchedule()}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
