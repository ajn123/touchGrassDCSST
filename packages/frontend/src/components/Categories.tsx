"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconSection } from "./IconSection";

interface Category {
  category: string;
}

interface CategoriesProps {
  categories?: Category[];
  selectedCategories?: string[];
  onCategoryChange?: (category: string) => void;
  displayMode?: "selection" | "display";
  eventCategories?: string | string[];
  disableLinks?: boolean;
}

export default function Categories({
  categories,
  selectedCategories = [],
  onCategoryChange,
  displayMode = "display",
  eventCategories,
  disableLinks = false,
}: CategoriesProps) {
  const router = useRouter();
  // Display mode for showing event categories
  if (displayMode === "display" && eventCategories) {
    return (
      <IconSection icon={<svg className="w-full h-full" fill="currentColor" viewBox="0 0 512 512"><path d="M345 39.1L472.8 168.4c52.4 53 52.4 138.2 0 191.2L360.8 472.9c-9.3 9.4-24.5 9.5-33.9 .2s-9.5-24.5-.2-33.9L438.6 325.9c33.9-34.3 33.9-89.4 0-123.7L310.9 72.9c-9.3-9.4-9.2-24.6 .2-33.9s24.6-9.2 33.9 .2zM0 229.5V80C0 53.5 21.5 32 48 32H197.5c17 0 33.3 6.7 45.3 18.7l168 168c25 25 25 65.5 0 90.5L277.3 442.7c-25 25-65.5 25-90.5 0l-168-168C6.7 262.7 0 246.5 0 229.5zM112 112a32 32 0 1 0 0 64 32 32 0 1 0 0-64z"/></svg>} className="py-2">
        {Array.isArray(eventCategories)
          ? eventCategories.map((cat: string, index: number) =>
              disableLinks ? (
                <span
                  key={index}
                  className="px-3 bg-green-100 dark:bg-emerald-900/30 text-green-800 dark:text-emerald-300 text-sm rounded-full font-medium border border-green-200 dark:border-emerald-700"
                >
                  {cat}
                </span>
              ) : (
                <button
                  key={index}
                  type="button"
                  onClick={() =>
                    router.push(
                      `/search?categories=${encodeURIComponent(
                        cat
                      )}&sortBy=date&sortOrder=asc`
                    )
                  }
                  className="px-3 bg-green-100 dark:bg-emerald-900/30 text-green-800 dark:text-emerald-300 text-sm rounded-full font-medium hover:bg-green-200 dark:hover:bg-emerald-800/40 transition-colors cursor-pointer border border-green-200 dark:border-emerald-700"
                >
                  {cat}
                </button>
              )
            )
          : eventCategories.split(",").map((cat: string, index: number) =>
              disableLinks ? (
                <span
                  key={index}
                  className="px-3 py-2 bg-green-100 dark:bg-emerald-900/30 text-green-800 dark:text-emerald-300 text-sm rounded-full font-medium border border-green-200 dark:border-emerald-700"
                >
                  {cat.trim()}
                </span>
              ) : (
                <button
                  key={index}
                  type="button"
                  onClick={() =>
                    router.push(
                      `/search?categories=${encodeURIComponent(
                        cat.trim()
                      )}&sortBy=date&sortOrder=asc`
                    )
                  }
                  className="px-3 py-2 bg-green-100 dark:bg-emerald-900/30 text-green-800 dark:text-emerald-300 text-sm rounded-full font-medium hover:bg-green-200 dark:hover:bg-emerald-800/40 transition-colors cursor-pointer border border-green-200 dark:border-emerald-700"
                >
                  {cat.trim()}
                </button>
              )
            )}
      </IconSection>
    );
  }

  // Selection mode for category selection (original functionality)
  return (
    <section className="max-w-7xl mx-auto px-4 py-16">
      <h2 className="text-4xl font-bold mb-8">Browse by Category</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {categories?.map((category: any) => (
          <div key={category.category}>
            {onCategoryChange ? (
              // Interactive selection mode
              <button
                onClick={() => onCategoryChange(category.category)}
                style={{
                  backgroundColor: selectedCategories.includes(
                    category.category
                  )
                    ? "#10b981"
                    : "white border border-gray-200 dark:border-gray-700",
                  borderColor: selectedCategories.includes(category.category)
                    ? "#11b981"
                    : "#d1d5db ",
                  color: selectedCategories.includes(category.category)
                    ? "white"
                    : "#374151 border border-gray-200 dark:border-gray-700",
                }}
                className="w-full rounded-xl shadow-md p-6 text-center cursor-pointer hover:shadow-lg transition-all transform hover:scale-105 duration-300 slow-transition border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60"
              >
                <h3 className="text-lg font-semibold">{category.category}</h3>
              </button>
            ) : (
              // Navigation mode (modified to go to search page with category)
              <Link
                href={`/search?categories=${encodeURIComponent(
                  category.category
                )}&sortBy=date&sortOrder=asc`}
                className="hover:text-blue-500"
                onClick={() => {}}
              >
                <div className="rounded-xl shadow-md p-6 text-center cursor-pointer hover:shadow-lg transition-all transform hover:scale-105 duration-300 slow-transition border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 hover:text-blue-500">
                    {category.category}
                  </h3>
                </div>
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
