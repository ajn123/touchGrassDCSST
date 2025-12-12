#!/usr/bin/env tsx
/**
 * Script to find and check production function logs
 */

import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  FilterLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";

const cloudwatch = new CloudWatchLogsClient({ region: "us-east-1" });

async function findProductionLogs() {
  console.log("🔍 Finding production function log groups...\n");

  try {
    const listCommand = new DescribeLogGroupsCommand({
      logGroupNamePrefix: "/aws/lambda/",
    });
    const response = await cloudwatch.send(listCommand);

    if (response.logGroups) {
      const matching = response.logGroups.filter(
        (lg) =>
          lg.logGroupName?.includes("touchgrassdcsst-production") &&
          (lg.logGroupName?.includes("addEventToDB") ||
            lg.logGroupName?.includes("addEventToDb"))
      );

      console.log(`✅ Found ${matching.length} matching log group(s):\n`);

      for (const logGroup of matching) {
        console.log(`📋 ${logGroup.logGroupName}`);
        if (logGroup.creationTime) {
          console.log(
            `   Created: ${new Date(logGroup.creationTime).toISOString()}`
          );
        }
        if (logGroup.lastEventTime) {
          console.log(
            `   Last Event: ${new Date(logGroup.lastEventTime).toISOString()}`
          );
        }

        // Check for recent errors
        try {
          const startTime = Date.now() - 24 * 60 * 60 * 1000; // Last 24 hours
          const errorCommand = new FilterLogEventsCommand({
            logGroupName: logGroup.logGroupName!,
            startTime,
            filterPattern:
              "ERROR error Error exception Exception failed Failed ResourceNotFoundException",
            limit: 20,
          });

          const errorResponse = await cloudwatch.send(errorCommand);
          if (errorResponse.events && errorResponse.events.length > 0) {
            console.log(
              `   ❌ Found ${errorResponse.events.length} errors in last 24 hours`
            );
            console.log(`   Recent errors:`);
            errorResponse.events.slice(0, 5).forEach((event) => {
              const timestamp = new Date(event.timestamp || 0).toISOString();
              const message = (event.message || "").substring(0, 200);
              console.log(`      [${timestamp}] ${message}`);
            });
          } else {
            console.log(`   ✅ No errors in last 24 hours`);
          }

          // Get all recent logs
          const allLogsCommand = new FilterLogEventsCommand({
            logGroupName: logGroup.logGroupName!,
            startTime,
            limit: 30,
          });

          const allLogs = await cloudwatch.send(allLogsCommand);
          if (allLogs.events && allLogs.events.length > 0) {
            console.log(`   📊 Recent logs (last ${allLogs.events.length}):`);
            // Look for debug logs
            const debugLogs = allLogs.events.filter(
              (e) =>
                e.message?.includes("🔍") ||
                e.message?.includes("Attempting to get table name") ||
                e.message?.includes("Using table name") ||
                e.message?.includes("DB_NAME") ||
                e.message?.includes("Resource.Db")
            );
            if (debugLogs.length > 0) {
              console.log(`   🔍 Found ${debugLogs.length} debug log entries:`);
              debugLogs.slice(-5).forEach((event) => {
                const timestamp = new Date(event.timestamp || 0).toISOString();
                const message = (event.message || "").substring(0, 300);
                console.log(`      [${timestamp}] ${message}`);
              });
            }
          }
        } catch (err: any) {
          console.log(`   ⚠️  Error checking logs: ${err.message}`);
        }

        console.log("");
      }
    }
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    throw error;
  }
}

async function main() {
  await findProductionLogs();
}

main().catch(console.error);
