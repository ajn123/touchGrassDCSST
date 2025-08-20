import {
  BatchWriteItemCommand,
  DynamoDBClient,
  PutItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { Resource } from "sst";

/**
 * IMPORTANT: To show actual place names (like "Penn Social") instead of coordinates on Google Maps:
 *
 * 1. Use the `placeId` field when creating Google Maps markers
 * 2. Use the `location` field (actual place name) for display text
 * 3. Use the `coordinates` field for positioning
 *
 * Example Google Maps integration:
 * ```javascript
 * // Instead of this (shows coordinates):
 * new google.maps.Marker({
 *   position: { lat: 38.8977, lng: -77.0365 },
 *   title: "Penn Social"
 * });
 *
 * // Use this (shows place name):
 * new google.maps.Marker({
 *   position: { lat: 38.8977, lng: -77.0365 },
 *   title: event.location, // "Penn Social"
 *   placeId: event.placeId // "ChIJ..." - for rich place data
 * });
 * ```
 */

// Load environment variables from .env file
dotenv.config();

// Type definitions for Google Maps API response
interface GeocodingResult {
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  formatted_address: string;
}

interface GeocodingResponse {
  status: string;
  results?: GeocodingResult[];
  error_message?: string;
}

// Enhanced geocoding function that returns the actual address for Google Maps
async function geocodeAddress(address: string): Promise<{
  latitude: number;
  longitude: number;
  formattedAddress: string;
  placeId: string;
  actualAddress: string;
} | null> {
  try {
    if (!address) {
      console.log("No address provided for geocoding");
      return null;
    }

    // Get API key from environment variables
    const apiKey =
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.log("No Google Maps API key found in environment variables");
      console.log(
        "Please set the GOOGLE_MAPS_API_KEY environment variable or add it to your .env file"
      );
      return null;
    }

    console.log(`Using API key: ${apiKey.substring(0, 10)}...`);

    // First, geocode to get coordinates and Place ID
    const encodedAddress = encodeURIComponent(address);
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = (await geocodeResponse.json()) as GeocodingResponse;

    console.log(
      `Geocoding response for "${address}":`,
      JSON.stringify(geocodeData, null, 2)
    );

    if (
      geocodeData.status === "OK" &&
      geocodeData.results &&
      geocodeData.results.length > 0
    ) {
      const result = geocodeData.results[0];
      const location = result.geometry.location;
      const placeId = result.place_id;

      // Now get detailed place information using Place Details API
      const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,address_components,geometry&key=${apiKey}`;

      const placeResponse = await fetch(placeDetailsUrl);
      const placeData = await placeResponse.json();

      console.log(
        `Place details response for "${address}":`,
        JSON.stringify(placeData, null, 2)
      );

      if (placeData.status === "OK" && placeData.result) {
        const place = placeData.result;

        // Use the official place name if available, otherwise use formatted address
        const actualAddress =
          place.name || place.formatted_address || result.formatted_address;

        return {
          latitude: location.lat,
          longitude: location.lng,
          formattedAddress: place.formatted_address || result.formatted_address,
          placeId: placeId,
          actualAddress: actualAddress,
        };
      } else {
        // Fallback to geocoding data if place details fail
        return {
          latitude: location.lat,
          longitude: location.lng,
          formattedAddress: result.formatted_address,
          placeId: placeId,
          actualAddress: result.formatted_address,
        };
      }
    } else {
      console.log(
        `Geocoding failed for "${address}" with status: ${geocodeData.status}`
      );
      if (geocodeData.error_message) {
        console.log(`Error message: ${geocodeData.error_message}`);
      }
    }

    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

export async function main() {
  console.log("Seeding sample data...");

  const client = new DynamoDBClient({
    region: process.env.AWS_REGION || "us-east-1",
  });

  // Load the test-map-event.json file for map testing
  const eventsPath = path.join(process.cwd(), "events.json");
  const eventsData = JSON.parse(fs.readFileSync(eventsPath, "utf8"));
  const sampleEvents = eventsData.events || eventsData;

  console.log(`Found ${sampleEvents.length} events to seed`);

  console.log("🗑️  Deleting all events from the database...");

  // First, scan the table to get all items
  const scanCommand: any = {
    TableName: Resource.Db.name,
  };

  let allItems: any[] = [];
  let lastEvaluatedKey = undefined;

  do {
    const scanParams: any = {
      ...scanCommand,
      ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey }),
    };

    const scanResult = await client.send(new ScanCommand(scanParams));
    if (scanResult.Items) {
      allItems = allItems.concat(scanResult.Items);
    }
    lastEvaluatedKey = scanResult.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`📋 Found ${allItems.length} items to delete`);

  // Delete all items in batches
  const batchSize = 25; // DynamoDB batch delete limit
  for (let i = 0; i < allItems.length; i += batchSize) {
    const batch = allItems.slice(i, i + batchSize);

    const deleteRequests = batch.map((item) => ({
      DeleteRequest: {
        Key: {
          pk: item.pk,
          sk: item.sk,
        },
      },
    }));

    const batchDeleteCommand = {
      RequestItems: {
        [Resource.Db.name]: deleteRequests,
      },
    };

    try {
      await client.send(new BatchWriteItemCommand(batchDeleteCommand));
      console.log(
        `🗑️  Deleted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          allItems.length / batchSize
        )}`
      );
    } catch (error) {
      console.error(
        `❌ Error deleting batch ${Math.floor(i / batchSize) + 1}:`,
        error
      );
    }
  }

  console.log("✅ All events deleted successfully!");

  for (const eventData of sampleEvents) {
    try {
      // Use a consistent eventId based on the event data
      const eventId =
        eventData.id ||
        `EVENT#${eventData.title
          ?.replace(/\s+/g, "-")
          .toLowerCase()}-${Date.now()}`;
      const timestamp = Date.now();

      // Handle category field - ensure it's a string
      let category = eventData.category;
      if (Array.isArray(category)) {
        category = category.join(", ");
      } else if (typeof category !== "string") {
        category = "Uncategorized";
      }

      // Create the item with proper DynamoDB formatting
      const item = {
        pk: eventId,
        sk: eventId,
        ...eventData,
        category, // Override with the processed category
        updatedAt: timestamp,
        createdAt: timestamp,
      };

      // Add titlePrefix for efficient title searches (first 3 characters)
      if (eventData.title && typeof eventData.title === "string") {
        const titlePrefix = eventData.title
          .trim()
          .toLowerCase()
          .substring(0, 3);
        if (titlePrefix.length > 0) {
          item.titlePrefix = titlePrefix;
          console.log(
            `🏷️ Added titlePrefix for "${eventData.title}": "${titlePrefix}"`
          );
        }
      }

      // Add is_public field (default to true for seed data)
      item.is_public =
        eventData.is_public !== undefined ? eventData.is_public : true;

      // Handle location data specifically (simulate the createEvent logic)
      const location = eventData.location;
      const latitude = eventData.latitude;
      const longitude = eventData.longitude;

      if (location) {
        item.location = location;
      }

      // If coordinates are provided, use them; otherwise try to geocode the address
      if (latitude && longitude) {
        item.coordinates = `${latitude},${longitude}`;
        console.log(
          `📍 Event "${eventData.title}" using provided coordinates: ${latitude},${longitude}`
        );
      } else if (location && !latitude && !longitude) {
        // Try to geocode the address to get coordinates and actual address
        try {
          console.log(
            `📍 Geocoding address for "${eventData.title}": ${location}`
          );
          const geocoded = await geocodeAddress(location);
          if (geocoded) {
            item.coordinates = `${geocoded.latitude},${geocoded.longitude}`;
            // Store both the actual place name and the formatted address
            item.location = geocoded.actualAddress;
            item.formattedAddress = geocoded.formattedAddress;
            // Store the place ID for future reference
            item.placeId = geocoded.placeId;
            console.log(
              `✅ Geocoded "${eventData.title}" to: ${geocoded.actualAddress} (${geocoded.latitude},${geocoded.longitude})`
            );
            console.log(
              `📍 Place ID: ${geocoded.placeId} - Use this for Google Maps integration`
            );
          } else {
            console.log(
              `❌ Failed to geocode address for "${eventData.title}": ${location}`
            );
          }
        } catch (error) {
          console.error(`❌ Geocoding error for "${eventData.title}":`, error);
          // Continue without coordinates if geocoding fails
        }
      }

      const command = new PutItemCommand({
        TableName: Resource.Db.name,
        Item: marshall(item),
      });

      await client.send(command);
      console.log(
        `✅ Created event: ${eventData.title || eventData.id || "Unknown"}`
      );
    } catch (error) {
      console.error(
        `❌ Failed to create event: ${
          eventData.title || eventData.id || "Unknown"
        }`,
        error
      );
    }
  }

  console.log("Seeding complete!");
}

main().catch(console.error);
