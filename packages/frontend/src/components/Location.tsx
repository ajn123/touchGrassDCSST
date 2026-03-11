"use client";

import { IconSection } from "./IconSection";

const MapPinIcon = <svg className="w-full h-full" fill="currentColor" viewBox="0 0 384 512"><path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/></svg>;

interface LocationProps {
  location: string;
  className?: string;
}

export function Location({ location, className = "" }: LocationProps) {
  if (!location || location.trim() === "") {
    return null;
  }

  return (
    <IconSection
      icon={MapPinIcon}
      iconClassName="text-red-600"
      className={`my-4 ${className}`}
    >
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline"
      >
        {location}
      </a>
    </IconSection>
  );
}
