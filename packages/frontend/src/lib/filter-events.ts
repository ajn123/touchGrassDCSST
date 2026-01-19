/**
 * Frontend filtering utilities for events
 * These functions filter events on the client side after fetching from DynamoDB
 */

import { Event } from "./dynamodb/TouchGrassDynamoDB";

export interface FilterOptions {
  query?: string;
  categories?: string[];
  costRange?: { min?: number; max?: number; type?: string };
  location?: string[];
  dateRange?: { start?: string; end?: string };
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  isPublic?: boolean;
  types?: string; // "event", "group", or "event,group"
}

/**
 * Filter events based on search query (title, description, category)
 */
function filterByQuery(events: Event[], query: string): Event[] {
  if (!query || !query.trim()) return events;

  const queryLower = query.toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/);

  return events.filter((event) => {
    const title = (event.title || "").toLowerCase();
    const description = (event.description || "").toLowerCase();
    const category = Array.isArray(event.category)
      ? event.category.join(" ").toLowerCase()
      : (event.category || "").toLowerCase();
    const location = (event.location || "").toLowerCase();
    const venue = (event.venue || "").toLowerCase();

    const searchableText = `${title} ${description} ${category} ${location} ${venue}`;

    // Check if all query words appear in the searchable text
    return queryWords.every((word) => searchableText.includes(word));
  });
}

/**
 * Filter events by categories
 * Handles categories that may be separated by comma or slash
 */
function filterByCategories(events: Event[], categories: string[]): Event[] {
  if (!categories || categories.length === 0) return events;

  return events.filter((event) => {
    // Extract all individual categories from the event, splitting by comma and slash
    let eventCategories: string[] = [];
    
    if (Array.isArray(event.category)) {
      eventCategories = event.category
        .flatMap((c) => c.split(/[,\/]/))
        .map((c) => c.toLowerCase().trim())
        .filter((c) => c.length > 0);
    } else if (event.category) {
      eventCategories = event.category
        .split(/[,\/]/)
        .map((c) => c.toLowerCase().trim())
        .filter((c) => c.length > 0);
    }

    // Check if any of the selected categories match any of the event's categories
    return categories.some((cat) =>
      eventCategories.some((ec) => ec === cat.toLowerCase().trim())
    );
  });
}

/**
 * Filter events by cost range
 */
function filterByCostRange(
  events: Event[],
  costRange: { min?: number; max?: number; type?: string }
): Event[] {
  if (!costRange || (costRange.min === undefined && costRange.max === undefined && !costRange.type))
    return events;

  return events.filter((event) => {
    const cost = event.cost;

    // Filter by cost type
    if (costRange.type && cost?.type !== costRange.type) {
      return false;
    }

    // Filter by cost amount
    if (costRange.min !== undefined || costRange.max !== undefined) {
      if (!cost || cost.type === "free") {
        return costRange.min === undefined || costRange.min === 0;
      }

      const amount =
        typeof cost.amount === "string"
          ? parseFloat(cost.amount)
          : cost.amount || 0;

      if (costRange.min !== undefined && amount < costRange.min) {
        return false;
      }
      if (costRange.max !== undefined && amount > costRange.max) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Filter events by location
 */
function filterByLocation(events: Event[], locations: string[]): Event[] {
  if (!locations || locations.length === 0) return events;

  return events.filter((event) => {
    const eventLocation = (event.location || "").toLowerCase();
    const eventVenue = (event.venue || "").toLowerCase();
    const searchableLocation = `${eventLocation} ${eventVenue}`;

    return locations.some((loc) =>
      searchableLocation.includes(loc.toLowerCase())
    );
  });
}

/**
 * Filter events by date range
 */
function filterByDateRange(
  events: Event[],
  dateRange: { start?: string; end?: string }
): Event[] {
  if (!dateRange || (!dateRange.start && !dateRange.end)) return events;

  return events.filter((event) => {
    const startDate = event.start_date;
    const endDate = event.end_date || event.start_date;

    if (!startDate && !endDate) {
      // If no date info, include it
      return true;
    }

    // Check if event overlaps with the date range
    if (dateRange.start && endDate && endDate < dateRange.start) {
      return false;
    }
    if (dateRange.end && startDate && startDate > dateRange.end) {
      return false;
    }

    return true;
  });
}

/**
 * Sort events
 */
function sortEvents(
  events: Event[],
  sortBy: string = "date",
  sortOrder: "asc" | "desc" = "asc"
): Event[] {
  const sorted = [...events];

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "date":
        const dateA = a.start_date || "";
        const dateB = b.start_date || "";
        comparison = dateA.localeCompare(dateB);
        break;

      case "title":
        const titleA = (a.title || "").toLowerCase();
        const titleB = (b.title || "").toLowerCase();
        comparison = titleA.localeCompare(titleB);
        break;

      case "created":
        const createdA = a.createdAt || 0;
        const createdB = b.createdAt || 0;
        comparison = createdA - createdB;
        break;

      default:
        comparison = 0;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  return sorted;
}

/**
 * Main filtering function that applies all filters
 */
export function filterEvents(
  events: Event[],
  filters: FilterOptions
): Event[] {
  let filtered = [...events];

  // Apply query filter
  if (filters.query) {
    filtered = filterByQuery(filtered, filters.query);
  }

  // Apply category filter
  if (filters.categories && filters.categories.length > 0) {
    filtered = filterByCategories(filtered, filters.categories);
  }

  // Apply cost range filter
  if (filters.costRange) {
    filtered = filterByCostRange(filtered, filters.costRange);
  }

  // Apply location filter
  if (filters.location && filters.location.length > 0) {
    filtered = filterByLocation(filtered, filters.location);
  }

  // Apply date range filter
  if (filters.dateRange) {
    filtered = filterByDateRange(filtered, filters.dateRange);
  }

  // Apply sorting
  if (filters.sortBy) {
    filtered = sortEvents(
      filtered,
      filters.sortBy,
      filters.sortOrder || "asc"
    );
  }

  // Apply limit
  if (filters.limit && filters.limit > 0) {
    filtered = filtered.slice(0, filters.limit);
  }

  return filtered;
}

/**
 * Get unique categories from events
 * Splits categories by comma and slash to create individual category entries
 */
export function getCategoriesFromEvents(events: Event[]): string[] {
  const categorySet = new Set<string>();

  events.forEach((event) => {
    if (Array.isArray(event.category)) {
      event.category.forEach((cat) => {
        if (cat && cat.trim()) {
          // Split by both comma and slash to handle "christmas/novelty" or "christmas,novelty"
          const splitCategories = cat
            .split(/[,\/]/)
            .map((c) => c.trim())
            .filter((c) => c.length > 0);
          splitCategories.forEach((c) => categorySet.add(c));
        }
      });
    } else if (event.category && event.category.trim()) {
      // Split by both comma and slash to handle "christmas/novelty" or "christmas,novelty"
      const splitCategories = event.category
        .split(/[,\/]/)
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
      splitCategories.forEach((c) => categorySet.add(c));
    }
  });

  return Array.from(categorySet).sort();
}

