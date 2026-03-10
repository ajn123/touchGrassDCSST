"use client";

import { useState } from "react";

interface DescriptionProps {
  description: string;
  className?: string;
  maxLength?: number;
  accentColor?: string;
}

export function Description({
  description,
  className = "",
  maxLength = 500,
  accentColor,
}: DescriptionProps) {
  const [expanded, setExpanded] = useState(false);

  if (!description || typeof description !== "string") {
    return null;
  }

  const needsTruncation = description.length > maxLength;
  const displayText =
    !expanded && needsTruncation
      ? `${description.slice(0, maxLength)}...`
      : description;

  return (
    <div className={`${className}`}>
      <p className="leading-relaxed whitespace-pre-wrap text-[var(--text-secondary)]">
        {displayText}
      </p>
      {needsTruncation && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-sm font-medium hover:underline"
          style={{ color: accentColor || "var(--text-accent, #10B981)" }}
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}
