"use client";

import { resolveImageUrl } from "@/lib/image-utils";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

interface Group {
  pk?: string;
  title?: string;
  description?: string;
  category?: string | string[];
  image_url?: string;
  isPublic?: string;
  cost?: string;
  schedules?: Array<{
    days: string[];
    recurrence_type: string;
    time: string;
    location: string;
  }>;
  socials?: {
    website?: string;
    instagram?: string;
    facebook?: string;
    twitter?: string;
    youtube?: string;
    linkedin?: string;
    meetup?: string;
    discord?: string;
  };
  createdAt?: number;
}

interface Schedule {
  pk?: string;
  sk?: string;
  title?: string;
  category?: string;
  isPublic?: string;
  scheduleDay?: string;
  scheduleTime?: string;
  scheduleLocation?: string;
  createdAt?: number;
}

interface GroupDetailProps {
  group: Group;
}

function GroupImage({ imageUrl, title }: { imageUrl: string; title?: string }) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = () => setImageLoading(false);
  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  return (
    <div className="relative w-full h-64 md:h-80 lg:h-96">
      {imageUrl ? (
        <>
          <Image
            src={resolveImageUrl(imageUrl) || ""}
            alt={title || "Group"}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
            className="object-cover rounded-lg"
            onLoad={handleImageLoad}
            onError={handleImageError}
            unoptimized={imageUrl.startsWith('http://') || imageUrl.startsWith('https://')}
          />
          {imageLoading && (
            <div className="absolute inset-0 bg-gray-200 rounded-lg flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-green-600"></div>
            </div>
          )}
          {imageError && (
            <div className="absolute inset-0 bg-gray-200 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <svg
                  className="w-12 h-12 text-gray-400 mx-auto mb-2"
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
                <span className="text-gray-500">Image unavailable</span>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto mb-2"
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
            <span className="text-gray-500">No image</span>
          </div>
        </div>
      )}
    </div>
  );
}

function formatCategories(categories: string | string[] | undefined) {
  if (!categories) return "Uncategorized";
  if (Array.isArray(categories)) {
    return categories.join(", ");
  }
  if (categories.trim() === "") return "Uncategorized";
  return categories;
}

function formatDate(timestamp: number | undefined) {
  if (!timestamp) return "Unknown";
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function ScheduleCard({
  schedule,
}: {
  schedule: {
    days: string[];
    recurrence_type: string;
    time: string;
    location: string;
  };
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-green-100 p-2 rounded-full">
            <svg
              className="w-5 h-5 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-lg text-gray-900">
              {schedule.days.join(", ")}
            </h4>
            <p className="text-sm text-gray-600">{schedule.time}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
            {schedule.recurrence_type}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2 text-gray-700">
        <svg
          className="w-4 h-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <span className="text-sm">
          {schedule.location && schedule.location.trim() !== ""
            ? schedule.location
            : "Check website for exact location"}
        </span>
      </div>
    </div>
  );
}

export default function GroupDetail({ group }: GroupDetailProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center text-green-600 hover:text-green-800 transition-colors"
        >
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Home
        </Link>
      </div>

      {/* Group Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Image Section */}
          <div className="lg:w-1/2">
            <GroupImage imageUrl={group.image_url || ""} title={group.title} />
          </div>

          {/* Group Info Section */}
          <div className="lg:w-1/2 space-y-6">
            {/* Title and Categories */}
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-3">
                {group.title}
              </h1>
              <div className="flex flex-wrap gap-2">
                <span className="inline-block bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full font-medium">
                  {formatCategories(group.category)}
                </span>
                {group.isPublic === "true" ? (
                  <span className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full font-medium">
                    Public
                  </span>
                ) : (
                  <span className="inline-block bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full font-medium">
                    Private
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {group.description && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  About
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {group.description}
                </p>
              </div>
            )}

            {/* Created Date */}
            <div className="text-sm text-gray-500">
              Created: {formatDate(group.createdAt)}
            </div>
          </div>
        </div>
      </div>

      {/* Schedules Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Meeting Schedule
        </h2>

        {group.schedules && group.schedules.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {group.schedules.map((schedule, index) => (
              <ScheduleCard
                key={`${schedule.days.join("-")}-${schedule.time}-${index}`}
                schedule={schedule}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No schedules available
            </h3>
            <p className="text-gray-500">
              This group doesn't have any scheduled meetings yet.
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="border-t pt-8">
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium">
            Join Group
          </button>
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
            Contact Organizer
          </button>
          <button className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium">
            Share Group
          </button>
        </div>
      </div>
    </div>
  );
}
