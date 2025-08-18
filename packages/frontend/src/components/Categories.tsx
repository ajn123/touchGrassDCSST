import { faTags } from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
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
}

export default function Categories({
  categories,
  selectedCategories = [],
  onCategoryChange,
  displayMode = "display",
  eventCategories,
}: CategoriesProps) {
  // Display mode for showing event categories
  if (displayMode === "display" && eventCategories) {
    return (
      <IconSection icon={faTags} className="py-2">
        {Array.isArray(eventCategories)
          ? eventCategories.map((cat: string, index: number) => (
              <Link
                key={index}
                href={`/search?categories=${encodeURIComponent(
                  cat
                )}&sortBy=date&sortOrder=asc`}
              >
                <span className="px-3 bg-green-100 text-green-800 text-sm rounded-full font-medium hover:bg-green-200 transition-colors cursor-pointer">
                  {cat}
                </span>
              </Link>
            ))
          : eventCategories.split(",").map((cat: string, index: number) => (
              <Link
                key={index}
                href={`/search?categories=${encodeURIComponent(
                  cat.trim()
                )}&sortBy=date&sortOrder=asc`}
              >
                <span className="px-3 py-2 bg-green-100 text-green-800 text-sm rounded-full font-medium hover:bg-green-200 transition-colors cursor-pointer">
                  {cat.trim()}
                </span>
              </Link>
            ))}
      </IconSection>
    );
  }

  // Selection mode for category selection (original functionality)
  return (
    <section className="max-w-7xl mx-auto px-4 py-16">
      <h2 className="text-4xl font-bold mb-8 text-white">Browse by Category</h2>
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
                    : "white",
                  borderColor: selectedCategories.includes(category.category)
                    ? "#10b981"
                    : "#d1d5db",
                  color: selectedCategories.includes(category.category)
                    ? "white"
                    : "#374151",
                }}
                className="w-full bg-white rounded-lg shadow-md p-6 text-center cursor-pointer hover:shadow-lg transition-shadow transform hover:scale-105 duration-300 slow-transition"
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
              >
                <div className="bg-white rounded-lg shadow-md p-6 text-center cursor-pointer hover:shadow-lg transition-shadow transform hover:scale-105 duration-300 slow-transition">
                  <h3 className="text-lg font-semibold text-gray-800 hover:text-blue-500">
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
