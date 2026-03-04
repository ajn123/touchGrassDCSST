"use client";

import type { Group } from "@/components/GroupsClient";

const ACTIVE_CATEGORIES = [
  "Running",
  "Sports",
  "Cycling",
  "Hiking",
  "Outdoors",
  "Climbing",
  "Fitness",
  "Yoga",
  "Frisbee",
];

const SOCIAL_CATEGORIES = [
  "Social",
  "Dating",
  "LGBTQ+",
  "Dance",
  "Arts",
  "Photography",
  "Book Club",
  "Board Games",
  "Trivia",
  "Education",
  "Volunteer",
];

interface StepInterestsProps {
  groups: Group[];
  selectedCategories: string[];
  onCategoriesChange: (cats: string[]) => void;
  onNext: () => void;
}

export default function StepInterests({
  groups,
  selectedCategories,
  onCategoriesChange,
  onNext,
}: StepInterestsProps) {
  // Count groups per category
  const categoryCounts = new Map<string, number>();
  for (const group of groups) {
    const cats = group.category.split(",").map((c) => c.trim()).filter(Boolean);
    for (const cat of cats) {
      categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
    }
  }

  // Only show categories that have at least 1 group
  const activeWithGroups = ACTIVE_CATEGORIES.filter((c) => categoryCounts.has(c));
  const socialWithGroups = SOCIAL_CATEGORIES.filter((c) => categoryCounts.has(c));

  const toggleCategory = (cat: string) => {
    if (selectedCategories.includes(cat)) {
      onCategoriesChange(selectedCategories.filter((c) => c !== cat));
    } else {
      onCategoriesChange([...selectedCategories, cat]);
    }
  };

  const renderButton = (cat: string) => {
    const isSelected = selectedCategories.includes(cat);
    const count = categoryCounts.get(cat) || 0;
    return (
      <button
        key={cat}
        onClick={() => toggleCategory(cat)}
        className={`px-4 py-3 rounded-lg text-sm font-medium transition-all border ${
          isSelected
            ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
            : "hover:border-emerald-400 hover:shadow-sm"
        }`}
        style={
          !isSelected
            ? {
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border-color, #d1d5db)",
                color: "var(--text-primary)",
              }
            : undefined
        }
      >
        {cat}
        <span
          className={`ml-2 text-xs ${
            isSelected ? "text-emerald-100" : ""
          }`}
          style={!isSelected ? { color: "var(--text-secondary)" } : undefined}
        >
          ({count})
        </span>
      </button>
    );
  };

  return (
    <div>
      {/* Active & Outdoors */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Active & Outdoors
        </h2>
        <div className="flex flex-wrap gap-3">
          {activeWithGroups.map(renderButton)}
        </div>
      </div>

      {/* Social & Cultural */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Social & Cultural
        </h2>
        <div className="flex flex-wrap gap-3">
          {socialWithGroups.map(renderButton)}
        </div>
      </div>

      {/* Next button */}
      <div className="flex justify-end mt-8">
        <button
          onClick={onNext}
          disabled={selectedCategories.length === 0}
          className={`px-8 py-3 rounded-lg font-semibold transition-all ${
            selectedCategories.length > 0
              ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-lg"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          Next
          <svg className="w-4 h-4 ml-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {selectedCategories.length === 0 && (
        <p className="text-center mt-4 text-sm" style={{ color: "var(--text-secondary)" }}>
          Select at least one interest to continue
        </p>
      )}
    </div>
  );
}
