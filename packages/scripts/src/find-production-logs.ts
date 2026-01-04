#!/usr/bin/env tsx
/**
 * Find all CloudWatch log groups and search for the specific JSON parsing error
 * Usage: tsx src/find-production-logs.ts
 */

import { CloudWatchLogsClient, FilterLogEventsCommand, DescribeLogGroupsCommand } from "@aws-sdk/client-cloudwatch-logs";

const cloudwatch = new CloudWatchLogsClient({ region: "us-east-1" });

async function findAllLogGroups() {
  const logGroups: string[] = [];
  let nextToken: string | undefined;
  
  do {
    const command = new DescribeLogGroupsCommand({
      nextToken,
      limit: 50,
    });
    const response = await cloudwatch.send(command);
    
    if (response.logGroups) {
      logGroups.push(...(response.logGroups.map(lg => lg.logGroupName || "").filter(Boolean)));
    }
    
    nextToken = response.nextToken;
  } while (nextToken);
  
  return logGroups;
}

async function searchLogGroupForError(logGroupName: string, days: number = 7) {
  const startTime = Date.now() - days * 24 * 60 * 60 * 1000;
  
  try {
    const command = new FilterLogEventsCommand({
      logGroupName,
      startTime,
      filterPattern: "position 222",
      limit: 5,
    });

    const response = await cloudwatch.send(command);
    
    if (response.events && response.events.length > 0) {
      return {
        logGroupName,
        events: response.events,
      };
    }
  } catch (error: any) {
    // Ignore errors
  }
  
  return null;
}

async function main() {
  console.log("🔍 Searching all CloudWatch log groups for 'position 222' error...\n");
  console.log("This may take a few minutes...\n");

  const allLogGroups = await findAllLogGroups();
  console.log(`Found ${allLogGroups.length} total log groups\n`);
  console.log("Searching for the specific error...\n");

  const results: Array<{ logGroupName: string; events: any[] }> = [];
  
  // Search in batches
  for (let i = 0; i < allLogGroups.length; i += 10) {
    const batch = allLogGroups.slice(i, i + 10);
    const batchResults = await Promise.all(
      batch.map(lg => searchLogGroupForError(lg, 7))
    );
    
    batchResults.forEach(result => {
      if (result) {
        results.push(result);
      }
    });
    
    if (i % 50 === 0) {
      console.log(`   Checked ${Math.min(i + 10, allLogGroups.length)}/${allLogGroups.length} log groups...`);
    }
  }

  console.log("\n" + "=".repeat(80));
  
  if (results.length > 0) {
    console.log(`\n❌ FOUND ${results.length} log group(s) with 'position 222' errors:\n`);
    
    results.forEach((result, index) => {
      console.log(`\n[${index + 1}] ${result.logGroupName}`);
      console.log("   Errors found:");
      result.events.forEach((event, idx) => {
        const timestamp = new Date(event.timestamp || 0).toISOString();
        console.log(`   [${idx + 1}] ${timestamp}`);
        console.log(`      ${event.message}`);
        console.log();
      });
    });
  } else {
    console.log("\n✅ No log groups found with 'position 222' error found.");
    console.log("   The error might be in:");
    console.log("   - Step Functions execution logs");
    console.log("   - A log group with a different naming pattern");
    console.log("   - An older time period (try --days 30)");
  }

  console.log("\n" + "=".repeat(80));
}

main().catch(console.error);
