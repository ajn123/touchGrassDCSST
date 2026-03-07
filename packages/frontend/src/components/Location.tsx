"use client";

import { faMapMarkerAlt } from "@fortawesome/free-solid-svg-icons";
import { IconSection } from "./IconSection";

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
      icon={faMapMarkerAlt}
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
