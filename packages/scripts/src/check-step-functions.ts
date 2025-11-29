#!/usr/bin/env tsx
/**
 * Script to check Step Functions execution logs and status
 * Usage: npm run shell tsx src/check-step-functions.ts [--days 7] [--execution-name <name>]
 */

import {
  SFNClient,
  ListExecutionsCommand,
  DescribeExecutionCommand,
  GetExecutionHistoryCommand,
} from "@aws-sdk/client-sfn";
import { CloudWatchLogsClient, FilterLogEventsCommand } from "@aws-sdk/client-cloudwatch-logs";
import { Resource } from "sst";

const sfn = new SFNClient({ region: "us-east-1" });
const cloudwatch = new CloudWatchLogsClient({ region: "us-east-1" });

interface ExecutionInfo {
  executionArn: string;
  name: string;
  status: string;
  startDate?: Date;
  stopDate?: Date;
  input?: string;
  output?: string;
  error?: string;
}

async function getStepFunctionExecutions(days: number = 7, executionName?: string) {
  const startTime = Date.now() - days * 24 * 60 * 60 * 1000;
  const stateMachineArn = Resource.normaizeEventStepFunction.arn;

  console.log("🔍 Checking Step Functions executions...");
  console.log(`   State Machine ARN: ${stateMachineArn}`);
  console.log(`   Time range: Last ${days} days`);
  if (executionName) {
    console.log(`   Filtering by name: ${executionName}`);
  }
  console.log("=".repeat(80));

  try {
    const listCommand = new ListExecutionsCommand({
      stateMachineArn,
      maxResults: 100,
    });

    const response = await sfn.send(listCommand);

    if (!response.executions || response.executions.length === 0) {
      console.log("⚠️  No executions found");
      return [];
    }

    // Filter by date and optional name
    let executions = response.executions.filter((exec) => {
      const matchesDate = exec.startDate && exec.startDate.getTime() >= startTime;
      const matchesName = !executionName || exec.name?.includes(executionName);
      return matchesDate && matchesName;
    });

    // Sort by start date (newest first)
    executions.sort((a, b) => {
      const aTime = a.startDate?.getTime() || 0;
      const bTime = b.startDate?.getTime() || 0;
      return bTime - aTime;
    });

    console.log(`\n📊 Found ${executions.length} executions in the last ${days} days\n`);

    const executionDetails: ExecutionInfo[] = [];

    for (const execution of executions.slice(0, 20)) {
      // Get detailed execution info
      const describeCommand = new DescribeExecutionCommand({
        executionArn: execution.executionArn,
      });
      const details = await sfn.send(describeCommand);

      const status = execution.status || "UNKNOWN";
      const statusIcon =
        status === "SUCCEEDED"
          ? "✅"
          : status === "FAILED"
          ? "❌"
          : status === "RUNNING"
          ? "⏳"
          : "⚠️";

      console.log(`${statusIcon} ${execution.name}`);
      console.log(`   Status: ${status}`);
      console.log(`   Started: ${execution.startDate?.toISOString()}`);
      if (execution.stopDate) {
        const duration = execution.stopDate.getTime() - (execution.startDate?.getTime() || 0);
        console.log(`   Stopped: ${execution.stopDate.toISOString()} (Duration: ${(duration / 1000).toFixed(2)}s)`);
      }

      // Parse input/output
      let inputData: any = null;
      let outputData: any = null;

      if (details.input) {
        try {
          inputData = JSON.parse(details.input);
          if (inputData.events) {
            const eventType = inputData.eventType || "unknown";
            const source = inputData.source || "unknown";
            const eventCount = Array.isArray(inputData.events) ? inputData.events.length : 0;
            console.log(`   Input: ${eventCount} ${eventType} items from ${source}`);
            
            // For groups, show GROUP_INFO count
            if (eventType === "group" && Array.isArray(inputData.events)) {
              const groupInfoCount = inputData.events.filter((e: any) => e.sk === "GROUP_INFO").length;
              const scheduleCount = inputData.events.filter((e: any) => e.sk?.startsWith("SCHEDULE#")).length;
              console.log(`      - GROUP_INFO: ${groupInfoCount}, SCHEDULE: ${scheduleCount}`);
            }
          }
        } catch (e) {
          console.log(`   Input: (could not parse)`);
        }
      }

      if (details.output) {
        try {
          outputData = JSON.parse(details.output);
          if (outputData.eventIds) {
            console.log(`   Output: ${outputData.eventIds.length} items processed`);
          }
        } catch (e) {
          // Output might be a string
          console.log(`   Output: ${details.output.substring(0, 100)}...`);
        }
      }

      if (details.error) {
        console.log(`   ❌ Error: ${details.error}`);
        console.log(`   Cause: ${details.cause || "N/A"}`);
      }

      executionDetails.push({
        executionArn: execution.executionArn!,
        name: execution.name || "unknown",
        status: status,
        startDate: execution.startDate,
        stopDate: execution.stopDate,
        input: details.input,
        output: details.output,
        error: details.error,
      });

      console.log();
    }

    if (executions.length > 20) {
      console.log(`   ... and ${executions.length - 20} more executions\n`);
    }

    // Summary
    const succeeded = executions.filter((e) => e.status === "SUCCEEDED").length;
    const failed = executions.filter((e) => e.status === "FAILED").length;
    const running = executions.filter((e) => e.status === "RUNNING").length;
    const other = executions.length - succeeded - failed - running;

    console.log("=".repeat(80));
    console.log("📊 Summary:");
    console.log(`   ✅ Succeeded: ${succeeded}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   ⏳ Running: ${running}`);
    console.log(`   ⚠️  Other: ${other}`);
    console.log(`   📦 Total: ${executions.length}`);

    // Show failed executions in detail
    if (failed > 0) {
      console.log("\n" + "=".repeat(80));
      console.log("❌ Failed Executions Details:");
      console.log("=".repeat(80));

      const failedExecutions = executions.filter((e) => e.status === "FAILED");
      for (const exec of failedExecutions.slice(0, 5)) {
        const describeCommand = new DescribeExecutionCommand({
          executionArn: exec.executionArn,
        });
        const details = await sfn.send(describeCommand);

        console.log(`\n${exec.name}`);
        console.log(`   ARN: ${exec.executionArn}`);
        console.log(`   Error: ${details.error || "N/A"}`);
        console.log(`   Cause: ${details.cause || "N/A"}`);
        
        // Get execution history to see where it failed
        try {
          const historyCommand = new GetExecutionHistoryCommand({
            executionArn: exec.executionArn,
            maxResults: 50,
            reverseOrder: true, // Get most recent events first
          });
          const history = await sfn.send(historyCommand);
          
          const failedEvents = history.events?.filter(
            (e) => e.executionFailedEventDetails || e.taskFailedEventDetails
          );
          
          if (failedEvents && failedEvents.length > 0) {
            const failedEvent = failedEvents[0];
            console.log(`   Failed at step: ${failedEvent.type}`);
            if (failedEvent.executionFailedEventDetails) {
              console.log(`   Error: ${failedEvent.executionFailedEventDetails.error}`);
              console.log(`   Cause: ${failedEvent.executionFailedEventDetails.cause}`);
            }
            if (failedEvent.taskFailedEventDetails) {
              console.log(`   Resource: ${failedEvent.taskFailedEventDetails.resource}`);
              console.log(`   Error: ${failedEvent.taskFailedEventDetails.error}`);
              console.log(`   Cause: ${failedEvent.taskFailedEventDetails.cause}`);
            }
          }
        } catch (historyError) {
          console.log(`   (Could not get execution history)`);
        }
      }
    }

    return executionDetails;
  } catch (error: any) {
    console.error("❌ Error checking Step Functions:", error.message);
    throw error;
  }
}

async function checkLambdaLogs(functionName: string, days: number = 7) {
  const startTime = Date.now() - days * 24 * 60 * 60 * 1000;
  const logGroupName = `/aws/lambda/${functionName}`;

  console.log(`\n📋 Checking Lambda logs: ${functionName}`);
  console.log(`   Log Group: ${logGroupName}`);
  console.log("-".repeat(80));

  try {
    // Get recent errors
    const errorCommand = new FilterLogEventsCommand({
      logGroupName,
      startTime,
      filterPattern: "ERROR error Error exception Exception failed Failed",
      limit: 20,
    });

    const errorResponse = await cloudwatch.send(errorCommand);

    if (errorResponse.events && errorResponse.events.length > 0) {
      console.log(`\n❌ Found ${errorResponse.events.length} error log entries:\n`);
      errorResponse.events.slice(0, 10).forEach((event, index) => {
        const timestamp = new Date(event.timestamp || 0).toISOString();
        console.log(`[${index + 1}] ${timestamp}`);
        console.log(`    ${event.message}\n`);
      });
    } else {
      console.log(`✅ No errors found in logs`);
    }

    // Get recent execution logs
    const allLogsCommand = new FilterLogEventsCommand({
      logGroupName,
      startTime,
      limit: 30,
    });

    const allLogs = await cloudwatch.send(allLogsCommand);
    if (allLogs.events && allLogs.events.length > 0) {
      console.log(`\n📊 Recent execution logs (last 10):\n`);
      allLogs.events.slice(-10).forEach((event) => {
        const timestamp = new Date(event.timestamp || 0).toISOString();
        const message = event.message?.substring(0, 200) || "";
        console.log(`[${timestamp}] ${message}`);
      });
    }
  } catch (error: any) {
    if (error.name === "ResourceNotFoundException") {
      console.log(`⚠️  Log group not found: ${logGroupName}`);
    } else {
      console.error(`❌ Error checking logs:`, error.message);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const days = args.includes("--days")
    ? parseInt(args[args.indexOf("--days") + 1]) || 7
    : 7;
  const executionName = args.includes("--execution-name")
    ? args[args.indexOf("--execution-name") + 1]
    : undefined;

  console.log("🔍 Checking Step Functions and Lambda logs...\n");

  // Check Step Functions
  await getStepFunctionExecutions(days, executionName);

  // Check Lambda logs for key functions
  console.log("\n" + "=".repeat(80));
  console.log("📋 Checking Lambda Function Logs:");
  console.log("=".repeat(80));

  const lambdaFunctions = [
    "addEventToDBFunction",
    "normalizeEventFunction",
    "reindexEventsFunction",
  ];

  for (const funcName of lambdaFunctions) {
    await checkLambdaLogs(funcName, days);
  }

  console.log("\n" + "=".repeat(80));
  console.log("💡 Tips:");
  console.log("=".repeat(80));
  console.log("1. View Step Functions in AWS Console:");
  console.log("   https://console.aws.amazon.com/states/");
  console.log("2. View Lambda logs in CloudWatch:");
  console.log("   https://console.aws.amazon.com/cloudwatch/");
  console.log("3. Filter by specific execution:");
  console.log("   npm run shell tsx src/check-step-functions.ts --execution-name seed-groups");
  console.log("\n");
}

main().catch(console.error);

