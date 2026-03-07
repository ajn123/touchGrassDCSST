"use client";

import { resolveImageUrl, shouldBeUnoptimized } from "@/lib/image-utils";
import { useThemeSafe } from "@/contexts/ThemeContext";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

/**
 * Category → accent color mapping for vibrant, category-specific card styling.
 * Covers both event categories and group categories.
 */
const CATEGORY_ACCENT: Record<string, string> = {
  // Event categories
  "Arts & Culture": "#E11D48",
  Comedy: "#F59E0B",
  Community: "#2563EB",
  Education: "#6366F1",
  Festival: "#D97706",
  "Food & Drink": "#EA580C",
  General: "#64748B",
  Music: "#8B5CF6",
  Networking: "#0D9488",
  Nightlife: "#7C3AED",
  "Outdoors & Recreation": "#16A34A",
  Sports: "#059669",
  Theater: "#DC2626",
  // Group categories
  Running: "#EF4444",
  Social: "#3B82F6",
  Outdoors: "#22C55E",
  Hiking: "#15803D",
  Cycling: "#06B6D4",
  Dating: "#EC4899",
  "LGBTQ+": "#A855F7",
  Dance: "#F472B6",
  Photography: "#78716C",
  Arts: "#E11D48",
  "Book Club": "#B45309",
  "Board Games": "#8B5CF6",
  Climbing: "#059669",
  Fitness: "#EF4444",
  Yoga: "#14B8A6",
  Trivia: "#F59E0B",
  Volunteer: "#10B981",
};

function getCategoryAccent(category?: string | string[]): string {
  if (!category) return "#10B981";
  const primary = Array.isArray(category) ? category[0] : category;
  return CATEGORY_ACCENT[primary] || "#10B981";
}

/**
 * Darker version of accent colors for use as text on light backgrounds.
 * Only overrides colors that have poor contrast on white.
 */
const ACCENT_TEXT_OVERRIDE: Record<string, string> = {
  "#F59E0B": "#92400E", // amber-800 (Comedy, Trivia)
  "#D97706": "#92400E", // amber-800 (Festival)
  "#22C55E": "#166534", // green-800 (Outdoors)
  "#10B981": "#065F46", // emerald-800 (default/Volunteer)
  "#14B8A6": "#115E59", // teal-800 (Yoga)
  "#06B6D4": "#155E75", // cyan-800 (Cycling)
  "#F472B6": "#9D174D", // pink-800 (Dance)
};

function getAccentTextColor(accent: string, isDark: boolean): string {
  if (isDark) return accent;
  return ACCENT_TEXT_OVERRIDE[accent] || accent;
}

export interface EventCardProps {
  href: string;
  title: string;
  imageUrl?: string | null;
  category?: string | string[];
  venue?: string;
  /** Formatted date/time string to display */
  date?: string;
  /** Short description or secondary text */
  description?: string;
  /** Badge in top-right corner (e.g. "65% match", "Free") */
  badge?: string;
  /** Small tags at the bottom of the card */
  tags?: string[];
  /** Custom bottom content (e.g. Cost component) */
  children?: React.ReactNode;
}

export default function EventCard({
  href,
  title,
  imageUrl,
  category,
  venue,
  date,
  description,
  badge,
  tags,
  children,
}: EventCardProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const { isDark } = useThemeSafe();

  const accent = getCategoryAccent(category);
  const accentText = getAccentTextColor(accent, isDark);
  const primaryCategory = Array.isArray(category) ? category[0] : category;
  const resolvedUrl = resolveImageUrl(
    imageUrl || "",
    primaryCategory,
    title,
    venue
  );

  return (
    <Link href={href} className="group block h-full">
      <div
        className="rounded-xl overflow-hidden h-full flex flex-col shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02] transform"
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderTop: `3px solid ${accent}`,
          boxShadow: `0 1px 3px 0 rgba(0,0,0,0.1)`,
        }}
      >
        {/* Image */}
        <div className="relative h-28 sm:h-44 flex-shrink-0 overflow-hidden">
          {!imageError ? (
            <Image
              src={resolvedUrl}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
              unoptimized={shouldBeUnoptimized(resolvedUrl)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}

          {/* Loading shimmer */}
          {imageLoading && imageUrl && (
            <div className="absolute inset-0 z-10 animate-pulse" style={{ backgroundColor: 'var(--bg-secondary)' }} />
          )}

          {/* Gradient overlay at bottom of image */}
          <div
            className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
            style={{
              background: `linear-gradient(transparent, ${accent}15)`,
            }}
          />


          {/* Optional badge (top-right) */}
          {badge && (
            <span
              className="absolute top-2.5 right-2.5 text-xs font-bold px-3 py-1 rounded-full text-white shadow-lg"
              style={{ backgroundColor: accent }}
            >
              {badge}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 flex-1 flex flex-col gap-1 sm:gap-1.5 text-center">
          <h3 className="text-sm sm:text-base font-semibold line-clamp-2 leading-snug group-hover:opacity-80 transition-colors" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h3>

          {date && (
            <p className="text-sm font-medium" style={{ color: accentText }}>
              {date}
            </p>
          )}

          {description && (
            <p className="text-sm line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
              {description}
            </p>
          )}

          {venue && (
            <p className="text-sm truncate mt-auto" style={{ color: 'var(--text-secondary)' }}>
              {venue}
            </p>
          )}

          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.map((tag, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    backgroundColor: `${accent}15`,
                    color: accentText,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Custom bottom content */}
          {children && <div className="mt-auto pt-2">{children}</div>}
        </div>
      </div>
    </Link>
  );
}

export { getCategoryAccent, getAccentTextColor, CATEGORY_ACCENT, ACCENT_TEXT_OVERRIDE };
