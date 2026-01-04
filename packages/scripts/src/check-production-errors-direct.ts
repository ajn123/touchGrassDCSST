#!/usr/bin/env tsx
/**
 * Script to check CloudWatch logs for production cron job errors
 * Specifically looks for JSON parsing errors at position 222
 * Usage: tsx src/check-production-errors-direct.ts [--days 3]
 * 
 * This script queries CloudWatch directly without needing SST resources
 */

import { CloudWatchLogsClient, FilterLogEventsCommand, DescribeLogGroupsCommand } from "@aws-sdk/client-cloudwatch-logs";
import { SFNClient, ListExecutionsCommand, DescribeExecutionCommand } from "@aws-sdk/client-sfn";

const cloudwatch = new CloudWatchLogsClient({ region: "us-east-1" });
const sfn = new SFNClient({ region: "us-east-1" });

async function findLogGroups(prefix: string = "/aws/lambda") {
  try {
    const command = new DescribeLogGroupsCommand({
      logGroupNamePrefix: prefix,
    });
    const response = await cloudwatch.send(command);
    return response.logGroups?.map(lg => lg.logGroupName || "").filter(Boolean) || [];
  } catch (error) {
    console.error("Error finding log groups:", error);
    return [];
  }
}

async function checkLogGroupForJSONErrors(logGroupName: string, days: number = 3) {
  const startTime = Date.now() - days * 24 * 60 * 60 * 1000;
  
  console.log(`\n📋 Checking: ${logGroupName}`);
  console.log(`   Time range: Last ${days} days\n`);

  try {
    // Search specifically for the JSON parsing error at position 222
    const specificErrorCommand = new FilterLogEventsCommand({
      logGroupName,
      startTime,
      filterPattern: "position 222",
      limit: 20,
    });

    const specificErrors = await cloudwatch.send(specificErrorCommand);
    
    if (specificErrors.events && specificErrors.events.length > 0) {
      console.log(`\n❌ FOUND JSON PARSING ERRORS AT POSITION 222:\n`);
      specificErrors.events.forEach((event, index) => {
        const timestamp = new Date(event.timestamp || 0).toISOString();
        console.log(`[${index + 1}] ${timestamp}`);
        console.log(`    ${event.message}`);
        console.log();
      });
    }

    // Also search for general JSON parsing errors
    const jsonErrorCommand = new FilterLogEventsCommand({
      logGroupName,
      startTime,
      filterPattern: "SyntaxError",
      limit: 20,
    });

    const jsonErrors = await cloudwatch.send(jsonErrorCommand);
    
    if (jsonErrors.events && jsonErrors.events.length > 0) {
      console.log(`\n❌ Found ${jsonErrors.events.length} SyntaxError entries:\n`);
      jsonErrors.events.forEach((event, index) => {
        const timestamp = new Date(event.timestamp || 0).toISOString();
        console.log(`[${index + 1}] ${timestamp}`);
        console.log(`    ${event.message}`);
        console.log();
      });
    }

    // Search for general errors
    const errorCommand = new FilterLogEventsCommand({
      logGroupName,
      startTime,
      filterPattern: "ERROR",
      limit: 30,
    });

    const errors = await cloudwatch.send(errorCommand);
    
    if (errors.events && errors.events.length > 0) {
      console.log(`\n⚠️  Found ${errors.events.length} ERROR entries:\n`);
      errors.events.slice(0, 10).forEach((event, index) => {
        const timestamp = new Date(event.timestamp || 0).toISOString();
        const message = event.message || "";
        // Only show relevant errors
        if (message.includes("JSON") || message.includes("parse") || message.includes("SyntaxError")) {
          console.log(`[${index + 1}] ${timestamp}`);
          console.log(`    ${message.substring(0, 400)}`);
          console.log();
        }
      });
    }

    // Get recent logs for context
    const recentCommand = new FilterLogEventsCommand({
      logGroupName,
      startTime,
      limit: 50,
    });

    const recentLogs = await cloudwatch.send(recentCommand);
    if (recentLogs.events && recentLogs.events.length > 0) {
      console.log(`\n📊 Recent execution context (last 10 relevant logs):\n`);
      const relevantLogs = recentLogs.events
        .filter(e => 
          e.message?.includes("handler") || 
          e.message?.includes("started") || 
          e.message?.includes("completed") ||
          e.message?.includes("ERROR") ||
          e.message?.includes("Error")
        )
        .slice(-10);
      
      relevantLogs.forEach((event) => {
        const timestamp = new Date(event.timestamp || 0).toISOString();
        console.log(`[${timestamp}] ${event.message?.substring(0, 200)}`);
      });
    }

    if (!specificErrors.events?.length && !jsonErrors.events?.length && !errors.events?.length) {
      console.log(`✅ No errors found in this log group\n`);
    }
  } catch (error: any) {
    if (error.name === "ResourceNotFoundException") {
      console.log(`⚠️  Log group not found: ${logGroupName}\n`);
    } else {
      console.error(`❌ Error checking logs:`, error.message);
    }
  }
}

async function checkStepFunctionsForErrors(days: number = 3) {
  const startTime = Date.now() - days * 24 * 60 * 60 * 1000;
  
  console.log(`\n📋 Checking Step Functions for errors...`);
  console.log(`   Time range: Last ${days} days\n`);

  try {
    // List all state machines and find the normalize one
    const listCommand = new ListExecutionsCommand({
      maxResults: 50,
    });

    // We need to search by listing all executions - this is a simplified approach
    // In production, you'd want to get the state machine ARN from SST resources
    
    console.log("⚠️  Step Functions check requires state machine ARN.");
    console.log("   To check Step Functions, use: sst shell tsx src/check-cron-logs.ts\n");
  } catch (error: any) {
    console.error(`❌ Error checking Step Functions:`, error.message);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const days = args.includes("--days") 
    ? parseInt(args[args.indexOf("--days") + 1]) || 3
    : 3;

  console.log("🔍 Checking production cron job errors (JSON parsing at position 222)...\n");
  console.log("=".repeat(80));

  // Find all production Lambda log groups
  console.log("Searching for production Lambda log groups...\n");
  const allLogGroups = await findLogGroups("/aws/lambda");
  
  // Filter for production cron-related log groups
  const productionLogGroups = allLogGroups.filter(name => 
    name.includes("production") && (
      name.includes("cron") || 
      name.includes("washingtonian") || 
      name.includes("clockout") ||
      name.includes("eventbrite") ||
      name.includes("openWeb") ||
      name.includes("openweb") ||
      name.includes("touchgrassdcsst")
    )
  );

  if (productionLogGroups.length === 0) {
    console.log("⚠️  No production log groups found with expected patterns.");
    console.log("   Showing all Lambda log groups found:\n");
    allLogGroups.slice(0, 20).forEach(lg => console.log(`  - ${lg}`));
    console.log("\nPlease check AWS Console > CloudWatch > Log Groups\n");
  } else {
    console.log(`Found ${productionLogGroups.length} production log groups:\n`);
    productionLogGroups.forEach(lg => console.log(`  - ${lg}`));
    console.log();

    for (const logGroupName of productionLogGroups) {
      await checkLogGroupForJSONErrors(logGroupName, days);
    }
  }

  // Check Step Functions (if we can)
  await checkStepFunctionsForErrors(days);

  console.log("\n" + "=".repeat(80));
  console.log("\n💡 Next steps:");
  console.log("   - If errors found, check the log entries above for the exact JSON");
  console.log("   - Look for the text around position 222 in the error messages");
  console.log("   - Check AWS Console > CloudWatch > Log Groups for full logs");
  console.log("   - For Step Functions: sst shell tsx src/check-cron-logs.ts");
  console.log("\n");
}

main().catch(console.error);

