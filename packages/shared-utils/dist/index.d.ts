/**
 * Shared utility functions for event processing across the TouchGrass DC application
 * This package provides consistent date parsing, event normalization, and other utilities
 * that are used across different parts of the application.
 */
export interface NormalizedEvent {
    title: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    start_time?: string;
    end_time?: string;
    location?: string;
    venue?: string;
    coordinates?: string;
    category?: string | string[];
    image_url?: string;
    url?: string;
    socials?: {
        website?: string;
        facebook?: string;
        instagram?: string;
        twitter?: string;
    };
    cost?: {
        type: "free" | "fixed" | "variable";
        currency: string;
        amount: string | number;
    };
    source?: string;
    external_id?: string;
    is_public?: boolean;
    is_virtual?: boolean;
    publisher?: string;
    ticket_links?: string[];
    confidence?: number;
    extractionMethod?: string;
}
/**
 * Generate a consistent event ID
 */
export declare function generateEventId(event: NormalizedEvent, source?: string): string;
/**
 * Normalize date strings to consistent format
 */
export declare function normalizeDate(dateStr?: string): string | undefined;
/**
 * Normalize time strings to consistent format
 */
export declare function normalizeTime(timeStr?: string): string | undefined;
/**
 * Normalize category to consistent format
 */
export declare function normalizeCategory(category?: string | string[]): string;
/**
 * Normalize cost information
 */
export declare function normalizeCost(cost?: any): NormalizedEvent["cost"];
/**
 * Normalize coordinates
 */
export declare function normalizeCoordinates(coordinates?: any): string | undefined;
/**
 * Parse various date formats into a consistent YYYY-MM-DD string format
 * Handles multiple input formats including ISO strings, date objects, and various text formats
 */
export declare function parseDate(dateValue: any): string | undefined;
/**
 * Parse date with time into ISO string format
 * Useful for events that need precise timing
 */
export declare function parseDateTime(dateValue: any): string | undefined;
/**
 * Advanced date parsing for crawler data with multiple formats
 * Handles complex date strings from web scraping
 */
export declare function parseComplexDate(dateText: string): string | null;
/**
 * Standardized event interface used across the application
 */
export interface NormalizedEvent {
    title: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    start_time?: string;
    end_time?: string;
    location?: string;
    venue?: string;
    coordinates?: string;
    category?: string | string[];
    image_url?: string;
    url?: string;
    socials?: {
        website?: string;
        facebook?: string;
        instagram?: string;
        twitter?: string;
    };
    cost?: {
        type: "free" | "fixed" | "variable";
        currency: string;
        amount: string | number;
    };
    source?: string;
    external_id?: string;
    is_public?: boolean;
    is_virtual?: boolean;
    publisher?: string;
    ticket_links?: string[];
    confidence?: number;
    extractionMethod?: string;
}
/**
 * Parse cost amount from various formats
 */
export declare function parseCostAmount(amount: any): number;
/**
 * Parse categories from various formats (string, array, etc.)
 */
export declare function parseCategories(category: any): string[];
/**
 * Transform DynamoDB event to OpenSearch format
 */
export declare function transformEventForOpenSearch(event: any): any;
/**
 * Transform OpenWebNinja event to normalized format
 */
export declare function transformOpenWebNinjaEvent(event: any): NormalizedEvent;
/**
 * Validate if an event has required fields
 */
export declare function validateEvent(event: any): {
    isValid: boolean;
    errors: string[];
};
/**
 * Sanitize event data for safe storage
 */
export declare function sanitizeEvent(event: any): any;
declare const _default: {
    parseDate: typeof parseDate;
    parseDateTime: typeof parseDateTime;
    parseComplexDate: typeof parseComplexDate;
    parseCostAmount: typeof parseCostAmount;
    parseCategories: typeof parseCategories;
    generateEventId: typeof generateEventId;
    transformEventForOpenSearch: typeof transformEventForOpenSearch;
    transformOpenWebNinjaEvent: typeof transformOpenWebNinjaEvent;
    validateEvent: typeof validateEvent;
    sanitizeEvent: typeof sanitizeEvent;
};
export default _default;
//# sourceMappingURL=index.d.ts.map