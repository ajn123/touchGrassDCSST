#!/usr/bin/env tsx
/**
 * Find Next.js/Web application log groups and search for the JSON parsing error
 */

import { CloudWatchLogsClient, DescribeLogGroupsCommand, FilterLogEventsCommand } from "@aws-sdk/client-cloudwatch-logs";

const cloudwatch = new CloudWatchLogsClient({ region: "us-east-1" });

async function main() {
  console.log("🔍 Finding Next.js/Web application log groups...\n");

  const allLogGroups: string[] = [];
  let nextToken: string | undefined;

  do {
    const command = new DescribeLogGroupsCommand({ nextToken, limit: 50 });
    const response = await cloudwatch.send(command);
    if (response.logGroups) {
      allLogGroups.push(...(response.logGroups.map(lg => lg.logGroupName || "").filter(Boolean)));
    }
    nextToken = response.nextToken;
  } while (nextToken);

  console.log(`Found ${allLogGroups.length} total log groups\n`);

  // Filter for Next.js/web related log groups
  const relevantGroups = allLogGroups.filter(name => 
    name.includes("nextjs") || 
    name.includes("Nextjs") || 
    name.includes("web") || 
    name.includes("api") ||
    name.includes("touchgrass") ||
    name.includes("production") ||
    name.includes("analytics")
  );

  console.log(`Found ${relevantGroups.length} potentially relevant log groups:\n`);
  relevantGroups.forEach(g => console.log(`  - ${g}`));

  // Search for the error in these groups
  const startTime = Date.now() - 7 * 24 * 60 * 60 * 1000;
  console.log("\n" + "=".repeat(80));
  console.log("\n🔍 Searching for 'position 222' error in relevant log groups...\n");

  for (const logGroupName of relevantGroups) {
    try {
      const command = new FilterLogEventsCommand({
        logGroupName,
        startTime,
        filterPattern: "position 222",
        limit: 10,
      });
      const response = await cloudwatch.send(command);
      
      if (response.events && response.events.length > 0) {
        console.log(`\n❌ FOUND ERRORS in ${logGroupName}:\n`);
        response.events.forEach((event, idx) => {
          const timestamp = new Date(event.timestamp || 0).toISOString();
          console.log(`[${idx + 1}] ${timestamp}`);
          console.log(`    ${event.message}`);
          console.log();
        });
      }
    } catch (error: any) {
      // Ignore
    }
  }

  // Also search for SyntaxError
  console.log("\n" + "=".repeat(80));
  console.log("\n🔍 Searching for SyntaxError in relevant log groups...\n");

  for (const logGroupName of relevantGroups) {
    try {
      const command = new FilterLogEventsCommand({
        logGroupName,
        startTime,
        filterPattern: "SyntaxError",
        limit: 10,
      });
      const response = await cloudwatch.send(command);
      
      if (response.events && response.events.length > 0) {
        console.log(`\n⚠️  FOUND SyntaxError in ${logGroupName}:\n`);
        response.events.forEach((event, idx) => {
          const timestamp = new Date(event.timestamp || 0).toISOString();
          const msg = event.message || "";
          if (msg.includes("position 222") || msg.includes("JSON")) {
            console.log(`[${idx + 1}] ${timestamp}`);
            console.log(`    ${msg.substring(0, 500)}`);
            console.log();
          }
        });
      }
    } catch (error: any) {
      // Ignore
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("\n💡 If no errors found, check:");
  console.log("   - AWS Console > CloudWatch > Log Groups");
  console.log("   - Look for log groups with your SST app name");
  console.log("   - Check Next.js serverless function logs");
  console.log("\n");
}

main().catch(console.error);

