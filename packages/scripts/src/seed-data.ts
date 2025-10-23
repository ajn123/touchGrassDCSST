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

export async function main() {
  console.log("Seeding sample data...");

  // Load the test-map-event.json file for map testing
  const eventsPath = path.join(process.cwd(), "events.json");
  const eventsData = JSON.parse(fs.readFileSync(eventsPath, "utf8"));
  const sampleEvents = eventsData.events || eventsData;

  console.log(`Found ${sampleEvents.length} events to seed`);

  try {
    // Use Lambda normalization for batch processing
    console.log(
      `🚀 Using Lambda normalization for ${sampleEvents.length} seed events`
    );

    const response = await fetch(`${Resource.Api.url}/events/normalize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        events: sampleEvents,
        source: "seed-data",
        eventType: "seed-data",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log(`✅ Lambda normalization completed:`);
    console.log(`   📊 Processed: ${sampleEvents.length} events`);
    console.log(`   💾 Inserted: ${result.savedCount} events`);
    console.log(`   ⏱️ Execution time: ${result.executionTime}ms`);
    console.log(
      `📊 Event IDs: ${result.eventIds.slice(0, 3).join(", ")}${
        result.eventIds.length > 3 ? "..." : ""
      }`
    );

    console.log("Seeding complete!");
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    throw error;
  }
}

main().catch(console.error);
