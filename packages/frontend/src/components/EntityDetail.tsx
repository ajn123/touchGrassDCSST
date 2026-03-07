"use client";

import Categories from "@/components/Categories";
import { Cost } from "@/components/Cost";
import { DateDisplay } from "@/components/Date";
import { Description } from "@/components/Description";
import { Location } from "@/components/Location";
import { Schedule } from "@/components/Schedule";
import { Socials } from "@/components/Socials";
import { CATEGORY_COLORS } from "@/lib/image-utils";
import { getCategoryAccent, getAccentTextColor } from "@/components/EventCard";
import { useThemeSafe } from "@/contexts/ThemeContext";
import { ReactNode } from "react";

interface EntityDetailProps {
  title: string;
  imageUrl?: string;
  cost?: string | { type: string; currency?: string; amount: string | number };
  socials?: Record<string, string>;
  date?: string | number | Date;
  location?: string;
  categories?: string | string[];
  schedules?: any[];
  description?: string;
  rightActionNode?: ReactNode;
  // New event-specific props
  category?: string;
  venue?: string;
  startTime?: string;
  endTime?: string;
  eventUrl?: string;
  shareNode?: ReactNode;
  reportNode?: ReactNode;
}

// Helper function to check if location is meaningful (not "UNKNOWN" or empty)
export function hasValidLocation(location: string | undefined): boolean {
  if (!location) return false;
  const lower = location.toLowerCase().trim();
  return !lower.includes("unknown") && lower.length > 0;
}

// Helper function to check if cost is valid
function hasValidCost(cost: any): boolean {
  if (!cost) return false;

  if (typeof cost === "string") {
    return cost.trim().length > 0;
  }

  if (typeof cost === "object") {
    return !!(cost.type || (cost.amount !== undefined && cost.amount !== null));
  }

  return false;
}

function isRealImage(url?: string): boolean {
  if (!url) return false;
  return (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("/images/")
  );
}

function formatCostDisplay(cost: any): { text: string; isFree: boolean } {
  if (!cost) return { text: "", isFree: false };
  if (typeof cost === "string") {
    const lower = cost.toLowerCase();
    return { text: cost, isFree: lower === "free" || lower === "$0" };
  }
  if (cost.type === "free") return { text: "Free", isFree: true };
  const amount = cost.amount ? `$${cost.amount}` : "";
  return { text: amount || cost.type || "", isFree: false };
}

function formatDateDisplay(date: string | number | Date): string {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return String(date);
  }
}

function formatTimeFromDate(date: string | number | Date): string {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    const hours = d.getHours();
    const minutes = d.getMinutes();
    if (hours === 0 && minutes === 0) return "";
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

function getSocialEntries(socials: Record<string, string>): { key: string; url: string }[] {
  return Object.entries(socials)
    .filter(([, value]) => value && typeof value === "string" && value.trim() !== "")
    .map(([key, url]) => ({ key, url }));
}

function getSocialLabel(key: string): string {
  const names: Record<string, string> = {
    website: "Website",
    instagram: "Instagram",
    facebook: "Facebook",
    twitter: "Twitter",
    youtube: "YouTube",
    linkedin: "LinkedIn",
    meetup: "Meetup",
    discord: "Discord",
  };
  return names[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

function SocialIcon({ type }: { type: string }) {
  switch (type) {
    case "instagram":
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      );
    case "facebook":
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case "twitter":
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "discord":
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      );
  }
}

export function EntityDetail({
  title,
  imageUrl,
  cost,
  socials,
  date,
  location,
  categories,
  schedules,
  description,
  rightActionNode,
  category,
  venue,
  startTime,
  endTime,
  eventUrl,
  shareNode,
  reportNode,
}: EntityDetailProps) {
  // Use new event layout when category is provided (event pages)
  // Fall back to legacy layout for groups (when schedules is provided without category)
  const isEventLayout = !!category;

  if (!isEventLayout) {
    return <LegacyLayout
      title={title}
      imageUrl={imageUrl}
      cost={cost}
      socials={socials}
      date={date}
      location={location}
      categories={categories}
      schedules={schedules}
      description={description}
      rightActionNode={rightActionNode}
    />;
  }

  const { isDark } = useThemeSafe();
  const accent = getCategoryAccent(category);
  const accentText = getAccentTextColor(accent, isDark);
  const categoryColors = CATEGORY_COLORS[category] ?? CATEGORY_COLORS["General"];
  const hasRealImage = isRealImage(imageUrl);
  const costInfo = formatCostDisplay(cost);
  const dateStr = date ? formatDateDisplay(date) : "";
  const timeStr = startTime || (date ? formatTimeFromDate(date) : "");
  const socialEntries = socials ? getSocialEntries(socials) : [];
  const websiteEntry = socialEntries.find((s) => s.key === "website");
  const otherSocials = socialEntries.filter((s) => s.key !== "website");
  const primaryUrl = eventUrl || websiteEntry?.url;
  const googleMapsUrl = location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
    : undefined;

  return (
    <div className="mb-10">
      {/* A. Hero Area */}
      {hasRealImage ? (
        <div className="mb-6">
          <div className="overflow-hidden rounded-xl">
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-48 md:max-h-[400px] md:h-auto object-cover"
            />
          </div>
          <div
            className="h-1 rounded-b-xl -mt-1"
            style={{ backgroundColor: accent }}
          />
        </div>
      ) : (
        <div className="mb-6">
          <div
            className="rounded-xl h-[200px] flex items-center justify-center relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${categoryColors.bgFrom}, ${categoryColors.bgTo})`,
            }}
          >
            {/* Decorative circles */}
            <div
              className="absolute rounded-full opacity-[0.08]"
              style={{
                width: 240,
                height: 240,
                right: 40,
                top: -40,
                backgroundColor: accent,
              }}
            />
            <div
              className="absolute rounded-full opacity-[0.05]"
              style={{
                width: 160,
                height: 160,
                right: 100,
                bottom: -20,
                backgroundColor: accent,
              }}
            />
            {/* Category badge */}
            <span
              className="text-sm font-bold tracking-wide text-white px-5 py-2 rounded-full uppercase"
              style={{ backgroundColor: `${accent}D9` }}
            >
              {category}
            </span>
          </div>
          <div
            className="h-1 rounded-b-xl -mt-1"
            style={{ backgroundColor: accent }}
          />
        </div>
      )}

      {/* B. Title + Actions Row */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h1>
            {category && (
              <div className="mt-2 flex flex-wrap gap-2">
                <span
                  className="text-sm font-semibold px-3 py-1.5 rounded-full border"
                  style={{
                    backgroundColor: `${accent}26`,
                    color: accentText,
                    borderColor: `${accent}40`,
                  }}
                >
                  {category}
                </span>
                {/* Show additional categories if present */}
                {Array.isArray(categories) &&
                  categories.slice(1).map((cat) => {
                    const catAccent = getCategoryAccent(cat);
                    const catAccentText = getAccentTextColor(catAccent, isDark);
                    return (
                      <span
                        key={cat}
                        className="text-sm font-semibold px-3 py-1.5 rounded-full border"
                        style={{
                          backgroundColor: `${catAccent}26`,
                          color: catAccentText,
                          borderColor: `${catAccent}40`,
                        }}
                      >
                        {cat}
                      </span>
                    );
                  })}
              </div>
            )}
          </div>
          {shareNode && <div className="flex-shrink-0">{shareNode}</div>}
        </div>
      </div>

      {/* C. Quick Info Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Date/Time Card */}
        {dateStr && (
          <div className="theme-bg-secondary border rounded-xl p-4" style={{ borderColor: 'var(--text-tertiary)' }}>
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ color: accentText }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{dateStr}</p>
                {timeStr && (
                  <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
                    {timeStr}
                    {endTime ? ` - ${endTime}` : ""}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Venue/Location Card */}
        {(venue || hasValidLocation(location)) && (
          <div className="theme-bg-secondary border rounded-xl p-4" style={{ borderColor: 'var(--text-tertiary)' }}>
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ color: accentText }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <div>
                {venue && (
                  <p className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{venue}</p>
                )}
                {hasValidLocation(location) && (
                  googleMapsUrl ? (
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base hover:underline"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {location}
                    </a>
                  ) : (
                    <p className="text-base" style={{ color: 'var(--text-secondary)' }}>{location}</p>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cost Card */}
        {hasValidCost(cost) && (
          <div className="theme-bg-secondary border rounded-xl p-4" style={{ borderColor: 'var(--text-tertiary)' }}>
            <div className="flex items-start gap-3">
              <svg
                className="w-6 h-6 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{ color: accentText }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p
                  className="text-lg font-semibold"
                  style={{ color: costInfo.isFree ? "#16A34A" : accentText }}
                >
                  {costInfo.text}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* D. Primary CTA + Social Links */}
      {(primaryUrl || otherSocials.length > 0) && (
        <div className="mb-6">
          {primaryUrl && (
            <a
              href={primaryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full md:w-auto px-6 py-3 rounded-xl text-white font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: accent }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {eventUrl ? "Get Tickets" : "Visit Website"}
            </a>
          )}
          {otherSocials.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {otherSocials.map(({ key, url }) => (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors theme-bg-secondary border"
                  style={{ color: 'var(--text-secondary)', borderColor: 'var(--text-tertiary)' }}
                >
                  <SocialIcon type={key} />
                  {getSocialLabel(key)}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* E. Description */}
      {description && (
        <div className="mb-6 max-w-3xl">
          <Description
            description={description}
            accentColor={accent}
          />
        </div>
      )}

      {/* F. Report Link */}
      {reportNode && (
        <div className="mb-6">
          {reportNode}
        </div>
      )}
    </div>
  );
}

/** Legacy 2-column layout for group pages */
function LegacyLayout({
  title,
  imageUrl,
  cost,
  socials,
  date,
  location,
  categories,
  schedules,
  description,
  rightActionNode,
}: Omit<EntityDetailProps, "category" | "venue" | "startTime" | "endTime" | "eventUrl" | "shareNode" | "reportNode">) {
  const hasLargeSchedule =
    Array.isArray(schedules) && schedules.length >= 3;

  return (
    <div className="border-t pt-6 mb-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{title}</h1>
        {rightActionNode}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-full rounded-lg shadow-md"
            />
          ) : (
            <div className="w-full h-64 rounded-lg flex items-center justify-center">
              <span>No image available</span>
            </div>
          )}

          {hasLargeSchedule && description && (
            <div className="mt-6">
              <Description description={description} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1">
          <div className="space-y-4">
            {hasValidCost(cost) && <Cost cost={cost} />}
            {socials && <Socials socials={socials} />}
            {date != null && <DateDisplay date={date} />}
            {hasValidLocation(location) && <Location location={location!} />}
            {categories && (
              <Categories displayMode="display" eventCategories={categories} />
            )}
            {Array.isArray(schedules) && schedules.length > 0 && (
              <Schedule schedules={schedules} />
            )}
          </div>
        </div>
      </div>

      {!hasLargeSchedule && (
        <>
          <hr className="my-6 border-t border-gray-800" />

          {description && (
            <div className="mb-6">
              <Description description={description} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
