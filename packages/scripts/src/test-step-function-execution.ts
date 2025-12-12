#!/usr/bin/env tsx
/**
 * Script to execute Step Function and check for errors
 * Usage: tsx src/test-step-function-execution.ts [--wait]
 */

import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import {
  DescribeExecutionCommand,
  GetExecutionHistoryCommand,
  SFNClient,
  StartExecutionCommand,
} from "@aws-sdk/client-sfn";

const sfn = new SFNClient({ region: "us-east-1" });
const cloudwatch = new CloudWatchLogsClient({ region: "us-east-1" });

// Production state machine ARN
const STATE_MACHINE_ARN =
  "arn:aws:states:us-east-1:558043842885:stateMachine:touchgrassdcsst-production-normaizeEventStepFunctionStateMachine-bbvvzsms";

async function waitForExecution(
  executionArn: string,
  maxWaitTime: number = 60000
): Promise<any> {
  const startTime = Date.now();
  const pollInterval = 2000; // Check every 2 seconds

  while (Date.now() - startTime < maxWaitTime) {
    const describeCommand = new DescribeExecutionCommand({
      executionArn,
    });
    const response = await sfn.send(describeCommand);

    if (response.status === "SUCCEEDED" || response.status === "FAILED") {
      return response;
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error("Execution timeout - execution did not complete in time");
}

async function checkLambdaLogs(
  functionName: string,
  startTime: number
): Promise<void> {
  const logGroupName = `/aws/lambda/${functionName}`;

  try {
    const errorCommand = new FilterLogEventsCommand({
      logGroupName,
      startTime,
      filterPattern:
        "ERROR error Error exception Exception failed Failed ResourceNotFoundException",
      limit: 20,
    });

    const errorResponse = await cloudwatch.send(errorCommand);

    if (errorResponse.events && errorResponse.events.length > 0) {
      console.log(
        `\n❌ Found ${errorResponse.events.length} errors in ${functionName} logs:\n`
      );
      errorResponse.events.slice(0, 10).forEach((event, index) => {
        const timestamp = new Date(event.timestamp || 0).toISOString();
        console.log(`[${index + 1}] ${timestamp}`);
        console.log(`    ${event.message}\n`);
      });
    } else {
      console.log(`✅ No errors found in ${functionName} logs`);
    }
  } catch (error: any) {
    if (error.name === "ResourceNotFoundException") {
      console.log(`⚠️  Log group not found: ${logGroupName}`);
    } else {
      console.log(
        `⚠️  Error checking logs for ${functionName}: ${error.message}`
      );
    }
  }
}

async function testStepFunctionExecution(waitForCompletion: boolean = false) {
  console.log("🚀 Testing Step Function Execution...\n");
  console.log(`   State Machine: ${STATE_MACHINE_ARN}\n`);
  console.log("=".repeat(80));

  // Create test input
  const testInput = {
    events: [
      {
        title: "Test Event - Step Function Execution Test",
        description: "This is a test event to verify Step Function execution",
        start_date: new Date().toISOString().split("T")[0],
        source: "test-script",
        eventType: "event",
      },
    ],
    source: "test-script",
    eventType: "event",
  };

  const executionName = `test-execution-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  console.log(`📋 Starting execution: ${executionName}`);
  console.log(`   Input: ${JSON.stringify(testInput, null, 2)}\n`);

  try {
    // Start execution
    const startCommand = new StartExecutionCommand({
      stateMachineArn: STATE_MACHINE_ARN,
      name: executionName,
      input: JSON.stringify(testInput),
    });

    const startResponse = await sfn.send(startCommand);
    const executionArn = startResponse.executionArn!;

    console.log(`✅ Execution started successfully`);
    console.log(`   Execution ARN: ${executionArn}\n`);

    if (waitForCompletion) {
      console.log("⏳ Waiting for execution to complete...\n");
      const execution = await waitForExecution(executionArn, 120000); // 2 minutes max

      console.log("=".repeat(80));
      console.log("📊 Execution Result:\n");
      console.log(`   Status: ${execution.status}`);
      console.log(`   Started: ${execution.startDate?.toISOString()}`);
      if (execution.stopDate) {
        const duration =
          execution.stopDate.getTime() - (execution.startDate?.getTime() || 0);
        console.log(
          `   Stopped: ${execution.stopDate.toISOString()} (Duration: ${(
            duration / 1000
          ).toFixed(2)}s)`
        );
      }

      if (execution.status === "FAILED") {
        console.log(`\n❌ Execution FAILED!\n`);
        if (execution.error) {
          console.log(`   Error: ${execution.error}`);
        }
        if (execution.cause) {
          console.log(`   Cause: ${execution.cause}`);
        }

        // Get execution history to see where it failed
        const historyCommand = new GetExecutionHistoryCommand({
          executionArn,
          maxResults: 50,
          reverseOrder: true,
        });
        const history = await sfn.send(historyCommand);

        const failedEvents = history.events?.filter(
          (e) => e.executionFailedEventDetails || e.taskFailedEventDetails
        );

        if (failedEvents && failedEvents.length > 0) {
          console.log(`\n📋 Failure Details:\n`);
          failedEvents.forEach((event, idx) => {
            console.log(`   Failure ${idx + 1}: ${event.type}`);
            if (event.executionFailedEventDetails) {
              console.log(
                `     Error: ${event.executionFailedEventDetails.error}`
              );
              console.log(
                `     Cause: ${event.executionFailedEventDetails.cause}`
              );
            }
            if (event.taskFailedEventDetails) {
              console.log(
                `     Resource: ${event.taskFailedEventDetails.resource}`
              );
              console.log(`     Error: ${event.taskFailedEventDetails.error}`);
              console.log(`     Cause: ${event.taskFailedEventDetails.cause}`);
            }
            console.log("");
          });
        }

        // Check Lambda logs for the functions
        const startTime = execution.startDate?.getTime() || Date.now() - 60000;
        console.log("=".repeat(80));
        console.log("📋 Checking Lambda Function Logs:\n");

        const functions = [
          "touchgrassdcs-production-normalizeEventFunctionFunction-cuofwzka",
          "touchgrassdcsst-production-addEventToDBFunctionFunction-cvvsmmbs",
          "touchgrassdcss-production-reindexEventsFunctionFunction-bfcwcmkw",
        ];

        for (const funcName of functions) {
          await checkLambdaLogs(funcName, startTime);
        }
      } else if (execution.status === "SUCCEEDED") {
        console.log(`\n✅ Execution SUCCEEDED!\n`);
        if (execution.output) {
          try {
            const output = JSON.parse(execution.output);
            console.log(`   Output: ${JSON.stringify(output, null, 2)}`);
          } catch (e) {
            console.log(`   Output: ${execution.output}`);
          }
        }
      } else {
        console.log(`\n⏳ Execution is still ${execution.status}`);
      }
    } else {
      console.log(
        "💡 Execution started. Use --wait flag to wait for completion."
      );
      console.log(
        `   Check status: aws stepfunctions describe-execution --execution-arn ${executionArn}`
      );
    }

    console.log("\n" + "=".repeat(80));
    console.log("💡 View in AWS Console:");
    console.log(
      `   https://console.aws.amazon.com/states/home?region=us-east-1#/executions/details/${executionArn}`
    );
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    if (error.name === "ExecutionAlreadyExists") {
      console.log("   An execution with this name already exists.");
      console.log("   The script will generate a new unique name on retry.");
    }
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const waitForCompletion = args.includes("--wait");

  await testStepFunctionExecution(waitForCompletion);
}

main().catch(console.error);
