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
      <p className="text-gray-700">{location}</p>
    </IconSection>
  );
}
