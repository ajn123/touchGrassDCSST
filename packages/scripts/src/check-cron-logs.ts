#!/usr/bin/env tsx
/**
 * Script to check CloudWatch logs for cron jobs and Step Functions
 * Usage: tsx src/check-cron-logs.ts [--days 7] [--function-name <name>]
 */

import { CloudWatchLogsClient, FilterLogEventsCommand } from "@aws-sdk/client-cloudwatch-logs";
import { SFNClient, ListExecutionsCommand, DescribeExecutionCommand } from "@aws-sdk/client-sfn";
import { Resource } from "sst";

const cloudwatch = new CloudWatchLogsClient({ region: "us-east-1" });
const sfn = new SFNClient({ region: "us-east-1" });

interface LogCheckOptions {
  days?: number;
  functionName?: string;
}

async function getLogGroupName(functionName: string): Promise<string> {
  // SST creates log groups with pattern: /aws/lambda/<function-name>
  // For cron jobs, the function name would be something like: touchgrassdcsst-production-cron-<id>
  // We need to find the actual log group name
  return `/aws/lambda/${functionName}`;
}

async function checkCloudWatchLogs(logGroupName: string, days: number = 7) {
  const startTime = Date.now() - days * 24 * 60 * 60 * 1000;
  
  console.log(`\n📋 Checking CloudWatch logs for: ${logGroupName}`);
  console.log(`   Time range: Last ${days} days\n`);

  try {
    const command = new FilterLogEventsCommand({
      logGroupName,
      startTime,
      filterPattern: "ERROR error Error exception Exception failed Failed",
    });

    const response = await cloudwatch.send(command);
    
    if (response.events && response.events.length > 0) {
      console.log(`❌ Found ${response.events.length} error log entries:\n`);
      response.events.slice(0, 20).forEach((event, index) => {
        const timestamp = new Date(event.timestamp || 0).toISOString();
        console.log(`[${index + 1}] ${timestamp}`);
        console.log(`    ${event.message}\n`);
      });
      if (response.events.length > 20) {
        console.log(`    ... and ${response.events.length - 20} more errors\n`);
      }
    } else {
      console.log(`✅ No errors found in logs\n`);
    }

    // Also get recent execution logs
    const allLogsCommand = new FilterLogEventsCommand({
      logGroupName,
      startTime,
      limit: 50,
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
      console.log(`   This might mean the function hasn't been deployed or has a different name.\n`);
    } else {
      console.error(`❌ Error checking logs:`, error.message);
    }
  }
}

async function checkStepFunctionExecutions(days: number = 7) {
  const startTime = Date.now() - days * 24 * 60 * 60 * 1000;
  const stateMachineArn = Resource.normaizeEventStepFunction.arn;

  console.log(`\n📋 Checking Step Function executions: ${stateMachineArn}`);
  console.log(`   Time range: Last ${days} days\n`);

  try {
    const listCommand = new ListExecutionsCommand({
      stateMachineArn,
      maxResults: 50,
    });

    const response = await sfn.send(listCommand);
    
    if (response.executions && response.executions.length > 0) {
      const recentExecutions = response.executions.filter(
        (exec) => exec.startDate && exec.startDate.getTime() >= startTime
      );

      console.log(`📊 Found ${recentExecutions.length} executions in the last ${days} days:\n`);

      for (const execution of recentExecutions.slice(0, 10)) {
        const describeCommand = new DescribeExecutionCommand({
          executionArn: execution.executionArn,
        });
        const details = await sfn.send(describeCommand);

        const status = execution.status;
        const statusIcon = status === "SUCCEEDED" ? "✅" : status === "FAILED" ? "❌" : "⏳";
        
        console.log(`${statusIcon} ${execution.name}`);
        console.log(`   Status: ${status}`);
        console.log(`   Started: ${execution.startDate?.toISOString()}`);
        if (execution.stopDate) {
          console.log(`   Stopped: ${execution.stopDate.toISOString()}`);
        }
        if (details.output) {
          try {
            const output = JSON.parse(details.output);
            if (output.events) {
              console.log(`   Events processed: ${output.events.length}`);
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        if (details.error) {
          console.log(`   ❌ Error: ${details.error}`);
        }
        console.log();
      }
    } else {
      console.log(`⚠️  No executions found in the last ${days} days\n`);
    }
  } catch (error: any) {
    console.error(`❌ Error checking Step Function executions:`, error.message);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const days = args.includes("--days") 
    ? parseInt(args[args.indexOf("--days") + 1]) || 7
    : 7;

  console.log("🔍 Checking cron job logs and Step Function executions...\n");
  console.log("=" .repeat(80));

  // Check Step Function executions first
  await checkStepFunctionExecutions(days);

  // Common SST function name patterns for cron jobs
  const cronFunctionNames = [
    "touchgrassdcsst-production-cron",
    "touchgrassdcsst-production-washingtonianCron",
    "touchgrassdcsst-production-clockoutdcCron",
    "touchgrassdcsst-production-eventbriteCron",
  ];

  console.log("\n" + "=".repeat(80));
  console.log("Checking Lambda function logs...\n");

  // Try to find and check log groups
  // Note: You may need to adjust these based on your actual SST deployment
  for (const functionName of cronFunctionNames) {
    const logGroupName = await getLogGroupName(functionName);
    await checkCloudWatchLogs(logGroupName, days);
  }

  console.log("\n" + "=".repeat(80));
  console.log("\n💡 Tips:");
  console.log("   - Check AWS Console > CloudWatch > Log Groups for exact log group names");
  console.log("   - Check AWS Console > Step Functions for execution details");
  console.log("   - Check AWS Console > EventBridge > Rules for cron job triggers");
  console.log("\n");
}

main().catch(console.error);

