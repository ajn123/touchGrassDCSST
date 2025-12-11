#!/usr/bin/env tsx
/**
 * Script to check CloudWatch logs for addEventToDBFunction
 * Usage: tsx src/check-addEventToDb-logs.ts [--days 1]
 */

import { CloudWatchLogsClient, FilterLogEventsCommand, DescribeLogGroupsCommand } from "@aws-sdk/client-cloudwatch-logs";

const cloudwatch = new CloudWatchLogsClient({ region: "us-east-1" });

async function findLogGroup(functionName: string): Promise<string | null> {
  try {
    // Try the direct function name first
    const directName = `/aws/lambda/${functionName}`;
    try {
      const testCommand = new FilterLogEventsCommand({
        logGroupName: directName,
        startTime: Date.now() - 24 * 60 * 60 * 1000,
        limit: 1,
      });
      await cloudwatch.send(testCommand);
      return directName;
    } catch (e: any) {
      if (e.name !== "ResourceNotFoundException") {
        throw e;
      }
    }

    // Try to find log groups matching the pattern
    const listCommand = new DescribeLogGroupsCommand({
      logGroupNamePrefix: "/aws/lambda/",
    });
    const response = await cloudwatch.send(listCommand);

    if (response.logGroups) {
      // Look for log groups containing the function name
      const matching = response.logGroups.find((lg) =>
        lg.logGroupName?.includes(functionName)
      );
      if (matching?.logGroupName) {
        return matching.logGroupName;
      }

      // Also try common SST patterns
      const patterns = [
        `touchgrassdcsst-production-${functionName}`,
        `touchgrassdcsst-dev-${functionName}`,
        `touchgrassdcsst-${functionName}`,
      ];

      for (const pattern of patterns) {
        const matching = response.logGroups.find((lg) =>
          lg.logGroupName?.includes(pattern)
        );
        if (matching?.logGroupName) {
          return matching.logGroupName;
        }
      }
    }

    return null;
  } catch (error: any) {
    console.error(`Error finding log group: ${error.message}`);
    return null;
  }
}

async function checkCloudWatchLogs(logGroupName: string, days: number = 1) {
  const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

  console.log(`\n📋 Checking CloudWatch logs for: ${logGroupName}`);
  console.log(`   Time range: Last ${days} day(s)\n`);
  console.log("=".repeat(80));

  try {
    // Get all errors and exceptions
    const errorCommand = new FilterLogEventsCommand({
      logGroupName,
      startTime,
      filterPattern: "ERROR error Error exception Exception failed Failed ResourceNotFoundException",
      limit: 50,
    });

    const errorResponse = await cloudwatch.send(errorCommand);

    if (errorResponse.events && errorResponse.events.length > 0) {
      console.log(`\n❌ Found ${errorResponse.events.length} error log entries:\n`);
      errorResponse.events.slice(0, 30).forEach((event, index) => {
        const timestamp = new Date(event.timestamp || 0).toISOString();
        console.log(`[${index + 1}] ${timestamp}`);
        console.log(`    ${event.message}\n`);
      });
      if (errorResponse.events.length > 30) {
        console.log(`    ... and ${errorResponse.events.length - 30} more errors\n`);
      }
    } else {
      console.log(`✅ No errors found in logs\n`);
    }

    // Get recent execution logs (all logs, not just errors)
    const allLogsCommand = new FilterLogEventsCommand({
      logGroupName,
      startTime,
      limit: 100,
    });

    const allLogs = await cloudwatch.send(allLogsCommand);
    if (allLogs.events && allLogs.events.length > 0) {
      console.log("\n" + "=".repeat(80));
      console.log(`📊 Recent execution logs (last 20):\n`);
      allLogs.events.slice(-20).forEach((event) => {
        const timestamp = new Date(event.timestamp || 0).toISOString();
        const message = event.message?.substring(0, 300) || "";
        console.log(`[${timestamp}] ${message}`);
      });
    }
  } catch (error: any) {
    if (error.name === "ResourceNotFoundException") {
      console.log(`⚠️  Log group not found: ${logGroupName}`);
      console.log(`   This might mean the function hasn't been deployed or has a different name.\n`);
    } else {
      console.error(`❌ Error checking logs:`, error.message);
      throw error;
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const days = args.includes("--days")
    ? parseInt(args[args.indexOf("--days") + 1]) || 1
    : 1;

  console.log("🔍 Checking addEventToDBFunction logs...\n");

  // Try to find the log group
  const logGroupName = await findLogGroup("addEventToDBFunction");

  if (!logGroupName) {
    console.log("❌ Could not find log group for addEventToDBFunction");
    console.log("\n💡 Try:");
    console.log("   1. Check AWS Console > CloudWatch > Log Groups");
    console.log("   2. Look for log groups containing 'addEventToDBFunction'");
    console.log("   3. The function name might be prefixed with your app/stage name");
    return;
  }

  await checkCloudWatchLogs(logGroupName, days);

  console.log("\n" + "=".repeat(80));
  console.log("💡 Tips:");
  console.log("=".repeat(80));
  console.log("1. View logs in AWS Console:");
  console.log(`   https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#logsV2:log-groups/log-group/${encodeURIComponent(logGroupName)}`);
  console.log("2. Check Step Functions executions:");
  console.log("   https://console.aws.amazon.com/states/");
  console.log("\n");
}

main().catch(console.error);

