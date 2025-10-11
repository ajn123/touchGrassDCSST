import {
  DynamoDBClient,
  PutItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import * as fs from "fs";
import * as path from "path";
import { Resource } from "sst";

interface Venue {
  title: string;
  description?: string;
  category?: string[];
  image_url?: string;
  location?: string;
  cost?: {
    type: string;
    currency: string;
    amount: number | string;
  };
  socials?: {
    website?: string;
    instagram?: string;
    facebook?: string;
    twitter?: string;
    tickets?: string;
  };
  schedules?: Array<{
    days: string[];
    recurrence_type: string;
    time: string;
    location?: string;
  }>;
  isPublic: boolean;
}

async function seedVenues() {
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION || "us-east-1",
  });
  const tableName = Resource.Db.name;

  console.log("🔍 Debug info:");
  console.log("  - AWS_REGION:", process.env.AWS_REGION || "us-east-1");
  console.log("  - Using SST table name:", tableName);
  console.log("  - Current working directory:", process.cwd());

  console.log("🔍 Checking for existing venues to avoid duplicates...");

  // Get existing venue IDs to avoid duplicates
  const existingVenuesCommand = new ScanCommand({
    TableName: tableName,
    FilterExpression: "begins_with(pk, :venuePrefix)",
    ExpressionAttributeValues: {
      ":venuePrefix": { S: "VENUE#" },
    },
    ProjectionExpression: "pk",
  });

  const existingVenuesResult = await client.send(existingVenuesCommand);
  const existingVenueIds = new Set(
    existingVenuesResult.Items?.map((item) => item.pk?.S).filter(Boolean) || []
  );

  console.log(`📋 Found ${existingVenueIds.size} existing venues in database`);

  try {
    // Read the venues.json file
    const venuesPath = path.join(process.cwd(), "venues.json");
    console.log("  - Venues file path:", venuesPath);
    console.log("  - Venues file exists:", fs.existsSync(venuesPath));

    const venuesData: Venue[] = JSON.parse(fs.readFileSync(venuesPath, "utf8"));

    console.log(`Found ${venuesData.length} venues to seed`);

    const items: any[] = [];

    // Process each venue
    for (const venue of venuesData) {
      const venuePk = `VENUE#${venue.title}`;

      // Skip if venue already exists
      if (existingVenueIds.has(venuePk)) {
        console.log(`⏭️  Skipping existing venue: ${venue.title}`);
        continue;
      }

      // Always create an INFO item for the venue
      const venueInfoItem = {
        pk: `VENUE#${venue.title}`,
        sk: "VENUE_INFO", // Sort key for venue info
        // Venue information only
        title: venue.title,
        description: venue.description || "",
        category:
          venue.category && venue.category.length > 0
            ? venue.category.join(",")
            : "Uncategorized",
        image_url: venue.image_url || "",
        location: venue.location || "",
        socials: venue.socials || {},
        isPublic: (venue.isPublic ?? true).toString(),
        createdAt: Date.now(),
      };

      // Add cost information if available
      if (venue.cost) {
        venueInfoItem.cost = venue.cost;
      }

      items.push(venueInfoItem);

      if (venue.schedules && venue.schedules.length > 0) {
        // Create an item for each schedule
        for (const schedule of venue.schedules) {
          for (const day of schedule.days) {
            // Create sort key: day_time_location (sanitized)
            const sortKey = `${day}_${schedule.time.replace(/[:\s]/g, "")}_${
              schedule.location?.replace(/[^a-zA-Z0-9]/g, "") ||
              venue.title.replace(/[^a-zA-Z0-9]/g, "")
            }`;

            const item = {
              pk: `VENUE#${venue.title}`,
              sk: `SCHEDULE#${sortKey}`,
              // Schedule-specific information
              title: venue.title,
              category:
                venue.category && venue.category.length > 0
                  ? venue.category.join(",")
                  : "Uncategorized",
              isPublic: (venue.isPublic ?? true).toString(),
              scheduleDay: day,
              scheduleTime: schedule.time,
              scheduleLocation: schedule.location || venue.location || "",
              createdAt: Date.now(),
            };

            items.push(item);
          }
        }
      }
    }

    console.log(`Created ${items.length} items to insert`);

    // Insert items one by one
    console.log(`Inserting ${items.length} items individually...`);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      try {
        const marshalledItem = marshall(item, { removeUndefinedValues: true });

        const putCommand = new PutItemCommand({
          TableName: tableName,
          Item: marshalledItem,
        });

        await client.send(putCommand);
        console.log(
          `✅ Inserted item ${i + 1}/${items.length}: ${item.pk} | ${item.sk}`
        );
      } catch (error) {
        console.error(`❌ Failed to insert item ${i + 1}/${items.length}:`, {
          pk: item.pk,
          sk: item.sk,
          error: error instanceof Error ? error.message : String(error),
        });

        // Continue with next item instead of failing completely
        continue;
      }
    }

    console.log("✅ Venues seeding completed!");

    // Show example queries
    console.log("\n📋 Example queries you can now run:");
    console.log(`1. Get all schedules for "American History Museum":`);
    console.log(`   Query with pk = "VENUE#American History Museum"`);
    console.log(`2. Get specific schedule:`);
    console.log(
      `   Query with pk = "VENUE#American History Museum" AND sk = "SCHEDULE#Monday_1000AM_530PM"`
    );
    console.log(`3. Get all venues by category:`);
    console.log(`   Use GSI: venueCategoryIndex with hashKey = "Museum"`);
  } catch (error) {
    console.error("❌ Error seeding venues:", error);
    throw error;
  }
}

// Run the seeding function
seedVenues()
  .then(() => {
    console.log("Venues seeding completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Venues seeding failed:", error);
    process.exit(1);
  });

export { seedVenues };
