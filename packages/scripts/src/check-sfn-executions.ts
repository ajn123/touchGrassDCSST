#!/usr/bin/env tsx
/**
 * Script to check Step Functions execution history
 * Usage: tsx src/check-sfn-executions.ts [--days 2]
 */

import {
  DescribeExecutionCommand,
  GetExecutionHistoryCommand,
  ListExecutionsCommand,
  SFNClient,
} from "@aws-sdk/client-sfn";

const sfn = new SFNClient({ region: "us-east-1" });

async function checkStepFunctionExecutions(days: number = 2) {
  const startTime = Date.now() - days * 24 * 60 * 60 * 1000;

  console.log("🔍 Checking Step Functions executions...\n");

  // List all state machines to find the production one
  try {
    // Try to find the production state machine
    // Based on earlier check, it's: touchgrassdcsst-production-normaizeEventStepFunctionStateMachine-bbvvzsms
    const stateMachineArn =
      "arn:aws:states:us-east-1:558043842885:stateMachine:touchgrassdcsst-production-normaizeEventStepFunctionStateMachine-bbvvzsms";

    console.log(`   State Machine ARN: ${stateMachineArn}`);
    console.log(`   Time range: Last ${days} days\n`);
    console.log("=".repeat(80));

    const listCommand = new ListExecutionsCommand({
      stateMachineArn,
      maxResults: 100,
    });

    const response = await sfn.send(listCommand);

    if (!response.executions || response.executions.length === 0) {
      console.log("⚠️  No executions found");
      return;
    }

    // Filter by date
    const executions = response.executions
      .filter((exec) => exec.startDate && exec.startDate.getTime() >= startTime)
      .sort((a, b) => {
        const aTime = a.startDate?.getTime() || 0;
        const bTime = b.startDate?.getTime() || 0;
        return bTime - aTime;
      });

    console.log(
      `📊 Found ${executions.length} executions in the last ${days} days\n`
    );

    const failedExecutions = executions.filter((e) => e.status === "FAILED");
    const succeededExecutions = executions.filter(
      (e) => e.status === "SUCCEEDED"
    );

    console.log(`✅ Succeeded: ${succeededExecutions.length}`);
    console.log(`❌ Failed: ${failedExecutions.length}\n`);

    if (failedExecutions.length > 0) {
      console.log("=".repeat(80));
      console.log("❌ FAILED EXECUTIONS:\n");

      for (const exec of failedExecutions.slice(0, 10)) {
        console.log(`📋 ${exec.name}`);
        console.log(`   Status: ${exec.status}`);
        console.log(`   Started: ${exec.startDate?.toISOString()}`);
        if (exec.stopDate) {
          console.log(`   Stopped: ${exec.stopDate.toISOString()}`);
        }

        try {
          const describeCommand = new DescribeExecutionCommand({
            executionArn: exec.executionArn,
          });
          const details = await sfn.send(describeCommand);

          if (details.error) {
            console.log(`   Error: ${details.error}`);
          }
          if (details.cause) {
            console.log(`   Cause: ${details.cause}`);
          }

          // Get execution history to see where it failed
          const historyCommand = new GetExecutionHistoryCommand({
            executionArn: exec.executionArn,
            maxResults: 50,
            reverseOrder: true,
          });
          const history = await sfn.send(historyCommand);

          const failedEvents = history.events?.filter(
            (e) => e.executionFailedEventDetails || e.taskFailedEventDetails
          );

          if (failedEvents && failedEvents.length > 0) {
            const failedEvent = failedEvents[0];
            console.log(`   Failed at: ${failedEvent.type}`);
            if (failedEvent.executionFailedEventDetails) {
              console.log(
                `   Error: ${failedEvent.executionFailedEventDetails.error}`
              );
              console.log(
                `   Cause: ${failedEvent.executionFailedEventDetails.cause}`
              );
            }
            if (failedEvent.taskFailedEventDetails) {
              console.log(
                `   Resource: ${failedEvent.taskFailedEventDetails.resource}`
              );
              console.log(
                `   Error: ${failedEvent.taskFailedEventDetails.error}`
              );
              console.log(
                `   Cause: ${failedEvent.taskFailedEventDetails.cause}`
              );
            }
          }
        } catch (err: any) {
          console.log(`   ⚠️  Error getting details: ${err.message}`);
        }

        console.log("");
      }
    }

    // Show recent successful executions
    if (succeededExecutions.length > 0) {
      console.log("=".repeat(80));
      console.log("✅ RECENT SUCCESSFUL EXECUTIONS:\n");
      for (const exec of succeededExecutions.slice(0, 5)) {
        console.log(`   ${exec.name} - ${exec.startDate?.toISOString()}`);
      }
    }
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    if (error.message.includes("does not exist")) {
      console.log("\n💡 The state machine ARN might be different.");
      console.log("   Try checking the AWS Console for the correct ARN.");
    }
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const days = args.includes("--days")
    ? parseInt(args[args.indexOf("--days") + 1]) || 2
    : 2;

  await checkStepFunctionExecutions(days);
}

main().catch(console.error);
