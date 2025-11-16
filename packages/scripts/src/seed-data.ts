import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
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

  // Load the events.json file
  const eventsPath = path.join(process.cwd(), "events.json");
  const eventsData = JSON.parse(fs.readFileSync(eventsPath, "utf8"));
  const sampleEvents = eventsData.events || eventsData;

  console.log(`Found ${sampleEvents.length} events to seed`);

  try {
    // Use Step Functions for normalization, DB insertion, and OpenSearch indexing
    console.log(
      `🚀 Using Step Functions for ${sampleEvents.length} seed events`
    );
    console.log(`   This will: normalize → save to DB → index to OpenSearch`);

    const config = {};
    const client = new SFNClient(config);

    // Generate unique execution name with timestamp
    const executionName = `seed-data-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const inputObject = {
      stateMachineArn: Resource.normaizeEventStepFunction.arn,
      input: JSON.stringify({
        events: sampleEvents,
        source: "seed-data",
        eventType: "seed-data",
      }),
      name: executionName,
    };

    const command = new StartExecutionCommand(inputObject);
    const response = await client.send(command);

    console.log(`✅ Step Functions execution started:`);
    console.log(`   📊 Events: ${sampleEvents.length}`);
    console.log(`   🔄 Execution ARN: ${response.executionArn}`);
    console.log(`   📝 Execution Name: ${executionName}`);
    console.log(
      `   ⏱️  The workflow will normalize events, save to DynamoDB, and index to OpenSearch`
    );

    console.log("Seeding complete! Check Step Functions console for progress.");
  } catch (error) {
    console.error("❌ Error seeding data:", error);
    throw error;
  }
}

main().catch(console.error);
