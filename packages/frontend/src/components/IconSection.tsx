"use client";

import { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ReactNode } from "react";

interface IconSectionProps {
  icon: IconDefinition;
  iconClassName?: string;
  children: ReactNode;
  className?: string;
  iconSize?: "sm" | "md" | "lg";
}

export function IconSection({
  icon,
  iconClassName = "",
  children,
  className = "",
  iconSize = "sm",
}: IconSectionProps) {
  const getIconSizeClasses = () => {
    switch (iconSize) {
      case "sm":
        return "w-6 h-6";
      case "md":
        return "w-10 h-10";
      case "lg":
        return "w-12 h-12";
      default:
        return "w-10 h-10";
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <FontAwesomeIcon
          icon={icon}
          className={`inline-flex ${getIconSizeClasses()} items-center justify-center text-gray-800 ${iconClassName}`}
        />
        {children}
      </div>
    </div>
  );
}
