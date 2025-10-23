import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { Resource } from "sst";

// Standardized event interface
export interface NormalizedEvent {
  // Core fields
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;

  // Location fields
  location?: string;
  venue?: string;
  coordinates?: string; // "lat,lng" format

  // Categorization
  category?: string | string[];

  // Media & Links
  image_url?: string;
  url?: string;
  socials?: {
    website?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };

  // Cost information
  cost?: {
    type: "free" | "fixed" | "variable";
    currency: string;
    amount: string | number;
  };

  // Metadata
  source?: string;
  external_id?: string;
  is_public?: boolean;
  is_virtual?: boolean;

  // Optional fields for specific sources
  publisher?: string;
  ticket_links?: string[];
  confidence?: number;
  extractionMethod?: string;
}

export class EventNormalizer {
  private dynamoClient: DynamoDBClient;

  constructor() {
    this.dynamoClient = new DynamoDBClient({});
  }

  /**
   * Generate a consistent event ID
   */
  private generateEventId(event: NormalizedEvent, source?: string): string {
    const timestamp = Date.now();
    const titleSlug = event.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const sourcePrefix = source ? `${source.toUpperCase()}-` : "";
    return `EVENT-${sourcePrefix}${titleSlug}-${timestamp}`;
  }

  /**
   * Normalize date strings to consistent format
   */
  private normalizeDate(dateStr?: string): string | undefined {
    if (!dateStr) return undefined;

    try {
      // Handle various date formats
      let date: Date;

      if (dateStr.includes("T")) {
        // Already has time component
        date = new Date(dateStr);
      } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // YYYY-MM-DD format
        date = new Date(dateStr + "T00:00:00");
      } else {
        // Try to parse as-is
        date = new Date(dateStr);
      }

      if (isNaN(date.getTime())) return undefined;

      return date.toISOString().split("T")[0]; // Return YYYY-MM-DD
    } catch {
      return undefined;
    }
  }

  /**
   * Normalize time strings to consistent format
   */
  private normalizeTime(timeStr?: string): string | undefined {
    if (!timeStr) return undefined;

    try {
      // Handle various time formats
      const time = timeStr.trim();

      // If it's already in HH:MM format
      if (time.match(/^\d{1,2}:\d{2}$/)) {
        return time;
      }

      // If it has AM/PM
      if (time.match(/\d{1,2}:\d{2}\s*(AM|PM)/i)) {
        return time;
      }

      // Try to parse and format
      const date = new Date(`2000-01-01T${time}`);
      if (!isNaN(date.getTime())) {
        return date.toTimeString().split(" ")[0].substring(0, 5);
      }

      return time;
    } catch {
      return timeStr;
    }
  }

  /**
   * Normalize category to consistent format
   */
  private normalizeCategory(category?: string | string[]): string {
    if (!category) return "General";

    const categories = Array.isArray(category) ? category : [category];
    const normalizedCategories = categories.map((cat) => {
      const normalized = cat.toLowerCase().trim();

      // Map common variations to standard categories
      const categoryMap: { [key: string]: string } = {
        music: "Music",
        concert: "Music",
        jazz: "Music",
        festival: "Festival",
        parade: "Festival",
        sports: "Sports",
        soccer: "Sports",
        museum: "Museum",
        art: "Arts & Culture",
        culture: "Arts & Culture",
        food: "Food & Drink",
        drink: "Food & Drink",
        networking: "Networking",
        business: "Networking",
        education: "Education",
        workshop: "Education",
        community: "Community",
        volunteer: "Community",
        general: "General",
      };

      return categoryMap[normalized] || cat;
    });

    return normalizedCategories.join(",");
  }

  /**
   * Normalize cost information
   */
  private normalizeCost(cost?: any): NormalizedEvent["cost"] {
    if (!cost) return undefined;

    if (typeof cost === "string") {
      const costStr = cost.toLowerCase();
      if (costStr.includes("free")) {
        return { type: "free", currency: "USD", amount: 0 };
      }

      // Try to extract amount from string
      const amountMatch = costStr.match(/\$?(\d+(?:\.\d{2})?)/);
      if (amountMatch) {
        return {
          type: "fixed",
          currency: "USD",
          amount: parseFloat(amountMatch[1]),
        };
      }
    }

    if (typeof cost === "object") {
      return {
        type: cost.type || "fixed",
        currency: cost.currency || "USD",
        amount: cost.amount || 0,
      };
    }

    return undefined;
  }

  /**
   * Normalize coordinates
   */
  private normalizeCoordinates(coordinates?: any): string | undefined {
    if (!coordinates) return undefined;

    if (typeof coordinates === "string") {
      return coordinates;
    }

    if (Array.isArray(coordinates) && coordinates.length >= 2) {
      return `${coordinates[0]},${coordinates[1]}`;
    }

    if (coordinates.latitude && coordinates.longitude) {
      return `${coordinates.latitude},${coordinates.longitude}`;
    }

    return undefined;
  }

  /**
   * Transform OpenWebNinja event to normalized format
   */
  transformOpenWebNinjaEvent(event: any): NormalizedEvent {
    const startDate = event.start_time
      ? event.start_time.split(" ")[0]
      : undefined;
    const startTime = event.start_time
      ? event.start_time.split(" ")[1]
      : undefined;
    const endDate = event.end_time ? event.end_time.split(" ")[0] : undefined;
    const endTime = event.end_time ? event.end_time.split(" ")[1] : undefined;

    return {
      title: event.name,
      description: event.description,
      start_date: this.normalizeDate(startDate),
      end_date: this.normalizeDate(endDate),
      start_time: this.normalizeTime(startTime),
      end_time: this.normalizeTime(endTime),
      location: event.venue?.address || event.venue?.name,
      venue: event.venue?.name,
      coordinates: this.normalizeCoordinates(event.venue?.coordinates),
      is_virtual: event.is_virtual,
      url: event.link,
      image_url: event.thumbnail,
      publisher: event.publisher,
      source: "openwebninja",
      external_id: event.event_id,
      is_public: true,
    };
  }

  /**
   * Transform Washingtonian event to normalized format
   */
  transformWashingtonianEvent(event: any): NormalizedEvent {
    return {
      title: event.title,
      description: event.description,
      start_date: this.normalizeDate(event.date),
      start_time: this.normalizeTime(event.time),
      location: event.location || event.venue,
      venue: event.venue,
      url: event.url,
      image_url: event.image_url,
      source: "washingtonian",
      is_public: true,
    };
  }

  /**
   * Transform crawler event to normalized format
   */
  transformCrawlerEvent(event: any): NormalizedEvent {
    return {
      title: event.title,
      description: event.description,
      start_date: this.normalizeDate(event.start_date || event.date),
      end_date: this.normalizeDate(event.end_date),
      location: event.location,
      venue: event.venue,
      category: this.normalizeCategory(event.category),
      image_url: event.image_url,
      cost: this.normalizeCost(event.cost),
      socials: event.socials,
      is_public: event.is_public ?? true,
      source: "crawler",
    };
  }

  /**
   * Save normalized event to DynamoDB
   */
  async saveEvent(event: NormalizedEvent, source?: string): Promise<string> {
    const eventId = this.generateEventId(event, source);
    const timestamp = Date.now();

    const item = {
      pk: eventId,
      sk: eventId,
      createdAt: timestamp,
      updatedAt: timestamp,

      // Core fields
      title: event.title,
      description: event.description,
      start_date: event.start_date,
      end_date: event.end_date,
      start_time: event.start_time,
      end_time: event.end_time,

      // Location fields
      location: event.location,
      venue: event.venue,
      coordinates: event.coordinates,

      // Categorization
      category: this.normalizeCategory(event.category),
      isPublic: (event.is_public ?? true).toString(),

      // Media & Links
      image_url: event.image_url,
      url: event.url,
      socials: event.socials,

      // Cost information
      cost: event.cost,

      // Metadata
      source: event.source || source,
      external_id: event.external_id,
      is_virtual: event.is_virtual,
      publisher: event.publisher,
      ticket_links: event.ticket_links,
      confidence: event.confidence,
      extractionMethod: event.extractionMethod,

      // ISO timestamps for compatibility
      created_at: new Date(timestamp).toISOString(),
      updated_at: new Date(timestamp).toISOString(),

      // Add titlePrefix for efficient searches
      titlePrefix: event.title.trim().toLowerCase().substring(0, 3),
    };

    try {
      const command = new PutItemCommand({
        TableName: Resource.Db.name,
        Item: marshall(item),
        ConditionExpression: "attribute_not_exists(pk)", // Ensure idempotency
      });

      await this.dynamoClient.send(command);
      console.log(`✅ Successfully saved normalized event: ${event.title}`);
      return eventId;
    } catch (error: any) {
      if (error.name === "ConditionalCheckFailedException") {
        console.log(`Event already exists: ${event.title}`);
        return eventId;
      } else {
        console.error("Error saving normalized event:", error);
        throw error;
      }
    }
  }

  /**
   * Batch save multiple events
   */
  async saveEvents(
    events: NormalizedEvent[],
    source?: string
  ): Promise<string[]> {
    const eventIds: string[] = [];

    for (const event of events) {
      try {
        const eventId = await this.saveEvent(event, source);
        eventIds.push(eventId);

        // Add delay between saves to avoid throttling
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error saving event ${event.title}:`, error);
      }
    }

    return eventIds;
  }
}

// Convenience functions for different sources
export async function saveOpenWebNinjaEvents(events: any[]): Promise<string[]> {
  const normalizer = new EventNormalizer();
  const normalizedEvents = events.map((event) =>
    normalizer.transformOpenWebNinjaEvent(event)
  );
  return await normalizer.saveEvents(normalizedEvents, "openwebninja");
}

export async function saveWashingtonianEvents(
  events: any[]
): Promise<string[]> {
  const normalizer = new EventNormalizer();
  const normalizedEvents = events.map((event) =>
    normalizer.transformWashingtonianEvent(event)
  );
  return await normalizer.saveEvents(normalizedEvents, "washingtonian");
}

export async function saveCrawlerEvents(events: any[]): Promise<string[]> {
  const normalizer = new EventNormalizer();
  const normalizedEvents = events.map((event) =>
    normalizer.transformCrawlerEvent(event)
  );
  return await normalizer.saveEvents(normalizedEvents, "crawler");
}

export async function saveNormalizedEvents(
  events: NormalizedEvent[],
  source?: string
): Promise<string[]> {
  const normalizer = new EventNormalizer();
  return await normalizer.saveEvents(events, source);
}
