#!/usr/bin/env tsx
/**
 * Find the specific JSON parsing error at position 222 in CloudWatch logs
 * Usage: tsx src/find-json-error-222.ts [--days 7]
 */

import { CloudWatchLogsClient, FilterLogEventsCommand, DescribeLogGroupsCommand } from "@aws-sdk/client-cloudwatch-logs";
import { SFNClient, ListExecutionsCommand, DescribeExecutionCommand } from "@aws-sdk/client-sfn";

const cloudwatch = new CloudWatchLogsClient({ region: "us-east-1" });
const sfn = new SFNClient({ region: "us-east-1" });

async function searchAllLogGroupsForError(days: number = 7) {
  const startTime = Date.now() - days * 24 * 60 * 60 * 1000;
  const allLogGroups: string[] = [];
  let nextToken: string | undefined;

  console.log("🔍 Searching all CloudWatch log groups for 'position 222' error...\n");

  // Get all log groups
  do {
    const command = new DescribeLogGroupsCommand({
      nextToken,
      limit: 50,
    });
    const response = await cloudwatch.send(command);
    if (response.logGroups) {
      allLogGroups.push(...(response.logGroups.map(lg => lg.logGroupName || "").filter(Boolean)));
    }
    nextToken = response.nextToken;
  } while (nextToken);

  console.log(`Found ${allLogGroups.length} total log groups\n`);
  console.log("Searching for the error...\n");

  const results: Array<{ logGroupName: string; events: any[] }> = [];

  // Search each log group
  for (let i = 0; i < allLogGroups.length; i++) {
    const logGroupName = allLogGroups[i];
    
    try {
      const command = new FilterLogEventsCommand({
        logGroupName,
        startTime,
        filterPattern: '"position 222"',
        limit: 10,
      });

      const response = await cloudwatch.send(command);
      
      if (response.events && response.events.length > 0) {
        results.push({
          logGroupName,
          events: response.events,
        });
      }
    } catch (error: any) {
      // Ignore errors (log group might not exist, etc.)
    }

    if ((i + 1) % 20 === 0) {
      console.log(`   Checked ${i + 1}/${allLogGroups.length} log groups...`);
    }
  }

  return results;
}

async function searchStepFunctionsForError(days: number = 7) {
  const startTime = Date.now() - days * 24 * 60 * 60 * 1000;
  const results: any[] = [];

  console.log("\n🔍 Searching Step Functions executions for errors...\n");

  try {
    // We need to list all state machines first, but we can try common patterns
    // For now, let's try to find executions by listing them
    // This is a simplified approach - in production you'd get the ARN from SST
    
    console.log("⚠️  To check Step Functions, we need the state machine ARN.");
    console.log("   Please check AWS Console > Step Functions for failed executions.\n");
  } catch (error: any) {
    console.error(`❌ Error checking Step Functions:`, error.message);
  }

  return results;
}

async function getDetailedLogContext(logGroupName: string, errorTimestamp: number, windowMs: number = 60000) {
  try {
    const startTime = errorTimestamp - windowMs;
    const endTime = errorTimestamp + windowMs;

    const command = new FilterLogEventsCommand({
      logGroupName,
      startTime,
      endTime,
      limit: 100,
    });

    const response = await cloudwatch.send(command);
    return response.events || [];
  } catch (error) {
    return [];
  }
}

async function main() {
  const args = process.argv.slice(2);
  const days = args.includes("--days") 
    ? parseInt(args[args.indexOf("--days") + 1]) || 7
    : 7;

  console.log("=".repeat(80));
  console.log("🔍 Finding JSON parsing error at position 222");
  console.log("=".repeat(80));
  console.log(`Time range: Last ${days} days\n`);

  // Search all log groups
  const logGroupResults = await searchAllLogGroupsForError(days);

  console.log("\n" + "=".repeat(80));

  if (logGroupResults.length > 0) {
    console.log(`\n❌ FOUND ${logGroupResults.length} log group(s) with 'position 222' errors:\n`);

    for (const result of logGroupResults) {
      console.log(`\n📋 Log Group: ${result.logGroupName}`);
      console.log("-".repeat(80));

      for (const event of result.events) {
        const timestamp = new Date(event.timestamp || 0).toISOString();
        console.log(`\n⏰ Timestamp: ${timestamp}`);
        console.log(`📝 Error Message:\n${event.message}`);
        console.log();

        // Get context around this error
        const context = await getDetailedLogContext(
          result.logGroupName,
          event.timestamp || 0,
          30000 // 30 seconds before and after
        );

        if (context.length > 0) {
          console.log("📊 Context (logs around this error):");
          console.log("-".repeat(80));
          context.slice(0, 20).forEach((ctxEvent) => {
            const ctxTime = new Date(ctxEvent.timestamp || 0).toISOString();
            const isError = ctxEvent.message?.includes("ERROR") || 
                           ctxEvent.message?.includes("Error") ||
                           ctxEvent.message?.includes("error") ||
                           ctxEvent.message?.includes("SyntaxError");
            const prefix = isError ? "❌" : "ℹ️ ";
            console.log(`${prefix} [${ctxTime}] ${ctxEvent.message?.substring(0, 300)}`);
          });
          console.log();
        }
      }
    }
  } else {
    console.log("\n✅ No log groups found with 'position 222' error.");
    console.log("\n💡 The error might be:");
    console.log("   - In Step Functions execution logs (check AWS Console)");
    console.log("   - In a different time period (try --days 30)");
    console.log("   - In Next.js application logs (not Lambda)");
    console.log("   - The error message format might be slightly different");
  }

  // Also search for general SyntaxError
  console.log("\n" + "=".repeat(80));
  console.log("\n🔍 Also searching for general SyntaxError messages...\n");

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

  const syntaxErrorResults: Array<{ logGroupName: string; events: any[] }> = [];
  const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

  for (const logGroupName of allLogGroups.slice(0, 50)) { // Limit to first 50 for speed
    try {
      const command = new FilterLogEventsCommand({
        logGroupName,
        startTime,
        filterPattern: "SyntaxError",
        limit: 5,
      });
      const response = await cloudwatch.send(command);
      if (response.events && response.events.length > 0) {
        syntaxErrorResults.push({ logGroupName, events: response.events });
      }
    } catch (error) {
      // Ignore
    }
  }

  if (syntaxErrorResults.length > 0) {
    console.log(`\n⚠️  Found ${syntaxErrorResults.length} log group(s) with SyntaxError:\n`);
    syntaxErrorResults.forEach((result) => {
      console.log(`\n📋 ${result.logGroupName}:`);
      result.events.forEach((event) => {
        const timestamp = new Date(event.timestamp || 0).toISOString();
        console.log(`   [${timestamp}] ${event.message?.substring(0, 200)}`);
      });
    });
  } else {
    console.log("✅ No SyntaxError found in checked log groups.");
  }

  console.log("\n" + "=".repeat(80));
  console.log("\n💡 Next steps:");
  console.log("   - Check AWS Console > CloudWatch > Log Groups");
  console.log("   - Check AWS Console > Step Functions for failed executions");
  console.log("   - Check the error context above to see what JSON was being parsed");
  console.log("\n");
}

main().catch(console.error);

