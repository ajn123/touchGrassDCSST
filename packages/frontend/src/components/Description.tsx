"use client";

interface DescriptionProps {
  description: string;
  className?: string;
  maxLength?: number;
}

export function Description({
  description,
  className = "",
  maxLength = 500,
}: DescriptionProps) {
  if (!description || typeof description !== "string") {
    return null;
  }

  const displayText =
    description.length > maxLength
      ? `${description.slice(0, maxLength)}...`
      : description;

  return (
    <div className={`space-y-3 ${className}`}>
      <h2 className="text-xl font-semibold mb-3">Description</h2>
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
          {displayText}
        </p>
      </div>
    </div>
  );
}
