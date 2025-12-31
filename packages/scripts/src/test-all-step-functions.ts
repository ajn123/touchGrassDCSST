#!/usr/bin/env tsx
/**
 * Script to test all Step Functions in production
 * Usage: tsx src/test-all-step-functions.ts [--wait]
 */

import {
  DescribeExecutionCommand,
  GetExecutionHistoryCommand,
  ListStateMachinesCommand,
  SFNClient,
  StartExecutionCommand,
} from "@aws-sdk/client-sfn";

const sfn = new SFNClient({ region: "us-east-1" });

async function waitForExecution(
  executionArn: string,
  maxWaitTime: number = 120000
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

async function testStepFunction(
  stateMachineArn: string,
  stateMachineName: string,
  waitForCompletion: boolean
): Promise<{
  success: boolean;
  executionArn?: string;
  status?: string;
  error?: string;
  cause?: string;
}> {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`📋 Testing: ${stateMachineName}`);
  console.log(`   ARN: ${stateMachineArn}`);
  console.log(`${"=".repeat(80)}\n`);

  // Create test input based on state machine name
  let testInput: any = {
    events: [
      {
        title: `Test Event - ${stateMachineName}`,
        description: "This is a test event to verify Step Function execution",
        start_date: new Date().toISOString().split("T")[0],
        source: "test-script",
        eventType: "event",
      },
    ],
    source: "test-script",
    eventType: "event",
  };

  const executionName = `test-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  try {
    // Start execution
    const startCommand = new StartExecutionCommand({
      stateMachineArn,
      name: executionName,
      input: JSON.stringify(testInput),
    });

    const startResponse = await sfn.send(startCommand);
    const executionArn = startResponse.executionArn!;

    console.log(`✅ Execution started: ${executionName}`);
    console.log(`   Execution ARN: ${executionArn}`);

    if (waitForCompletion) {
      console.log(`⏳ Waiting for completion...`);
      const execution = await waitForExecution(executionArn, 120000);

      console.log(`\n📊 Result:`);
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

      // Get execution history to show which steps succeeded/failed
      try {
        const historyCommand = new GetExecutionHistoryCommand({
          executionArn,
          maxResults: 50,
        });
        const history = await sfn.send(historyCommand);

        const stepResults: Array<{
          step: string;
          status: string;
          error?: string;
        }> = [];

        history.events?.forEach((event) => {
          if (event.stateEnteredEventDetails) {
            const stepName = event.stateEnteredEventDetails.name;
            if (stepName && !stepResults.find((r) => r.step === stepName)) {
              stepResults.push({ step: stepName, status: "ENTERED" });
            }
          }
          if (event.taskSucceededEventDetails) {
            const stepName = event.stateEnteredEventDetails?.name || "Task";
            const existing = stepResults.find((r) => r.step === stepName);
            if (existing) {
              existing.status = "SUCCEEDED";
            } else {
              stepResults.push({ step: stepName, status: "SUCCEEDED" });
            }
          }
          if (event.taskFailedEventDetails) {
            const stepName = event.stateEnteredEventDetails?.name || "Task";
            const existing = stepResults.find((r) => r.step === stepName);
            if (existing) {
              existing.status = "FAILED";
              existing.error = event.taskFailedEventDetails.error;
            } else {
              stepResults.push({
                step: stepName,
                status: "FAILED",
                error: event.taskFailedEventDetails.error,
              });
            }
          }
        });

        if (stepResults.length > 0) {
          console.log(`\n📋 Step Results:`);
          stepResults.forEach((result) => {
            const icon =
              result.status === "SUCCEEDED"
                ? "✅"
                : result.status === "FAILED"
                ? "❌"
                : "⏳";
            console.log(`   ${icon} ${result.step}: ${result.status}`);
            if (result.error) {
              console.log(`      Error: ${result.error}`);
            }
          });
        }
      } catch (err) {
        // Ignore history errors
      }

      if (execution.status === "FAILED") {
        console.log(`\n❌ Execution FAILED!\n`);
        if (execution.error) {
          console.log(`   Error: ${execution.error}`);
        }
        if (execution.cause) {
          try {
            const cause = JSON.parse(execution.cause);
            console.log(`   Error Type: ${cause.errorType}`);
            console.log(`   Error Message: ${cause.errorMessage}`);
            if (cause.trace) {
              console.log(`   Stack Trace:`);
              cause.trace.slice(0, 3).forEach((line: string) => {
                console.log(`     ${line}`);
              });
            }
          } catch (e) {
            console.log(`   Cause: ${execution.cause}`);
          }
        }

        return {
          success: false,
          executionArn,
          status: execution.status,
          error: execution.error,
          cause: execution.cause,
        };
      } else if (execution.status === "SUCCEEDED") {
        console.log(`\n✅ Execution SUCCEEDED!\n`);
        return {
          success: true,
          executionArn,
          status: execution.status,
        };
      } else {
        console.log(`\n⏳ Execution is still ${execution.status}`);
        return {
          success: false,
          executionArn,
          status: execution.status,
        };
      }
    } else {
      console.log(
        `💡 Execution started. Use --wait flag to wait for completion.`
      );
      return {
        success: true,
        executionArn,
        status: "RUNNING",
      };
    }
  } catch (error: any) {
    console.error(`\n❌ Error starting execution: ${error.message}`);
    if (error.name === "ExecutionAlreadyExists") {
      console.log("   An execution with this name already exists.");
    }
    return {
      success: false,
      error: error.message,
    };
  }
}

async function testAllStepFunctions(waitForCompletion: boolean = false) {
  console.log("🔍 Finding all Step Functions in production...\n");

  try {
    const listCommand = new ListStateMachinesCommand({});
    const response = await sfn.send(listCommand);

    if (!response.stateMachines || response.stateMachines.length === 0) {
      console.log("⚠️  No Step Functions found");
      return;
    }

    // Filter for production Step Functions
    const productionStateMachines = response.stateMachines.filter(
      (sm) =>
        sm.name?.includes("production") ||
        sm.name?.includes("normalize") ||
        sm.name?.includes("event")
    );

    console.log(
      `✅ Found ${productionStateMachines.length} production Step Function(s)\n`
    );

    const results: Array<{
      name: string;
      arn: string;
      success: boolean;
      status?: string;
      error?: string;
    }> = [];

    for (const stateMachine of productionStateMachines) {
      const result = await testStepFunction(
        stateMachine.stateMachineArn!,
        stateMachine.name!,
        waitForCompletion
      );

      results.push({
        name: stateMachine.name!,
        arn: stateMachine.stateMachineArn!,
        success: result.success,
        status: result.status,
        error: result.error,
      });

      // Add a small delay between tests
      if (waitForCompletion) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    // Summary
    console.log("\n" + "=".repeat(80));
    console.log("📊 TEST SUMMARY");
    console.log("=".repeat(80) + "\n");

    const succeeded = results.filter(
      (r) => r.success && r.status === "SUCCEEDED"
    );
    const failed = results.filter((r) => !r.success || r.status === "FAILED");
    const running = results.filter(
      (r) =>
        r.status === "RUNNING" ||
        (r.success && r.status !== "SUCCEEDED" && r.status !== "FAILED")
    );

    console.log(`✅ Succeeded: ${succeeded.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    if (running.length > 0) {
      console.log(`⏳ Still Running: ${running.length}`);
    }

    if (failed.length > 0) {
      console.log(`\n❌ Failed Step Functions:\n`);
      failed.forEach((result) => {
        console.log(`   - ${result.name}`);
        if (result.error) {
          console.log(`     Error: ${result.error}`);
        }
        if (result.status) {
          console.log(`     Status: ${result.status}`);
        }
      });
    }

    if (succeeded.length > 0) {
      console.log(`\n✅ Successful Step Functions:\n`);
      succeeded.forEach((result) => {
        console.log(`   - ${result.name}`);
      });
    }

    console.log("\n" + "=".repeat(80));
    console.log("💡 View in AWS Console:");
    console.log(
      "   https://console.aws.amazon.com/states/home?region=us-east-1"
    );
    console.log("=".repeat(80) + "\n");
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const waitForCompletion = args.includes("--wait");

  await testAllStepFunctions(waitForCompletion);
}

main().catch(console.error);



