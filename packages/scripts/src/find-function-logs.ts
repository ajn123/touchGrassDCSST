#!/usr/bin/env tsx
/**
 * Script to find all log groups for addEventToDBFunction
 */

import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  FilterLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";

const cloudwatch = new CloudWatchLogsClient({ region: "us-east-1" });

async function findFunctionLogs() {
  console.log("🔍 Finding all log groups for addEventToDBFunction...\n");

  try {
    const listCommand = new DescribeLogGroupsCommand({
      logGroupNamePrefix: "/aws/lambda/",
    });
    const response = await cloudwatch.send(listCommand);

    if (response.logGroups) {
      const matching = response.logGroups.filter(
        (lg) =>
          lg.logGroupName?.toLowerCase().includes("addeventtodb") ||
          lg.logGroupName?.toLowerCase().includes("addevent")
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
          const startTime = Date.now() - 2 * 24 * 60 * 60 * 1000; // Last 2 days
          const errorCommand = new FilterLogEventsCommand({
            logGroupName: logGroup.logGroupName!,
            startTime,
            filterPattern:
              "ERROR error Error exception Exception failed Failed ResourceNotFoundException",
            limit: 10,
          });

          const errorResponse = await cloudwatch.send(errorCommand);
          if (errorResponse.events && errorResponse.events.length > 0) {
            console.log(
              `   ❌ Found ${errorResponse.events.length} errors in last 2 days`
            );
            console.log(`   Recent errors:`);
            errorResponse.events.slice(0, 3).forEach((event) => {
              const timestamp = new Date(event.timestamp || 0).toISOString();
              const message = (event.message || "").substring(0, 150);
              console.log(`      [${timestamp}] ${message}`);
            });
          } else {
            console.log(`   ✅ No errors in last 2 days`);
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
  await findFunctionLogs();
}

main().catch(console.error);
