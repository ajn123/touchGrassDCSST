#!/usr/bin/env tsx
/**
 * Check Next.js WebServer function logs for the JSON parsing error
 */

import { CloudWatchLogsClient, FilterLogEventsCommand } from "@aws-sdk/client-cloudwatch-logs";

const cloudwatch = new CloudWatchLogsClient({ region: "us-east-1" });

const logGroups = [
  "/aws/lambda/touchgrassdcsst-production-WebServerUseast1Function-tcvvafmk",
  "/aws/lambda/touchgrassdcsst-production-ApiRouteBcucrfHandlerFunction-mwkmuczw",
  "/aws/lambda/touchgrassdcsst-production-ApiRouteBdwfufHandlerFunction-rbhactns",
  "/aws/lambda/touchgrassdcsst-production-ApiRouteDevbeuHandlerFunction-kncdxhwo",
  "/aws/lambda/touchgrassdcsst-production-ApiRouteDorttfHandlerFunction-skxdxfcc",
  "/aws/lambda/touchgrassdcsst-production-ApiRouteMonvfeHandlerFunction-ssrekzcm",
  "/aws/lambda/touchgrassdcsst-production-ApiRouteZfxourHandlerFunction-ztuvnveu",
];

async function checkLogGroup(logGroupName: string, days: number = 7) {
  const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

  console.log(`\n📋 Checking: ${logGroupName}`);
  console.log(`   Time range: Last ${days} days\n`);

  try {
    // Search for position 222
    const specificCommand = new FilterLogEventsCommand({
      logGroupName,
      startTime,
      filterPattern: "position 222",
      limit: 20,
    });

    const specificResults = await cloudwatch.send(specificCommand);
    
    if (specificResults.events && specificResults.events.length > 0) {
      console.log(`\n❌ FOUND 'position 222' ERRORS:\n`);
      specificResults.events.forEach((event, idx) => {
        const timestamp = new Date(event.timestamp || 0).toISOString();
        console.log(`[${idx + 1}] ${timestamp}`);
        console.log(`    ${event.message}`);
        console.log();
      });
    }

    // Search for SyntaxError
    const syntaxCommand = new FilterLogEventsCommand({
      logGroupName,
      startTime,
      filterPattern: "SyntaxError",
      limit: 20,
    });

    const syntaxResults = await cloudwatch.send(syntaxCommand);
    
    if (syntaxResults.events && syntaxResults.events.length > 0) {
      console.log(`\n⚠️  FOUND SyntaxError:\n`);
      syntaxResults.events.forEach((event, idx) => {
        const timestamp = new Date(event.timestamp || 0).toISOString();
        const msg = event.message || "";
        console.log(`[${idx + 1}] ${timestamp}`);
        console.log(`    ${msg.substring(0, 600)}`);
        console.log();
      });
    }

    // Search for JSON parse errors
    const jsonCommand = new FilterLogEventsCommand({
      logGroupName,
      startTime,
      filterPattern: "JSON.parse",
      limit: 20,
    });

    const jsonResults = await cloudwatch.send(jsonCommand);
    
    if (jsonResults.events && jsonResults.events.length > 0) {
      console.log(`\n⚠️  FOUND JSON.parse references:\n`);
      jsonResults.events.forEach((event, idx) => {
        const timestamp = new Date(event.timestamp || 0).toISOString();
        const msg = event.message || "";
        if (msg.includes("error") || msg.includes("Error") || msg.includes("ERROR") || msg.includes("Failed")) {
          console.log(`[${idx + 1}] ${timestamp}`);
          console.log(`    ${msg.substring(0, 600)}`);
          console.log();
        }
      });
    }

    // Get recent ERROR logs
    const errorCommand = new FilterLogEventsCommand({
      logGroupName,
      startTime,
      filterPattern: "ERROR",
      limit: 30,
    });

    const errorResults = await cloudwatch.send(errorCommand);
    
    if (errorResults.events && errorResults.events.length > 0) {
      console.log(`\n⚠️  Recent ERROR logs (filtered for JSON-related):\n`);
      const jsonErrors = errorResults.events.filter(e => 
        e.message?.includes("JSON") || 
        e.message?.includes("parse") || 
        e.message?.includes("SyntaxError") ||
        e.message?.includes("position")
      );
      
      if (jsonErrors.length > 0) {
        jsonErrors.slice(0, 10).forEach((event, idx) => {
          const timestamp = new Date(event.timestamp || 0).toISOString();
          console.log(`[${idx + 1}] ${timestamp}`);
          console.log(`    ${event.message?.substring(0, 600)}`);
          console.log();
        });
      }
    }

    if (!specificResults.events?.length && !syntaxResults.events?.length) {
      console.log(`✅ No JSON parsing errors found in this log group\n`);
    }
  } catch (error: any) {
    if (error.name === "ResourceNotFoundException") {
      console.log(`⚠️  Log group not found: ${logGroupName}\n`);
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

  console.log("=".repeat(80));
  console.log("🔍 Checking Next.js WebServer logs for JSON parsing error at position 222");
  console.log("=".repeat(80));

  for (const logGroup of logGroups) {
    await checkLogGroup(logGroup, days);
  }

  console.log("\n" + "=".repeat(80));
  console.log("\n💡 Summary:");
  console.log("   - Checked Next.js WebServer and API route handler logs");
  console.log("   - If errors found above, they show the exact JSON that failed to parse");
  console.log("   - Check AWS Console > CloudWatch > Log Groups for full logs");
  console.log("\n");
}

main().catch(console.error);

