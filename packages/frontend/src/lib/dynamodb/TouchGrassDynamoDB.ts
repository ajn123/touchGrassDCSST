/**
 * TouchGrassDynamoDB - DynamoDB operations class for TouchGrass DC
 *
 * This class provides centralized database operations for events, groups, and other entities
 * used across the TouchGrass DC application.
 */

import {
  BatchWriteItemCommand,
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  ScanCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { Resource } from "sst";

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface Event {
  pk: string;
  sk: string;
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
  isPublic?: boolean | string;
  is_virtual?: boolean;
  publisher?: string;
  ticket_links?: string[];
  confidence?: number;
  extractionMethod?: string;
  createdAt?: number;
  updatedAt?: number;
  titlePrefix?: string;
}

export interface SearchFilters {
  query?: string;
  categories?: string[];
  costRange?: { min?: number; max?: number; type?: string };
  location?: string[];
  dateRange?: { start?: string; end?: string };
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  isPublic?: boolean;
  fields?: string[];
}

export interface SearchResult {
  events: Event[];
  groups: any[];
  total: number;
}

// ============================================================================
// DYNAMODB CLIENT CLASS
// ============================================================================

export class TouchGrassDynamoDB {
  private client: DynamoDBClient;
  private tableName: string;

  constructor(tableName?: string, region?: string) {
    this.tableName = tableName || Resource.Db.name;
    this.client = new DynamoDBClient({
      region: region || process.env.AWS_REGION || "us-east-1",
    });
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Geocoding function for address to coordinates conversion
   */
  private async geocodeAddress(address: string): Promise<{
    latitude: number;
    longitude: number;
    formattedAddress: string;
  } | null> {
    try {
      if (!address) {
        console.log("No address provided for geocoding");
        return null;
      }

      // Try both environment variable names
      let apiKey =
        process.env.GOOGLE_MAPS_API_KEY ||
        process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.log(
          "No Google Maps API key found in environment (tried GOOGLE_MAPS_API_KEY and NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)"
        );
        console.log(
          "Please set the GOOGLE_MAPS_API_KEY environment variable or add it to your .env file"
        );
        return null;
      }

      // console.log(`Using API key: ${apiKey.substring(0, 10)}...`);

      const encodedAddress = encodeURIComponent(address);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      // console.log(
      //   `Geocoding response for "${address}":`,
      //   JSON.stringify(data, null, 2)
      // );

      if (data.status === "OK" && data.results && data.results.length > 0) {
        const result = data.results[0];
        const location = result.geometry.location;

        return {
          latitude: location.lat,
          longitude: location.lng,
          formattedAddress: result.formatted_address,
        };
      } else {
        // console.log(
        //   `Geocoding failed for "${address}" with status: ${data.status}`
        // );
        if (data.error_message) {
          console.log(`Error message: ${data.error_message}`);
        }
      }

      return null;
    } catch (error) {
      console.error("Geocoding error:", error);
      return null;
    }
  }

  /**
   * Helper function to extract numeric cost value for sorting
   */
  private extractCostValue(cost: any): number {
    if (!cost) return 0;

    if (cost.type === "free") return 0;
    if (cost.type === "variable") return 50; // Default value for variable costs
    if (typeof cost.amount === "number") return cost.amount;
    if (typeof cost.amount === "string") {
      // Handle ranges like "25-58"
      const range = cost.amount.split("-");
      return parseFloat(range[0]) || 0;
    }

    return 0;
  }

  /**
   * Helper function to sort items by various fields
   */
  private sortItems(items: any[], sortBy: string, sortOrder: "asc" | "desc") {
    return items.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle different data types
      if (sortBy === "date" || sortBy === "start_date") {
        aValue = new Date(aValue || 0).getTime();
        bValue = new Date(bValue || 0).getTime();
      } else if (sortBy === "title") {
        aValue = (aValue || "").toLowerCase();
        bValue = (bValue || "").toLowerCase();
      } else if (sortBy === "cost") {
        // Extract numeric cost value
        aValue = this.extractCostValue(a.cost);
        bValue = this.extractCostValue(b.cost);
      }

      // Handle null/undefined values
      if (aValue == null) aValue = sortOrder === "asc" ? Infinity : -Infinity;
      if (bValue == null) bValue = sortOrder === "asc" ? Infinity : -Infinity;

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }

  // ============================================================================
  // EVENT OPERATIONS
  // ============================================================================

  /**
   * Get all events from DynamoDB
   * Uses QueryCommand with publicEventsIndex GSI for better performance
   * Handles pagination to get all events (not just the first 1MB)
   */
  async getEvents(): Promise<Event[]> {
    try {
      // console.log("🔍 getEvents: Starting to fetch events from DynamoDB...");
      // console.log("🔍 getEvents: Table name:", this.tableName);
      // console.log(
      //   "🔍 getEvents: AWS Region:",
      //   process.env.AWS_REGION || "us-east-1"
      // );

      const allEvents: Event[] = [];
      let lastEvaluatedKey: any = undefined;
      let queryCount = 0;

      // Use QueryCommand with publicEventsIndex GSI for efficient querying
      // This is much faster than Scan because it only looks at items with isPublic = "true"
      do {
        queryCount++;
        console.log(`🔍 getEvents: Querying batch ${queryCount}...`);

        // Query the publicEventsIndex GSI where isPublic = "true"
        // Then filter for events (pk starts with EVENT- or EVENT#)
        const command = new QueryCommand({
          TableName: this.tableName,
          IndexName: "publicEventsIndex",
          KeyConditionExpression: "#isPublic = :isPublic",
          FilterExpression:
            "(begins_with(#pk, :eventPrefixNew) OR begins_with(#pk, :eventPrefixOld) OR begins_with(#pk, :washingtonianPrefixNew) OR begins_with(#pk, :washingtonianPrefixOld))",
          ExpressionAttributeNames: {
            "#isPublic": "isPublic",
            "#pk": "pk",
          },
          ExpressionAttributeValues: {
            ":isPublic": { S: "true" },
            ":eventPrefixNew": { S: "EVENT-" },
            ":eventPrefixOld": { S: "EVENT#" },
            ":washingtonianPrefixNew": { S: "EVENT-WASHINGTONIAN-" },
            ":washingtonianPrefixOld": { S: "EVENT#WASHINGTONIAN#" },
          },
          ExclusiveStartKey: lastEvaluatedKey,
        });

        const result = await this.client.send(command);

        const batchEvents: Event[] =
          result.Items?.map((item) => {
            // Use AWS SDK's unmarshall utility to convert DynamoDB format to regular object
            const unmarshalledItem = unmarshall(item) as Event;
            // console.log("🔍 getEvents: Unmarshalled item:", unmarshalledItem);
            return unmarshalledItem;
          }) || [];

        allEvents.push(...batchEvents);
        console.log(
          `🔍 getEvents: Batch ${queryCount} - Found ${batchEvents.length} events (total so far: ${allEvents.length})`
        );

        lastEvaluatedKey = result.LastEvaluatedKey;
      } while (lastEvaluatedKey);

      console.log("🔍 getEvents: DynamoDB query completed");
      console.log(
        `🔍 getEvents: Total events found: ${allEvents.length} (queried ${queryCount} batch(es))`
      );

      let events = allEvents;

      // For Washingtonian events, derive start_date (and start_time) from url or pk when missing
      events = events.map((ev: any) => {
        const pk: string | undefined = ev?.pk;
        const url: string | undefined = ev?.url;
        const isWash =
          typeof pk === "string" &&
          (pk.startsWith("EVENT#WASHINGTONIAN#") ||
            pk.startsWith("EVENT-WASHINGTONIAN-"));

        if (isWash) {
          const source = (url || pk) as string;
          // Derive date from YYYY-MM-DD in source
          if (!ev.start_date) {
            const dateMatch = source.match(/\d{4}-\d{2}-\d{2}/i);
            if (dateMatch) {
              ev.start_date = dateMatch[0];
            }
          }
          // Derive time from trailing Txx in source (e.g., 2025-10-17T08)
          if (!ev.start_time) {
            const timeMatch = source.match(/\d{4}-\d{2}-\d{2}[tT](\d{2})/);
            if (timeMatch) {
              const hh = timeMatch[1];
              const minutes = ev?.time?.match(/:(\d{2})/)?.[1] || "00";
              const hourNum = parseInt(hh, 10);
              const ampm = hourNum >= 12 ? "PM" : "AM";
              const displayHour = hourNum % 12 || 12;
              ev.start_time = `${displayHour}:${minutes} ${ampm}`;
            } else if (ev?.time) {
              ev.start_time = ev.time;
            }
          }
        }
        return ev;
      });

      // console.log("🔍 getEvents: Final events array length:", events.length);
      return events;
    } catch (error) {
      // console.error("❌ getEvents: Error fetching events:", error);
      // console.error("❌ getEvents: Error details:", {
      //   message: error instanceof Error ? error.message : "Unknown error",
      //   stack: error instanceof Error ? error.stack : undefined,
      //   name: error instanceof Error ? error.name : "Unknown error type",
      // });
      return [];
    }
  }

  /**
   * Get all current and future events from DynamoDB
   * Filters out past events based on end_date or start_date
   */
  async getCurrentAndFutureEvents(): Promise<Event[]> {
    try {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

      // Get all events
      const allEvents = await this.getEvents();

      // Filter to only current and future events
      const currentAndFutureEvents = allEvents.filter((event) => {
        // Use end_date if available, otherwise use start_date
        const eventDate = event.end_date || event.start_date;

        if (!eventDate) {
          // If no date, include it (could be ongoing or date TBD)
          return true;
        }

        // Compare dates (YYYY-MM-DD format allows string comparison)
        return eventDate >= today;
      });

      return currentAndFutureEvents;
    } catch (error) {
      console.error("Error fetching current and future events:", error);
      return [];
    }
  }

  /**
   * Get a single event by ID
   */
  async getEvent(id: string): Promise<Event | null> {
    try {
      console.log("Getting event with id:", id);

      // Try the exact ID first
      let command = new GetItemCommand({
        TableName: this.tableName,
        Key: {
          pk: { S: id },
          sk: { S: id },
        },
      });

      let result = await this.client.send(command);

      // If not found and ID doesn't have prefix, try with both prefixes
      if (!result.Item && !id.startsWith("EVENT")) {
        // Try with new prefix
        command = new GetItemCommand({
          TableName: this.tableName,
          Key: {
            pk: { S: `EVENT-${id}` },
            sk: { S: `EVENT-${id}` },
          },
        });
        result = await this.client.send(command);

        // If still not found, try with old prefix
        if (!result.Item) {
          command = new GetItemCommand({
            TableName: this.tableName,
            Key: {
              pk: { S: `EVENT#${id}` },
              sk: { S: `EVENT#${id}` },
            },
          });
          result = await this.client.send(command);
        }
      }

      // Use AWS SDK's built-in unmarshall utility
      const unmarshalledItem = result.Item
        ? (unmarshall(result.Item) as Event)
        : null;
      console.log(
        `Unmarshalled item: ${JSON.stringify(unmarshalledItem, null, 2)}`
      );

      return unmarshalledItem;
    } catch (error) {
      console.error("Error fetching item:", error);
      return null;
    }
  }

  /**
   * Get event by title
   */
  async getEventByTitle(title: string): Promise<Event | null> {
    try {
      console.log("Searching for event with title:", title);
      console.log("Using table:", this.tableName);

      const command = new QueryCommand({
        TableName: Resource.Db.name,
        IndexName: "eventTitleIndex",
        KeyConditionExpression: "#title = :title",
        ExpressionAttributeNames: {
          "#title": "title",
        },
        ExpressionAttributeValues: {
          ":title": { S: title },
        },
      });

      console.log("Scan command created, executing...");
      const result = await this.client.send(command);
      console.log("Scan result received:", result);

      if (!result.Items) {
        console.log("No items found in scan result");
        return null;
      }

      const events = result.Items.map((item) => {
        try {
          return unmarshall(item) as Event;
        } catch (unmarshallError) {
          console.error("Error unmarshalling item:", unmarshallError);
          return null;
        }
      }).filter(Boolean) as Event[];

      console.log("Found events:", events.length);

      // Return the first matching event (titles should be unique)
      return events.length > 0 ? events[0] : null;
    } catch (error) {
      console.error("Error fetching event by title:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        title,
        tableName: this.tableName,
      });
      return null;
    }
  }

  /**
   * Get events by category
   */
  async getEventsByCategory(category: string): Promise<Event[]> {
    try {
      const command = new QueryCommand({
        TableName: Resource.Db.name,
        IndexName: "eventCategoryIndex",
        KeyConditionExpression: "#category = :category",
        ExpressionAttributeNames: {
          "#category": "category",
        },
        ExpressionAttributeValues: {
          ":category": { S: category },
        },
      });

      const result = await this.client.send(command);
      const events: Event[] =
        result.Items?.map((item) => {
          return unmarshall(item) as Event;
        }) || [];

      // Filter events that have the specified category in their category array or comma-separated string
      // Case-insensitive comparison
      const normalizedSearchCategory = category.toLowerCase().trim();
      return events.filter((event) => {
        if (!event.category) return false;

        if (Array.isArray(event.category)) {
          // If category is an array, check if the specified category is in the array (case-insensitive)
          return event.category.some(
            (cat: string) =>
              cat.toLowerCase().trim() === normalizedSearchCategory
          );
        } else {
          // If category is a comma-separated string, split it and check if the specified category is included (case-insensitive)
          const categories = event.category
            .split(",")
            .map((cat: string) => cat.toLowerCase().trim());
          return categories.includes(normalizedSearchCategory);
        }
      });
    } catch (error) {
      console.error("Error fetching events by category:", error);
      return [];
    }
  }

  /**
   * Get all unique categories
   */
  async getCategories(): Promise<{ category: string }[]> {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
      });

      const result = await this.client.send(command);
      const uniqueCategories = new Set();

      result.Items?.forEach((item) => {
        const unmarshalledItem = unmarshall(item);

        if (Array.isArray(unmarshalledItem.category)) {
          // If category is an array, split each category by comma and slash, then add to the set (normalized to lowercase)
          unmarshalledItem.category.forEach((category: string) => {
            if (category && category.trim()) {
              // Split by both comma and slash to handle "christmas/novelty" or "christmas,novelty"
              const splitCategories = category
                .split(/[,\/]/)
                .map((c) => c.trim().toLowerCase())
                .filter((c) => c.length > 0);
              splitCategories.forEach((c) => uniqueCategories.add(c));
            }
          });
        } else if (unmarshalledItem.category) {
          // If category is a string, split by comma and slash, then add each part (normalized to lowercase)
          const categories = unmarshalledItem.category
            .split(/[,\/]/)
            .map((cat: string) => cat.trim().toLowerCase())
            .filter((cat: string) => cat.length > 0);
          categories.forEach((category: string) => {
            if (category && category.trim()) {
              uniqueCategories.add(category.trim());
            }
          });
        }
      });

      return Array.from(uniqueCategories).map((category) => ({
        category: category as string,
      }));
    } catch (error) {
      console.error("Error fetching categories:", error);
      return [];
    }
  }

  /**
   * Create a new event
   */
  async createEvent(event: any): Promise<string> {
    try {
      const timestamp = Date.now();

      // Check if eventId is provided in the form data
      let eventId = event.get("eventId");

      if (!eventId) {
        // Generate a unique event ID if none provided
        eventId = `EVENT-${Date.now()}`;
      }

      // Check if item exists
      const existingEvent = await this.getEvent(eventId);

      // Build Item object dynamically from all body properties
      const item: any = {
        pk: { S: eventId },
        sk: { S: eventId },
        updatedAt: { N: timestamp.toString() },
      };

      // If it's a new event, set createdAt
      if (!existingEvent) {
        item.createdAt = { N: timestamp.toString() };
      } else {
        // Keep the original createdAt if updating
        item.createdAt = {
          N: (existingEvent.createdAt || timestamp).toString(),
        };
      }

      // Collect socials fields
      const socials: { [key: string]: string } = {};

      // Add all other properties from body as strings
      for (const [key, value] of event.entries()) {
        if (key !== "eventId") {
          // Skip eventId as it's already handled
          const stringValue = String(value);

          console.log(
            `🔍 Processing field: ${key} = "${value}" (stringValue: "${stringValue}")`
          );

          // Skip empty values to avoid DynamoDB index issues
          if (!stringValue.trim()) {
            continue;
          }

          // Handle socials fields (socials.website, socials.instagram, etc.)
          if (key.startsWith("socials.")) {
            const socialKey = key.replace("socials.", "");
            socials[socialKey] = stringValue;
            continue; // Skip adding to main item, will handle socials separately
          }

          if (key === "cost") {
            // Handle cost as a JSON object
            try {
              // Validate that stringValue is not empty and looks like JSON
              const trimmedValue = stringValue.trim();
              if (
                !trimmedValue ||
                (!trimmedValue.startsWith("{") && !trimmedValue.startsWith("["))
              ) {
                // Not valid JSON format, store as string
                item[key] = { S: stringValue };
              } else {
                const costObj = JSON.parse(trimmedValue);
                item[key] = {
                  M: {
                    type: { S: costObj.type },
                    currency: { S: costObj.currency },
                    amount: { N: costObj.amount.toString() },
                  },
                };
              }
            } catch (error) {
              console.error(
                "Error parsing cost JSON:",
                error,
                "Value:",
                stringValue
              );
              item[key] = { S: stringValue };
            }
          } else if (key === "title") {
            item[key] = { S: stringValue };
            // Add titlePrefix for efficient title searches (first 3 characters)
            const titlePrefix = stringValue
              .trim()
              .toLowerCase()
              .substring(0, 3);
            if (titlePrefix.length > 0) {
              item.titlePrefix = { S: titlePrefix };
              console.log(
                `🏷️ Added titlePrefix: "${stringValue}" -> "${titlePrefix}"`
              );
            }
          } else if (key === "isPublic") {
            // Handle isPublic field - store as string
            item[key] = { S: stringValue };
            console.log(
              `🔒 isPublic field: "${stringValue}" -> stored as string`
            );
            console.log(`🔒 DynamoDB item[key]:`, JSON.stringify(item[key]));
          } else {
            item[key] = { S: stringValue };
          }
        }
      }

      // Add socials as a map if there are any social media links
      if (Object.keys(socials).length > 0) {
        const socialsMap: { [key: string]: any } = {};
        Object.entries(socials).forEach(([key, value]) => {
          socialsMap[key] = { S: value };
        });
        item.socials = { M: socialsMap };
      }

      // Handle location data specifically
      const location = event.get("location");
      const latitude = event.get("latitude");
      const longitude = event.get("longitude");

      if (location) {
        item.location = { S: location };
      }

      // If coordinates are provided, use them; otherwise try to geocode the address
      if (latitude && longitude) {
        item.coordinates = { S: `${latitude},${longitude}` };
        console.log(
          `📍 Event using provided coordinates: ${latitude},${longitude}`
        );
      } else if (location && !latitude && !longitude) {
        // Try to geocode the address to get coordinates
        try {
          console.log(`📍 Geocoding address: ${location}`);
          const geocoded = await this.geocodeAddress(location);
          if (geocoded) {
            item.coordinates = {
              S: `${geocoded.latitude},${geocoded.longitude}`,
            };
            // Update location with formatted address if geocoding was successful
            item.location = { S: geocoded.formattedAddress };
            console.log(
              `✅ Geocoded to: ${geocoded.latitude},${geocoded.longitude}`
            );
          } else {
            console.log(`❌ Failed to geocode address: ${location}`);
          }
        } catch (error) {
          console.error(`❌ Geocoding error:`, error);
          // Continue without coordinates if geocoding fails
        }
      }

      console.log("📦 Final item to be stored:", JSON.stringify(item, null, 2));

      const command = new PutItemCommand({
        TableName: this.tableName,
        Item: item,
      });

      const result = await this.client.send(command);

      const action = existingEvent ? "updated" : "created";

      console.log(`✅ Event ${action} successfully`);
      return `Event ${action} successfully`;
    } catch (error) {
      console.error("Error creating/updating event:", error);
      return "Error creating/updating event";
    }
  }

  /**
   * Update an event
   */
  async updateEvent(
    eventId: string,
    eventData: any
  ): Promise<{
    statusCode: number;
    body: string;
  }> {
    try {
      // Check if item exists
      const existingEvent = await this.getEvent(eventId);

      if (!existingEvent) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: "Event not found" }),
        };
      }

      const timestamp = Date.now();

      // Build Item object for update
      const item: any = {
        pk: { S: eventId },
        sk: { S: eventId },
        createdAt: { N: (existingEvent.createdAt || timestamp).toString() }, // Keep original createdAt
        updatedAt: { N: timestamp.toString() },
      };

      // Add all other properties from eventData, preserving data types
      for (const [key, value] of eventData.entries()) {
        if (key !== "eventId") {
          // Skip eventId as it's already handled
          const stringValue = String(value);

          // Skip empty values to avoid DynamoDB index issues
          if (!stringValue.trim()) {
            continue;
          }

          // Handle special fields that should maintain their structure
          if (key === "cost") {
            // Handle cost as a JSON object
            try {
              // Validate that stringValue is not empty and looks like JSON
              const trimmedValue = stringValue.trim();
              if (
                !trimmedValue ||
                (!trimmedValue.startsWith("{") && !trimmedValue.startsWith("["))
              ) {
                // Not valid JSON format, store as string
                item[key] = { S: stringValue };
              } else {
                const costObj = JSON.parse(trimmedValue);
                item[key] = {
                  M: {
                    type: { S: costObj.type },
                    currency: { S: costObj.currency },
                    amount: { N: costObj.amount.toString() },
                  },
                };
              }
            } catch (error) {
              console.error(
                "Error parsing cost JSON:",
                error,
                "Value:",
                stringValue
              );
              item[key] = { S: stringValue };
            }
          } else if (key === "category") {
            // Handle category as an array if it's comma-separated
            if (stringValue.includes(",")) {
              const categories = stringValue
                .split(",")
                .map((cat: string) => cat.trim())
                .filter(Boolean);
              item[key] = { L: categories.map((cat) => ({ S: cat })) };
            } else {
              item[key] = { S: stringValue };
            }
          } else if (key === "coordinates") {
            // Handle coordinates as a string (latitude,longitude format)
            item[key] = { S: stringValue };
          } else if (key.startsWith("socials.")) {
            // Handle socials fields - collect them and add as a map
            const socialKey = key.replace("socials.", "");
            if (!item.socials) {
              item.socials = { M: {} };
            }
            item.socials.M[socialKey] = { S: stringValue };
          } else {
            // For other fields, try to detect if it's a number or boolean
            if (stringValue === "true" || stringValue === "false") {
              item[key] = { BOOL: stringValue === "true" };
            } else if (
              !isNaN(Number(stringValue)) &&
              stringValue.trim() !== ""
            ) {
              item[key] = { N: stringValue };
            } else {
              item[key] = { S: stringValue };
            }
          }
        }
      }

      const command = new PutItemCommand({
        TableName: this.tableName,
        Item: item,
      });

      const result = await this.client.send(command);
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Event updated successfully",
          eventId: eventId,
        }),
      };
    } catch (error) {
      console.error("Error updating event:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Failed to update event",
          details: error instanceof Error ? error.message : "Unknown error",
        }),
      };
    }
  }

  /**
   * Delete an event
   */
  async deleteEvent(eventId: string): Promise<string> {
    try {
      console.log(`🗑️ Deleting event: ${eventId}`);

      const command = new DeleteItemCommand({
        TableName: this.tableName,
        Key: {
          pk: { S: eventId },
          sk: { S: eventId },
        },
      });

      await this.client.send(command);

      console.log(`✅ Event ${eventId} deleted successfully`);
      return `Event deleted successfully`;
    } catch (error) {
      console.error(`❌ Error deleting event ${eventId}:`, error);
      return "Error deleting event";
    }
  }

  /**
   * Approve an event (make it public)
   */
  async approveEvent(eventId: string): Promise<string> {
    try {
      console.log(`✅ Approving event: ${eventId}`);

      const command = new UpdateItemCommand({
        TableName: this.tableName,
        Key: {
          pk: { S: eventId },
          sk: { S: eventId },
        },
        UpdateExpression: "SET #isPublic = :isPublic, #updatedAt = :updatedAt",
        ExpressionAttributeNames: {
          "#isPublic": "isPublic",
          "#updatedAt": "updatedAt",
        },
        ExpressionAttributeValues: {
          ":isPublic": { S: "true" },
          ":updatedAt": { N: Date.now().toString() },
        },
      });

      await this.client.send(command);

      console.log(`✅ Event ${eventId} approved successfully`);
      return `Event approved successfully`;
    } catch (error) {
      console.error(`❌ Error approving event ${eventId}:`, error);
      return "Error approving event";
    }
  }

  /**
   * Delete multiple events by their IDs
   */
  async deleteMultipleEvents(eventIds: string[]): Promise<{
    statusCode: number;
    body: string;
  }> {
    try {
      if (!eventIds || eventIds.length === 0) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "No event IDs provided" }),
        };
      }

      // BatchWriteItem can handle up to 25 items per request
      const batchSize = 25;
      const batches = [];

      for (let i = 0; i < eventIds.length; i += batchSize) {
        const batch = eventIds.slice(i, i + batchSize);
        batches.push(batch);
      }

      const results = [];

      for (const batch of batches) {
        const deleteRequests = batch.map((eventId) => ({
          DeleteRequest: {
            Key: {
              pk: { S: eventId },
              sk: { S: eventId },
            },
          },
        }));

        const command = new BatchWriteItemCommand({
          RequestItems: {
            [this.tableName]: deleteRequests,
          },
        });

        const result = await this.client.send(command);
        results.push(result);
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: `Successfully deleted ${eventIds.length} events`,
          deletedCount: eventIds.length,
        }),
      };
    } catch (error) {
      console.error("Error deleting multiple events:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Failed to delete events",
          details: error instanceof Error ? error.message : "Unknown error",
        }),
      };
    }
  }

  /**
   * Delete all events in a specific category
   */
  async deleteEventsByCategory(category: string): Promise<{
    statusCode: number;
    body: string;
  }> {
    try {
      // First, get all events in the category
      const events = await this.getEventsByCategory(category);

      if (!events || events.length === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            error: `No events found in category: ${category}`,
          }),
        };
      }

      // Extract event IDs
      const eventIds = events.map((event) => event.pk);

      // Delete them using the batch delete function
      return await this.deleteMultipleEvents(eventIds);
    } catch (error) {
      console.error("Error deleting events by category:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Failed to delete events by category",
          details: error instanceof Error ? error.message : "Unknown error",
        }),
      };
    }
  }

  // ============================================================================
  // SEARCH OPERATIONS
  // ============================================================================

  /**
   * Optimized search function that uses Query instead of Scan when possible
   */
  async searchEventsOptimized(filters: SearchFilters): Promise<Event[]> {
    const startTime = Date.now();
    console.log(
      "🚀 searchEventsOptimized called with filters:",
      JSON.stringify(filters, null, 2)
    );

    try {
      let events: Event[] = [];

      // If we have a text query, use the optimized title search
      if (filters.query && filters.query.trim()) {
        console.log(
          "🔍 Using optimized title search for query:",
          filters.query
        );
        try {
          events = await this.searchEventsByTitle(filters);
        } catch (error) {
          console.error(
            "❌ Title search failed, falling back to limited scan:",
            error
          );
          events = await this.searchEventsWithLimit(filters);
        }
      }
      // If we have specific categories, use GSI-based category search with fallback
      else if (filters.categories && filters.categories.length > 0) {
        console.log(
          "🎯 Using GSI-based search for categories:",
          filters.categories
        );
        try {
          events = await this.searchEventsByCategories(filters);
        } catch (error) {
          console.error(
            "❌ Category search failed, falling back to limited scan:",
            error
          );
          events = await this.searchEventsWithLimit(filters);
        }
      }
      // If we have a date range, we can use date-based queries
      else if (
        filters.dateRange &&
        (filters.dateRange.start || filters.dateRange.end)
      ) {
        console.log("📅 Using date-based search");
        try {
          events = await this.searchEventsByDate(filters);
        } catch (error) {
          console.error(
            "❌ Date search failed, falling back to limited scan:",
            error
          );
          events = await this.searchEventsWithLimit(filters);
        }
      }
      // Fall back to the original scan method but with limits
      else {
        console.log("⚠️ Falling back to scan method with limits");
        events = await this.searchEventsWithLimit(filters);
      }

      return events;
    } catch (error) {
      console.error("❌ Error in searchEventsOptimized:", error);
      const totalTime = Date.now() - startTime;
      console.log(`⏱️ searchEventsOptimized failed after ${totalTime}ms`);

      // Return empty results on error
      return [];
    }
  }

  /**
   * Helper function to search by title efficiently
   */
  private async searchEventsByTitle(filters: SearchFilters): Promise<Event[]> {
    const startTime = Date.now();
    const query = filters.query!.trim().toLowerCase();
    console.log("🔍 Searching by title:", query);

    try {
      // Use the title index for efficient searches
      console.log("🚀 Using eventTitleIndex for title search");
      console.log(
        "📊 Index: eventTitleIndex | Partition Key: title | Sort Key: createdAt"
      );

      const queryParams: any = {
        TableName: this.tableName,
        IndexName: "eventTitleIndex",
        KeyConditionExpression: "begins_with(#title, :titlePrefix)",
        FilterExpression:
          "(begins_with(#pk, :eventPrefixNew) OR begins_with(#pk, :eventPrefixOld)) AND #isPublic = :isPublic",
        ExpressionAttributeNames: {
          "#title": "title",
          "#pk": "pk",
          "#isPublic": "isPublic",
        },
        ExpressionAttributeValues: {
          ":titlePrefix": { S: query },
          ":eventPrefixNew": { S: "EVENT-" },
          ":eventPrefixOld": { S: "EVENT#" },
          ":isPublic": {
            S: (filters.isPublic !== undefined
              ? filters.isPublic
              : true
            ).toString(),
          },
        },
        Limit: filters.limit || 100,
      };

      // Add ProjectionExpression if fields are specified
      if (filters.fields && filters.fields.length > 0) {
        console.log(
          "🎯 Adding ProjectionExpression for fields:",
          filters.fields
        );

        // Always include pk and title as they're required for the index
        const requiredFields = ["pk", "title"];
        const allFields = [...new Set([...requiredFields, ...filters.fields])];

        queryParams.ProjectionExpression = allFields
          .map((_, index) => `#f${index}`)
          .join(", ");

        // Add field names to ExpressionAttributeNames
        allFields.forEach((field, index) => {
          queryParams.ExpressionAttributeNames[`#f${index}`] = field;
        });
      }

      const command = new QueryCommand(queryParams);

      console.log("🔧 Query command details:", {
        indexName: command.input.IndexName,
        keyCondition: command.input.KeyConditionExpression,
        filterExpression: command.input.FilterExpression,
        projectionExpression: command.input.ProjectionExpression,
        tableName: command.input.TableName,
      });

      const result = await this.client.send(command);
      const totalTime = Date.now() - startTime;

      if (result.Items) {
        const events = result.Items.map((item) => unmarshall(item) as Event);
        console.log(
          `⏱️ Title search completed in ${totalTime}ms, found ${events.length} events`
        );
        console.log("✅ Successfully used eventTitleIndex GSI");
        return events;
      }

      return [];
    } catch (error) {
      console.error("❌ Error in title search:", error);
      console.log("🔄 Falling back to limited scan method");
      return await this.searchEventsWithLimit(filters);
    }
  }

  /**
   * Helper function to search by categories using scan method
   */
  private async searchEventsByCategories(
    filters: SearchFilters
  ): Promise<Event[]> {
    const startTime = Date.now();
    console.log(
      "🏷️ Searching by categories using scan method:",
      filters.categories
    );

    try {
      // Use scan method directly since we removed the GSI
      console.log("📊 Using scan method for category search");

      const results = await this.searchEventsWithLimit(filters);

      const totalTime = Date.now() - startTime;
      console.log(
        `⏱️ Category search completed in ${totalTime}ms, found ${results.length} events`
      );

      return results;
    } catch (error) {
      console.error("❌ Error in category search:", error);
      return [];
    }
  }

  /**
   * Helper function to search by date range
   */
  private async searchEventsByDate(filters: SearchFilters): Promise<Event[]> {
    const startTime = Date.now();
    console.log("📅 Searching by date range:", filters.dateRange);

    try {
      // For now, fall back to limited scan since we don't have a date index
      // In production, you'd want to create a GSI on the date field
      console.log("⚠️ No date index available, using limited scan");
      return await this.searchEventsWithLimit(filters);
    } catch (error) {
      console.error("❌ Error in date search:", error);
      return await this.searchEventsWithLimit(filters);
    }
  }

  /**
   * Helper function to search with limits to prevent timeouts
   */
  private async searchEventsWithLimit(
    filters: SearchFilters
  ): Promise<Event[]> {
    const startTime = Date.now();
    console.log("📊 Using scan with limits");
    console.log("🔍 Filters received:", JSON.stringify(filters, null, 2));

    try {
      // Build basic scan parameters
      const scanParams: any = {
        TableName: this.tableName,
        // Remove the limit to get all matching events
        FilterExpression:
          "(begins_with(#pk, :eventPrefixNew) OR begins_with(#pk, :eventPrefixOld))",
        ExpressionAttributeNames: {
          "#pk": "pk",
        },
        ExpressionAttributeValues: {
          ":eventPrefixNew": { S: "EVENT-" },
          ":eventPrefixOld": { S: "EVENT#" },
        },
      };

      // Add ProjectionExpression if fields are specified
      if (filters.fields && filters.fields.length > 0) {
        console.log(
          "🎯 Adding ProjectionExpression for fields:",
          filters.fields
        );

        // Always include pk as it's required for the primary key
        const requiredFields = ["pk"];
        const allFields = [...new Set([...requiredFields, ...filters.fields])];

        scanParams.ProjectionExpression = allFields
          .map((_, index) => `#f${index}`)
          .join(", ");

        // Add field names to ExpressionAttributeNames
        allFields.forEach((field, index) => {
          scanParams.ExpressionAttributeNames[`#f${index}`] = field;
        });
      }

      // Build the complete filter expression - handle both old and new prefixes
      let filterExpressions = [
        "(begins_with(#pk, :eventPrefixNew) OR begins_with(#pk, :eventPrefixOld))",
      ];

      // Add category filter if specified (case-insensitive)
      if (filters.categories && filters.categories.length > 0) {
        console.log(
          "🏷️ Adding category filter to scan for:",
          filters.categories
        );

        // Note: DynamoDB FilterExpressions don't support case-insensitive comparisons directly
        // We'll filter in application code after fetching for case-insensitive matching
        // Store normalized categories for later filtering
        const normalizedCategories = filters.categories.map((cat: string) =>
          cat.toLowerCase().trim()
        );
        scanParams._normalizedCategories = normalizedCategories;
      }

      // Add isPublic filter
      if (filters.isPublic !== undefined) {
        scanParams.ExpressionAttributeNames["#isPublic"] = "isPublic";
        scanParams.ExpressionAttributeValues[":isPublic"] = {
          S: filters.isPublic.toString(),
        };
        filterExpressions.push("#isPublic = :isPublic");
      } else {
        // Default to only public events if no filter specified
        scanParams.ExpressionAttributeNames["#isPublic"] = "isPublic";
        scanParams.ExpressionAttributeValues[":isPublic"] = { S: "true" };
        filterExpressions.push("#isPublic = :isPublic");
      }

      // Set the final filter expression
      scanParams.FilterExpression = filterExpressions.join(" AND ");

      console.log("🔧 Final scan params:", JSON.stringify(scanParams, null, 2));
      console.log("🔍 Filter expression:", scanParams.FilterExpression);
      console.log(
        "📝 Expression attribute names:",
        scanParams.ExpressionAttributeNames
      );
      console.log(
        "💎 Expression attribute values:",
        scanParams.ExpressionAttributeValues
      );

      const command = new ScanCommand(scanParams);
      const result = await this.client.send(command);

      const totalTime = Date.now() - startTime;
      console.log(
        `⏱️ Limited scan completed in ${totalTime}ms, found ${
          result.Items?.length || 0
        } events`
      );

      if (!result.Items) return [];

      let events = result.Items.map((item) => unmarshall(item) as Event);
      console.log(`🔄 Unmarshalled ${events.length} events from scan`);

      // Apply case-insensitive category filter if specified
      if (filters.categories && filters.categories.length > 0) {
        const normalizedCategories = filters.categories.map((cat: string) =>
          cat.toLowerCase().trim()
        );
        events = events.filter((event) => {
          if (!event.category) return false;

          let eventCategories: string[] = [];
          if (Array.isArray(event.category)) {
            eventCategories = event.category.map((cat: string) =>
              cat.toLowerCase().trim()
            );
          } else {
            eventCategories = event.category
              .split(",")
              .map((cat: string) => cat.toLowerCase().trim());
          }

          // Check if any of the normalized search categories match any of the event's categories
          return normalizedCategories.some((searchCat) =>
            eventCategories.includes(searchCat)
          );
        });
        console.log(
          `🏷️ After case-insensitive category filter: ${events.length} events`
        );
      }

      // Apply additional filters client-side (only if not already handled by scan)
      if (
        filters.query ||
        (filters.costRange &&
          (filters.costRange.min !== undefined ||
            filters.costRange.max !== undefined))
      ) {
        events = this.applyClientSideFilters(events, filters);
      }

      // Apply limit after all filtering is done
      if (filters.limit) {
        events = events.slice(0, filters.limit);
        console.log(
          `📏 Applied limit: ${filters.limit}, final result: ${events.length} events`
        );
      }

      console.log(
        `🎯 Final result: ${events.length} events after all filtering`
      );
      return events;
    } catch (error) {
      console.error("❌ Error in limited scan:", error);
      return [];
    }
  }

  /**
   * Helper function to apply filters client-side
   */
  private applyClientSideFilters(
    events: Event[],
    filters: SearchFilters
  ): Event[] {
    console.log("🔧 Applying client-side filters to", events.length, "events");

    if (filters.query) {
      const query = filters.query.toLowerCase();
      events = events.filter(
        (event) =>
          event.title?.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query) ||
          event.venue?.toLowerCase().includes(query) ||
          event.location?.toLowerCase().includes(query)
      );
      console.log(
        "🔍 Text search filtering completed, remaining events:",
        events.length
      );
    }

    // Note: Category filtering is now handled at the DynamoDB level for better performance
    // Only apply cost filtering client-side since it requires complex logic

    if (
      filters.costRange &&
      (filters.costRange.min !== undefined ||
        filters.costRange.max !== undefined)
    ) {
      console.log("💰 Applying client-side cost filtering");
      events = events.filter((event: any) => {
        if (!event.cost) return true;

        let eventCost = 0;
        if (typeof event.cost === "object" && event.cost.amount) {
          eventCost = parseFloat(event.cost.amount);
        } else if (typeof event.cost === "string") {
          eventCost = parseFloat(event.cost) || 0;
        }

        if (
          filters.costRange!.min !== undefined &&
          eventCost < filters.costRange!.min
        ) {
          return false;
        }

        if (
          filters.costRange!.max !== undefined &&
          eventCost > filters.costRange!.max
        ) {
          return false;
        }

        return true;
      });
      console.log(
        "💰 Cost filtering completed, remaining events:",
        events.length
      );
    }

    return events;
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS (for backward compatibility)
// ============================================================================

/**
 * Create a new instance with SST Resource table name
 */
export function createDynamoDBClient(): TouchGrassDynamoDB {
  return new TouchGrassDynamoDB();
}

/**
 * Create a new instance with custom table name
 */
export function createDynamoDBClientWithTable(
  tableName: string,
  region?: string
): TouchGrassDynamoDB {
  return new TouchGrassDynamoDB(tableName, region);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default TouchGrassDynamoDB;
