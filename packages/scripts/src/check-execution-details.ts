#!/usr/bin/env tsx
/**
 * Script to check detailed execution history for a Step Function execution
 * Usage: tsx src/check-execution-details.ts <execution-arn>
 */

import { GetExecutionHistoryCommand, SFNClient } from "@aws-sdk/client-sfn";

const sfn = new SFNClient({ region: "us-east-1" });

async function checkExecutionDetails(executionArn: string) {
  console.log(`🔍 Checking execution details...\n`);
  console.log(`   Execution ARN: ${executionArn}\n`);
  console.log("=".repeat(80));

  try {
    const historyCommand = new GetExecutionHistoryCommand({
      executionArn,
      maxResults: 100,
    });
    const history = await sfn.send(historyCommand);

    if (!history.events || history.events.length === 0) {
      console.log("⚠️  No events found");
      return;
    }

    console.log(`📊 Found ${history.events.length} events\n`);

    // Group events by state
    const stateEvents: Record<string, any[]> = {};

    history.events.forEach((event) => {
      if (event.stateEnteredEventDetails) {
        const stateName = event.stateEnteredEventDetails.name;
        if (!stateEvents[stateName]) {
          stateEvents[stateName] = [];
        }
        stateEvents[stateName].push({ type: "ENTERED", event });
      }
      if (event.stateExitedEventDetails) {
        const stateName = event.stateExitedEventDetails.name;
        if (!stateEvents[stateName]) {
          stateEvents[stateName] = [];
        }
        stateEvents[stateName].push({ type: "EXITED", event });
      }
      if (event.taskSucceededEventDetails) {
        const resource = event.taskSucceededEventDetails.resource;
        const output = event.taskSucceededEventDetails.output;
        // Find the state name from previous events
        let stateName = "Unknown";
        for (let i = history.events.indexOf(event) - 1; i >= 0; i--) {
          if (history.events[i].stateEnteredEventDetails) {
            stateName = history.events[i].stateEnteredEventDetails.name;
            break;
          }
        }
        if (!stateEvents[stateName]) {
          stateEvents[stateName] = [];
        }
        stateEvents[stateName].push({
          type: "SUCCEEDED",
          event,
          resource,
          output,
        });
      }
      if (event.taskFailedEventDetails) {
        const resource = event.taskFailedEventDetails.resource;
        let stateName = "Unknown";
        for (let i = history.events.indexOf(event) - 1; i >= 0; i--) {
          if (history.events[i].stateEnteredEventDetails) {
            stateName = history.events[i].stateEnteredEventDetails.name;
            break;
          }
        }
        if (!stateEvents[stateName]) {
          stateEvents[stateName] = [];
        }
        stateEvents[stateName].push({
          type: "FAILED",
          event,
          resource,
          error: event.taskFailedEventDetails.error,
          cause: event.taskFailedEventDetails.cause,
        });
      }
    });

    console.log("📋 Execution Flow:\n");
    Object.entries(stateEvents).forEach(([stateName, events]) => {
      const succeeded = events.find((e) => e.type === "SUCCEEDED");
      const failed = events.find((e) => e.type === "FAILED");
      const entered = events.find((e) => e.type === "ENTERED");

      const icon = succeeded ? "✅" : failed ? "❌" : entered ? "⏳" : "⚠️";

      console.log(`${icon} ${stateName}`);

      if (succeeded && succeeded.resource) {
        // Extract Lambda function name from ARN
        const lambdaArn = succeeded.resource;
        if (lambdaArn.includes("lambda")) {
          const functionName = lambdaArn.split(":").pop();
          console.log(`   Lambda: ${functionName}`);
        } else {
          console.log(`   Resource: ${succeeded.resource}`);
        }

        // Show output if available
        if (succeeded.output) {
          try {
            const output = JSON.parse(succeeded.output);
            if (output.eventIds) {
              console.log(`   Events saved: ${output.eventIds.length}`);
            }
            if (output.savedEvents) {
              console.log(`   Total items saved: ${output.savedEvents.length}`);
            }
          } catch (e) {
            // Not JSON, ignore
          }
        }
      }

      if (failed) {
        console.log(`   ❌ FAILED`);
        if (failed.error) {
          console.log(`   Error: ${failed.error}`);
        }
        if (failed.cause) {
          try {
            const cause = JSON.parse(failed.cause);
            console.log(`   Error Type: ${cause.errorType}`);
            console.log(`   Error Message: ${cause.errorMessage}`);
          } catch (e) {
            console.log(`   Cause: ${failed.cause.substring(0, 200)}`);
          }
        }
        if (failed.resource) {
          const functionName = failed.resource.split(":").pop();
          console.log(`   Function: ${functionName}`);
        }
      }

      console.log("");
    });
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: tsx src/check-execution-details.ts <execution-arn>");
    console.error(
      "Example: tsx src/check-execution-details.ts arn:aws:states:us-east-1:558043842885:execution:..."
    );
    process.exit(1);
  }

  const executionArn = args[0];
  await checkExecutionDetails(executionArn);
}

main().catch(console.error);
