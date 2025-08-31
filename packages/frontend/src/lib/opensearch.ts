// Re-export types from server actions
export type {
  CategoryAggregation,
  SearchFilters,
  SearchResponse,
  SearchResult,
} from "./opensearch-actions";

// Import server actions
import {
  autocompleteOpenSearch,
  getOpenSearchCategories,
  getOpenSearchStats,
  getPopularOpenSearchCategories,
  getRecentOpenSearchItems,
  isOpenSearchHealthy,
  searchOpenSearch,
  searchOpenSearchEvents,
  searchOpenSearchGroups,
} from "./opensearch-actions";

class OpenSearchClient {
  constructor() {
    // No client initialization needed - we use server actions
  }

  /**
   * Search for events and groups with optional filters
   */
  async search(
    query: string,
    filters: SearchFilters = {}
  ): Promise<SearchResponse> {
    return searchOpenSearch(query, filters);
  }

  /**
   * Get all unique categories with document counts
   */
  async getCategories(): Promise<CategoryAggregation[]> {
    return getOpenSearchCategories();
  }

  /**
   * Search for events only
   */
  async searchEvents(
    query: string,
    filters: Omit<SearchFilters, "type"> = {}
  ): Promise<SearchResponse> {
    return searchOpenSearchEvents(query, filters);
  }

  /**
   * Search for groups only
   */
  async searchGroups(
    query: string,
    filters: Omit<SearchFilters, "type"> = {}
  ): Promise<SearchResponse> {
    return searchOpenSearchGroups(query, filters);
  }

  /**
   * Get popular categories (most documents)
   */
  async getPopularCategories(
    limit: number = 10
  ): Promise<CategoryAggregation[]> {
    return getPopularOpenSearchCategories(limit);
  }

  /**
   * Search with autocomplete suggestions
   */
  async autocomplete(
    query: string,
    limit: number = 5
  ): Promise<SearchResult[]> {
    return autocompleteOpenSearch(query, limit);
  }

  /**
   * Get recent events and groups
   */
  async getRecent(limit: number = 10): Promise<SearchResult[]> {
    return getRecentOpenSearchItems(limit);
  }

  /**
   * Get index statistics
   */
  async getStats(): Promise<{
    totalDocuments: number;
    indexSize: string;
    lastUpdated: string;
  }> {
    return getOpenSearchStats();
  }

  /**
   * Check if the search index is healthy
   */
  async isHealthy(): Promise<boolean> {
    return isOpenSearchHealthy();
  }
}

// Export a singleton instance
export const openSearchClient = new OpenSearchClient();

// Export the class for custom instances if needed
export { OpenSearchClient };

// Convenience functions for common operations
export const searchEvents = (
  query: string,
  filters?: Omit<SearchFilters, "type">
) => searchOpenSearchEvents(query, filters);

export const searchGroups = (
  query: string,
  filters?: Omit<SearchFilters, "type">
) => searchOpenSearchGroups(query, filters);

export const searchAll = (query: string, filters?: SearchFilters) =>
  searchOpenSearch(query, filters);

export const getCategories = () => getOpenSearchCategories();

export const getPopularCategories = (limit?: number) =>
  getPopularOpenSearchCategories(limit);

export const autocomplete = (query: string, limit?: number) =>
  autocompleteOpenSearch(query, limit);

export const getRecent = (limit?: number) => getRecentOpenSearchItems(limit);

export const getSearchStats = () => getOpenSearchStats();

export const isSearchHealthy = () => isOpenSearchHealthy();
