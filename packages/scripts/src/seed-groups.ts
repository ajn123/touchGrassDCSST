import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import * as fs from "fs";
import * as path from "path";
import { Resource } from "sst";

interface Group {
  title: string;
  description?: string;
  category?: string[];
  image_url?: string;
  cost?: {
    type: string;
    currency: string;
    amount: number;
  };
  socials?: {
    website?: string;
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  schedules?: Array<{
    days: string[];
    recurrence_type: string;
    time: string;
    location: string;
  }>;
  isPublic: boolean;
}

async function seedGroups() {
  const client = new DynamoDBClient({
    region: process.env.AWS_REGION || "us-east-1",
  });
  const tableName = Resource.Db.name; // Use SST Resource to get the actual table name

  console.log("🔍 Debug info:");
  console.log("  - AWS_REGION:", process.env.AWS_REGION || "us-east-1");
  console.log("  - Using SST table name:", tableName);
  console.log("  - Table name length:", tableName.length);
  console.log("  - Current working directory:", process.cwd());

  try {
    // Read the groups.json file
    const groupsPath = path.join(process.cwd(), "groups.json");
    console.log("  - Groups file path:", groupsPath);
    console.log("  - Groups file exists:", fs.existsSync(groupsPath));

    const groupsData: Group[] = JSON.parse(fs.readFileSync(groupsPath, "utf8"));

    console.log(`Found ${groupsData.length} groups to seed`);

    const items: any[] = [];

    // Process each group
    for (const group of groupsData) {
      // Always create an INFO item for the group
      const groupInfoItem = {
        pk: `GROUP#${group.title}`,
        sk: "GROUP_INFO", // Sort key for group info
        // Group information only - only fields defined in table
        title: group.title,
        description: group.description,
        category:
          group.category && group.category.length > 0
            ? group.category.join(",")
            : "Uncategorized",
        image_url: group.image_url || "",
        socials: group.socials || {},
        isPublic: (group.isPublic ?? true).toString(),
        createdAt: Date.now(), // Keep as number for DynamoDB
      };
      items.push(groupInfoItem);

      if (group.schedules && group.schedules.length > 0) {
        // Create an item for each schedule
        for (const schedule of group.schedules) {
          for (const day of schedule.days) {
            // Create sort key: day_time_location (sanitized)
            const sortKey = `${day}_${schedule.time.replace(
              /[:\s]/g,
              ""
            )}_${schedule.location?.replace(/[^a-zA-Z0-9]/g, "")}`;

            const item = {
              pk: `GROUP#${group.title}`, // Partition key: GROUP#The Ballston Runaways
              sk: `SCHEDULE#${sortKey}`, // Sort key: SCHEDULE#Tuesday_615AM_CompassCoffeeBallstonVA
              // Schedule-specific information only - only fields defined in table
              title: group.title, // Required field
              category:
                group.category && group.category.length > 0
                  ? group.category.join(",")
                  : "Uncategorized", // Required field - store as comma-separated string
              isPublic: (group.isPublic ?? true).toString(), // Required field, default to true, convert to string
              scheduleDay: day,
              scheduleTime: schedule.time,
              scheduleLocation: schedule.location,
              createdAt: Date.now(), // Keep as number for DynamoDB
            };

            items.push(item);
          }
        }
      }
    }

    console.log(`Created ${items.length} items to insert`);

    // Debug: Log all items to see what fields are being sent
    if (items.length > 0) {
      console.log("First item fields:", Object.keys(items[0]));
      console.log("First item:", JSON.stringify(items[0], null, 2));

      // Log all items to see if there are any issues
      items.forEach((item, index) => {
        console.log(`Item ${index + 1} fields:`, Object.keys(item));
        console.log(`Item ${index + 1} pk:`, item.pk);
        console.log(`Item ${index + 1} sk:`, item.sk);

        // Check each field name for validation issues
        Object.keys(item).forEach((fieldName) => {
          if (fieldName.length < 3) {
            console.log(
              `⚠️  Field "${fieldName}" is too short (${fieldName.length} chars)`
            );
          }
          if (fieldName.length > 255) {
            console.log(
              `⚠️  Field "${fieldName}" is too long (${fieldName.length} chars)`
            );
          }
          if (!/^[a-zA-Z0-9_.-]+$/.test(fieldName)) {
            console.log(`⚠️  Field "${fieldName}" contains invalid characters`);
          }
        });
      });
    }

    // Insert items one by one instead of batching
    console.log(`Inserting ${items.length} items individually...`);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      try {
        // Debug: Show what the marshalled item looks like
        const marshalledItem = marshall(item, { removeUndefinedValues: true });
        console.log(
          `🔍 Item ${i + 1} marshalled:`,
          JSON.stringify(marshalledItem, null, 2)
        );

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

    console.log("✅ Groups seeding completed!");

    // Show example queries
    console.log("\n📋 Example queries you can now run:");
    console.log(`1. Get all schedules for "The Ballston Runaways":`);
    console.log(`   Query with pk = "GROUP#The Ballston Runaways"`);
    console.log(`2. Get specific schedule:`);
    console.log(
      `   Query with pk = "GROUP#The Ballston Runaways" AND sk = "SCHEDULE#Tuesday_615AM_CompassCoffeeBallstonVA"`
    );
    console.log(`3. Get all groups by category:`);
    console.log(`   Use GSI: groupCategoryIndex with hashKey = "Sports"`);
    console.log(`4. Get all schedules for a group:`);
    console.log(
      `   Use GSI: groupTitleIndex with hashKey = "The Ballston Runaways"`
    );
  } catch (error) {
    console.error("❌ Error seeding groups:", error);
    throw error;
  }
}

// Run the seeding function
seedGroups()
  .then(() => {
    console.log("Seeding completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });

export { seedGroups };
