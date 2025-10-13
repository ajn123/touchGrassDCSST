"use client";

import Categories from "@/components/Categories";
import { Socials } from "@/components/Socials";
import { resolveImageUrl } from "@/lib/image-utils";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export interface Group {
  pk: string;
  sk: string;
  title: string;
  description?: string;
  category: string;
  isPublic: string;
  location?: string;
  scheduleDay?: string;
  scheduleTime?: string;
  scheduleLocation?: string;
  cost?: string;
  image_url?: string;
  schedules?: any[];
  socials?: {
    website?: string;
    instagram?: string;
    facebook?: string;
    twitter?: string;
    youtube?: string;
    linkedin?: string;
    meetup?: string;
  };
  createdAt: number;
}

export default function GroupsClient({ groups }: { groups: Group[] }) {
  const [filteredGroups, setFilteredGroups] = useState<Group[]>(groups);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  useEffect(() => {
    let filtered = groups;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (group) =>
          group.title.toLowerCase().includes(q) ||
          (group.description && group.description.toLowerCase().includes(q)) ||
          (group.location && group.location.toLowerCase().includes(q))
      );
    }

    if (selectedCategory) {
      const cat = selectedCategory.toLowerCase();
      filtered = filtered.filter((group) =>
        group.category.toLowerCase().includes(cat)
      );
    }

    setFilteredGroups(filtered);
  }, [groups, searchQuery, selectedCategory]);

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        groups
          .flatMap((group) => group.category.split(","))
          .map((cat) => cat.trim())
          .filter((cat) => cat && cat !== "Uncategorized")
      )
    ).sort();
  }, [groups]);

  return (
    <div className="min-h-screen ">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Groups</h1>
          <p className="text-lg">Discover and join groups in the DC area</p>
        </div>

        <div className="rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="search"
                className="block text-sm font-medium mb-2"
              >
                Search Groups
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  id="search"
                  className="block w-full pl-10 pr-3 py-2 border rounded-md leading-5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search by name, description, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="category"
                className="block text-sm font-medium mb-2"
              >
                Filter by Category
              </label>
              <select
                id="category"
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 text-sm">
            Showing {filteredGroups.length} of {groups.length} groups
          </div>
        </div>

        {filteredGroups.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-lg mb-4">
              {searchQuery || selectedCategory
                ? "No groups found matching your criteria"
                : "No groups available at the moment"}
            </div>
            {(searchQuery || selectedCategory) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("");
                }}
                className="font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group) => (
              <div
                key={group.pk}
                className="rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden border border-gray-200 dark:border-gray-700"
              >
                <Link
                  href={`/groups/${encodeURIComponent(group.title)}`}
                  className="block"
                >
                  <div className="aspect-w-16 aspect-h-9 cursor-pointer">
                    {group.image_url ? (
                      <img
                        src={
                          resolveImageUrl(group.image_url) ||
                          "/images/placeholder.jpg"
                        }
                        alt={group.title}
                        className="w-full h-48 object-cover hover:opacity-90 transition-opacity"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors">
                        <span>No image</span>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <h3 className="text-xl font-semibold mb-2 line-clamp-2 transition-colors cursor-pointer">
                      {group.title}
                    </h3>

                    {group.description && (
                      <p className="mb-4 line-clamp-3">{group.description}</p>
                    )}

                    {group.category && (
                      <div className="mb-4">
                        <Categories
                          displayMode="display"
                          eventCategories={group.category}
                        />
                      </div>
                    )}

                    {(group.scheduleDay || group.scheduleTime) && (
                      <div className="mb-4">
                        <div className="flex items-center text-sm">
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                          {group.scheduleDay && group.scheduleTime
                            ? `${group.scheduleDay} at ${group.scheduleTime}`
                            : group.scheduleDay || group.scheduleTime}
                        </div>
                      </div>
                    )}

                    {group.location && (
                      <div className="mb-4">
                        <div className="flex items-center text-sm">
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          {group.location}
                        </div>
                      </div>
                    )}

                    {group.cost && (
                      <div className="mb-4">
                        <div className="flex items-center text-sm">
                          <svg
                            className="w-4 h-4 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                            />
                          </svg>
                          {group.cost}
                        </div>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Socials outside the Link to avoid nested <a> tags */}
                {group.socials && (
                  <div className="px-6 pb-6">
                    <Socials socials={group.socials} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
