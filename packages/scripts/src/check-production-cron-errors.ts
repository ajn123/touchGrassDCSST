#!/usr/bin/env tsx
/**
 * Script to check CloudWatch logs for production cron job errors
 * Specifically looks for JSON parsing errors
 * Usage: tsx src/check-production-cron-errors.ts [--days 7]
 */

import { CloudWatchLogsClient, FilterLogEventsCommand, DescribeLogGroupsCommand } from "@aws-sdk/client-cloudwatch-logs";
import { SFNClient, ListExecutionsCommand, DescribeExecutionCommand } from "@aws-sdk/client-sfn";
import { Resource } from "sst";

const cloudwatch = new CloudWatchLogsClient({ region: "us-east-1" });
const sfn = new SFNClient({ region: "us-east-1" });

async function findLogGroups(prefix: string = "/aws/lambda/touchgrassdcsst-production") {
  try {
    const command = new DescribeLogGroupsCommand({
      logGroupNamePrefix: prefix,
    });
    const response = await cloudwatch.send(command);
    return response.logGroups?.map(lg => lg.logGroupName || "") || [];
  } catch (error) {
    console.error("Error finding log groups:", error);
    return [];
  }
}

async function checkCloudWatchLogsForErrors(logGroupName: string, days: number = 7) {
  const startTime = Date.now() - days * 24 * 60 * 60 * 1000;
  
  console.log(`\n📋 Checking CloudWatch logs for: ${logGroupName}`);
  console.log(`   Time range: Last ${days} days\n`);

  try {
    // Search for JSON parsing errors specifically
    const errorPatterns = [
      "SyntaxError",
      "Expected ',' or '}'",
      "JSON.parse",
      "position 222",
      "ERROR",
      "Error",
      "error",
      "Exception",
      "Failed",
    ];

    for (const pattern of errorPatterns) {
      const command = new FilterLogEventsCommand({
        logGroupName,
        startTime,
        filterPattern: pattern,
        limit: 50,
      });

      const response = await cloudwatch.send(command);
      
      if (response.events && response.events.length > 0) {
        console.log(`\n❌ Found ${response.events.length} log entries matching "${pattern}":\n`);
        response.events.forEach((event, index) => {
          const timestamp = new Date(event.timestamp || 0).toISOString();
          console.log(`[${index + 1}] ${timestamp}`);
          console.log(`    ${event.message}`);
          
          // If it's a JSON parsing error, show more context
          if (event.message?.includes("position") || event.message?.includes("JSON.parse")) {
            console.log(`    ⚠️  This appears to be a JSON parsing error`);
          }
          console.log();
        });
      }
    }

    // Get all recent logs to see execution flow
    const allLogsCommand = new FilterLogEventsCommand({
      logGroupName,
      startTime,
      limit: 100,
    });

    const allLogs = await cloudwatch.send(allLogsCommand);
    if (allLogs.events && allLogs.events.length > 0) {
      console.log(`\n📊 Recent execution logs (last 20, showing errors and key events):\n`);
      const recentLogs = allLogs.events.slice(-20);
      recentLogs.forEach((event) => {
        const timestamp = new Date(event.timestamp || 0).toISOString();
        const message = event.message || "";
        
        // Show errors and important events
        if (
          message.includes("ERROR") ||
          message.includes("Error") ||
          message.includes("error") ||
          message.includes("SyntaxError") ||
          message.includes("JSON.parse") ||
          message.includes("handler started") ||
          message.includes("handler completed") ||
          message.includes("Failed")
        ) {
          console.log(`[${timestamp}] ${message.substring(0, 300)}`);
        }
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
  
  try {
    const stateMachineArn = Resource.normaizeEventStepFunction.arn;
    console.log(`\n📋 Checking Step Function executions: ${stateMachineArn}`);
    console.log(`   Time range: Last ${days} days\n`);

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

      for (const execution of recentExecutions.slice(0, 20)) {
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
        
        // Show input/output if available
        if (details.input) {
          try {
            const input = JSON.parse(details.input);
            console.log(`   Input events count: ${input.events?.length || 0}`);
            console.log(`   Source: ${input.source || "unknown"}`);
          } catch (e) {
            console.log(`   Input: (could not parse - might contain invalid JSON)`);
            console.log(`   Input preview: ${details.input.substring(0, 300)}`);
          }
        }
        
        if (details.output) {
          try {
            const output = JSON.parse(details.output);
            if (output.events) {
              console.log(`   Output events processed: ${output.events.length}`);
            }
          } catch (e) {
            console.log(`   Output: (could not parse)`);
          }
        }
        
        if (details.error) {
          console.log(`   ❌ Error: ${details.error}`);
          if (details.error.includes("position") || details.error.includes("JSON")) {
            console.log(`   ⚠️  This is a JSON parsing error!`);
          }
        }
        if (details.cause) {
          console.log(`   Cause: ${details.cause}`);
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

  console.log("🔍 Checking production cron job errors (JSON parsing issues)...\n");
  console.log("=".repeat(80));

  // Check Step Function executions first
  await checkStepFunctionExecutions(days);

  console.log("\n" + "=".repeat(80));
  console.log("Finding production Lambda log groups...\n");

  // Find all production log groups
  const logGroups = await findLogGroups("/aws/lambda/touchgrassdcsst-production");
  
  if (logGroups.length === 0) {
    console.log("⚠️  No log groups found. Trying alternative patterns...");
    // Try other patterns
    const altGroups = await findLogGroups("/aws/lambda");
    const productionGroups = altGroups.filter(name => 
      name.includes("production") && (
        name.includes("cron") || 
        name.includes("washingtonian") || 
        name.includes("clockout") ||
        name.includes("eventbrite") ||
        name.includes("openWeb")
      )
    );
    logGroups.push(...productionGroups);
  }

  if (logGroups.length > 0) {
    console.log(`Found ${logGroups.length} log groups:\n`);
    logGroups.forEach(lg => console.log(`  - ${lg}`));
    console.log();

    for (const logGroupName of logGroups) {
      await checkCloudWatchLogsForErrors(logGroupName, days);
    }
  } else {
    console.log("⚠️  No production log groups found.");
    console.log("   Trying common SST function name patterns...\n");
    
    // Try common patterns
    const commonNames = [
      "touchgrassdcsst-production-cron",
      "touchgrassdcsst-production-washingtonianCron",
      "touchgrassdcsst-production-clockoutdcCron",
      "touchgrassdcsst-production-eventbriteCron",
      "touchgrassdcsst-production-openWeb",
    ];

    for (const functionName of commonNames) {
      const logGroupName = `/aws/lambda/${functionName}`;
      await checkCloudWatchLogsForErrors(logGroupName, days);
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("\n💡 Tips:");
  console.log("   - Check AWS Console > CloudWatch > Log Groups for exact log group names");
  console.log("   - Look for log entries with 'position 222' or 'SyntaxError'");
  console.log("   - Check Step Functions executions for failed steps");
  console.log("   - The error might be in the Step Functions input/output JSON");
  console.log("\n");
}

main().catch(console.error);

