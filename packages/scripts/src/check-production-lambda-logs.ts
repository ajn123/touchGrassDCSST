#!/usr/bin/env tsx
/**
 * Script to check logs for the production addEventToDBFunction
 * Usage: tsx src/check-production-lambda-logs.ts [--days 1]
 */

import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  FilterLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";

const cloudwatch = new CloudWatchLogsClient({ region: "us-east-1" });

async function checkProductionLambdaLogs(days: number = 1) {
  console.log("🔍 Finding production addEventToDBFunction logs...\n");

  try {
    const listCommand = new DescribeLogGroupsCommand({
      logGroupNamePrefix: "/aws/lambda/",
    });
    const response = await cloudwatch.send(listCommand);

    if (response.logGroups) {
      // Find the production function log group
      const productionLogGroup = response.logGroups.find(
        (lg) =>
          lg.logGroupName?.includes("touchgrassdcsst-production") &&
          lg.logGroupName?.includes("addEventToDB")
      );

      if (!productionLogGroup) {
        console.log("⚠️  Production function log group not found");
        console.log("\n💡 Available log groups with 'addEventToDB':");
        response.logGroups
          .filter((lg) => lg.logGroupName?.includes("addEventToDB"))
          .forEach((lg) => {
            console.log(`   - ${lg.logGroupName}`);
          });
        return;
      }

      const logGroupName = productionLogGroup.logGroupName!;
      const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

      console.log(`📋 Log Group: ${logGroupName}`);
      console.log(`   Time range: Last ${days} day(s)\n`);
      console.log("=".repeat(80));

      // Get all errors
      const errorCommand = new FilterLogEventsCommand({
        logGroupName,
        startTime,
        filterPattern:
          "ERROR error Error exception Exception failed Failed ResourceNotFoundException",
        limit: 50,
      });

      const errorResponse = await cloudwatch.send(errorCommand);

      if (errorResponse.events && errorResponse.events.length > 0) {
        console.log(
          `\n❌ Found ${errorResponse.events.length} error log entries:\n`
        );
        errorResponse.events.slice(0, 30).forEach((event, index) => {
          const timestamp = new Date(event.timestamp || 0).toISOString();
          console.log(`[${index + 1}] ${timestamp}`);
          console.log(`    ${event.message}\n`);
        });
      } else {
        console.log(`✅ No errors found in logs\n`);
      }

      // Get all recent logs
      const allLogsCommand = new FilterLogEventsCommand({
        logGroupName,
        startTime,
        limit: 100,
      });

      const allLogs = await cloudwatch.send(allLogsCommand);
      if (allLogs.events && allLogs.events.length > 0) {
        console.log("\n" + "=".repeat(80));
        console.log(`📊 Recent execution logs (last 30):\n`);

        // Look for debug logs
        const debugLogs = allLogs.events.filter(
          (e) =>
            e.message?.includes("🔍") ||
            e.message?.includes("Attempting to get table name") ||
            e.message?.includes("Resource.Db") ||
            e.message?.includes("Using table name") ||
            e.message?.includes("Environment variable") ||
            e.message?.includes("DB_NAME") ||
            e.message?.includes("SST-related env vars")
        );

        if (debugLogs.length > 0) {
          console.log(`\n🔍 Found ${debugLogs.length} debug log entries:\n`);
          debugLogs.slice(-20).forEach((event) => {
            const timestamp = new Date(event.timestamp || 0).toISOString();
            const message = event.message || "";
            console.log(`[${timestamp}] ${message}`);
          });
          console.log("\n" + "-".repeat(80));
        }

        // Show recent logs
        allLogs.events.slice(-30).forEach((event) => {
          const timestamp = new Date(event.timestamp || 0).toISOString();
          const message = (event.message || "").substring(0, 400);
          console.log(`[${timestamp}] ${message}`);
        });
      } else {
        console.log(`⚠️  No logs found in the last ${days} day(s)`);
        console.log(`   This might mean the function hasn't been invoked yet.`);
      }
    }
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const days = args.includes("--days")
    ? parseInt(args[args.indexOf("--days") + 1]) || 1
    : 1;

  await checkProductionLambdaLogs(days);
}

main().catch(console.error);



