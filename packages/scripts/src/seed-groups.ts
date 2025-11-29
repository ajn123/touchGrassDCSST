import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import * as fs from "fs";
import * as path from "path";
import { Resource } from "sst";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  console.log(
    "🔍 Checking for existing GROUP_INFO items to avoid duplicates..."
  );

  // Get existing GROUP_INFO items only (not schedule items)
  // This ensures we only skip groups that actually have GROUP_INFO items
  const existingGroupsCommand = new ScanCommand({
    TableName: tableName,
    FilterExpression: "begins_with(pk, :groupPrefix) AND sk = :groupInfo",
    ExpressionAttributeValues: {
      ":groupPrefix": { S: "GROUP#" },
      ":groupInfo": { S: "GROUP_INFO" },
    },
    ProjectionExpression: "pk",
  });

  const existingGroupsResult = await client.send(existingGroupsCommand);
  const existingGroupIds = new Set(
    existingGroupsResult.Items?.map((item) => item.pk?.S).filter(Boolean) || []
  );

  console.log(
    `📋 Found ${existingGroupIds.size} existing GROUP_INFO items in database`
  );

  try {
    // Read the groups.json file from project root
    // Script is in packages/scripts/src/, so go up 3 levels to project root
    const projectRoot = path.resolve(__dirname, "../../..");
    const groupsPath = path.join(projectRoot, "groups.json");
    console.log("  - Groups file path:", groupsPath);
    console.log("  - Groups file exists:", fs.existsSync(groupsPath));

    const groupsData: Group[] = JSON.parse(fs.readFileSync(groupsPath, "utf8"));

    console.log(`Found ${groupsData.length} groups to seed`);

    const items: any[] = [];
    let skippedCount = 0;
    let newGroupsCount = 0;

    // Process each group
    for (const group of groupsData) {
      const groupPk = `GROUP#${group.title}`;

      // Skip if GROUP_INFO already exists (only check GROUP_INFO, not schedule items)
      if (existingGroupIds.has(groupPk)) {
        console.log(
          `⏭️  Skipping existing group: ${group.title} (GROUP_INFO already exists)`
        );
        skippedCount++;
        continue;
      }

      newGroupsCount++;
      console.log(`➕ Adding new group: ${group.title}`);

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

    console.log(`\n📊 Processing Summary:`);
    console.log(`   - Total groups in file: ${groupsData.length}`);
    console.log(`   - New groups to add: ${newGroupsCount}`);
    console.log(`   - Skipped (already exist): ${skippedCount}`);
    console.log(`   - Total items to insert: ${items.length}`);

    // Log GROUP_INFO items specifically
    const groupInfoItems = items.filter((item) => item.sk === "GROUP_INFO");
    const scheduleItems = items.filter((item) =>
      item.sk?.startsWith("SCHEDULE#")
    );
    console.log(`\n📦 Item breakdown:`);
    console.log(`   - GROUP_INFO items: ${groupInfoItems.length}`);
    console.log(`   - SCHEDULE items: ${scheduleItems.length}`);
    if (groupInfoItems.length > 0) {
      console.log(
        `   - Sample GROUP_INFO item:`,
        JSON.stringify(groupInfoItems[0], null, 2)
      );
    }

    // Use Step Functions for DB insertion and OpenSearch indexing
    console.log(`🚀 Using Step Functions for ${items.length} group items`);
    console.log(
      `   This will: normalize (pass-through) → save to DB → index to OpenSearch`
    );

    const config = {};
    const sfnClient = new SFNClient(config);

    // Generate unique execution name with timestamp
    const executionName = `seed-groups-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Transform group items to events format for step function
    // The step function expects events, but we'll pass groups with eventType "group"
    // The normalize step will pass them through (default case), then DB insert and reindex will handle them
    const groupsAsEvents = items.map((item) => {
      const transformed = {
        // Map group item to event-like structure for step function
        pk: item.pk,
        sk: item.sk, // ← Critical: preserve sk value
        title: item.title,
        description: item.description,
        category: item.category,
        image_url: item.image_url,
        socials: item.socials,
        isPublic: item.isPublic,
        createdAt: item.createdAt,
        // Group-specific fields
        scheduleDay: item.scheduleDay,
        scheduleTime: item.scheduleTime,
        scheduleLocation: item.scheduleLocation,
        // Mark as group for handlers
        type: "group",
        isGroup: true,
      };

      // Log GROUP_INFO items to verify sk is preserved
      if (item.sk === "GROUP_INFO") {
        console.log(
          `✅ Preserving GROUP_INFO item: pk=${transformed.pk}, sk=${transformed.sk}`
        );
      }

      return transformed;
    });

    // Verify GROUP_INFO items are in the payload
    const groupInfoInPayload = groupsAsEvents.filter(
      (item) => item.sk === "GROUP_INFO"
    );
    console.log(
      `🔍 Verification: ${groupInfoInPayload.length} GROUP_INFO items in Step Functions payload`
    );

    const inputObject = {
      stateMachineArn: Resource.normaizeEventStepFunction.arn,
      input: JSON.stringify({
        events: groupsAsEvents,
        source: "seed-groups",
        eventType: "group",
      }),
      name: executionName,
    };

    const command = new StartExecutionCommand(inputObject);
    const response = await sfnClient.send(command);

    console.log(`✅ Step Functions execution started:`);
    console.log(`   📊 Group items: ${items.length}`);
    console.log(`   🔄 Execution ARN: ${response.executionArn}`);
    console.log(`   📝 Execution Name: ${executionName}`);
    console.log(
      `   ⏱️  The workflow will process groups, save to DynamoDB, and index to OpenSearch`
    );

    console.log(
      "✅ Groups seeding initiated! Check Step Functions console for progress."
    );

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
