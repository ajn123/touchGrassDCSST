#!/usr/bin/env tsx
/**
 * Script to check Step Functions state machine and Lambda function environment variables
 * Usage: tsx src/check-step-function-env.ts
 */

import { GetFunctionCommand, LambdaClient } from "@aws-sdk/client-lambda";
import {
  DescribeStateMachineCommand,
  ListStateMachinesCommand,
  SFNClient,
} from "@aws-sdk/client-sfn";

const sfn = new SFNClient({ region: "us-east-1" });
const lambda = new LambdaClient({ region: "us-east-1" });

async function checkStepFunctionEnv() {
  console.log(
    "🔍 Checking Step Functions and Lambda environment variables...\n"
  );

  try {
    // List all state machines
    const listCommand = new ListStateMachinesCommand({});
    const listResponse = await sfn.send(listCommand);

    const matching = listResponse.stateMachines?.filter(
      (sm) =>
        sm.name?.toLowerCase().includes("normalize") ||
        sm.name?.toLowerCase().includes("event")
    );

    if (!matching || matching.length === 0) {
      console.log("⚠️  No matching Step Functions found");
      return;
    }

    console.log(`✅ Found ${matching.length} Step Function(s):\n`);

    for (const stateMachine of matching) {
      console.log(`📋 ${stateMachine.name}`);
      console.log(`   ARN: ${stateMachine.stateMachineArn}`);
      console.log(`   Created: ${stateMachine.creationDate?.toISOString()}`);

      // Get detailed information
      const describeCommand = new DescribeStateMachineCommand({
        stateMachineArn: stateMachine.stateMachineArn,
      });
      const details = await sfn.send(describeCommand);

      console.log(`   Status: ${details.status}`);
      console.log(`   Type: ${details.type}`);
      console.log(`   Updated: ${details.updateDate?.toISOString()}`);

      // Parse the definition to find Lambda function ARNs
      if (details.definition) {
        try {
          const definition = JSON.parse(details.definition);
          console.log(`\n   📊 State Machine Definition:`);
          console.log(
            `      States: ${Object.keys(definition.States || {}).length}`
          );

          // Find Lambda invoke states
          const lambdaStates: string[] = [];
          const findLambdaStates = (states: any, prefix = "") => {
            for (const [name, state] of Object.entries(states)) {
              const stateObj = state as any;
              if (
                stateObj.Resource &&
                stateObj.Resource.startsWith("arn:aws:states")
              ) {
                // This is a Lambda invoke task
                if (stateObj.Resource.includes("lambda")) {
                  lambdaStates.push(`${prefix}${name}`);
                }
              }
              if (stateObj.Branches) {
                stateObj.Branches.forEach((branch: any, idx: number) => {
                  if (branch.States) {
                    findLambdaStates(
                      branch.States,
                      `${prefix}${name}.Branch[${idx}].`
                    );
                  }
                });
              }
            }
          };

          if (definition.States) {
            findLambdaStates(definition.States);
          }

          // Extract Lambda function ARNs from the definition
          const extractLambdaArns = (obj: any, arns: Set<string>) => {
            if (typeof obj === "string" && obj.startsWith("arn:aws:lambda:")) {
              arns.add(obj);
            } else if (typeof obj === "object" && obj !== null) {
              for (const value of Object.values(obj)) {
                extractLambdaArns(value, arns);
              }
            }
          };

          const lambdaArns = new Set<string>();
          extractLambdaArns(definition, lambdaArns);

          if (lambdaArns.size > 0) {
            console.log(`\n   🔗 Lambda Functions referenced:`);
            for (const arn of lambdaArns) {
              // Extract function name from ARN
              const match = arn.match(/function:(.+)$/);
              if (match) {
                const functionName = match[1];
                console.log(`\n      Function: ${functionName}`);
                console.log(`      ARN: ${arn}`);

                // Get Lambda function environment variables
                try {
                  const getFuncCommand = new GetFunctionCommand({
                    FunctionName: functionName,
                  });
                  const funcResponse = await lambda.send(getFuncCommand);

                  if (funcResponse.Configuration?.Environment?.Variables) {
                    const env =
                      funcResponse.Configuration.Environment.Variables;
                    console.log(`      Environment Variables:`);

                    // Show all DB/Table related vars
                    const relevantVars = Object.entries(env).filter(
                      ([key]) =>
                        key.includes("DB") ||
                        key.includes("TABLE") ||
                        key.includes("Db") ||
                        key.startsWith("SST_")
                    );

                    if (relevantVars.length > 0) {
                      relevantVars.forEach(([key, value]) => {
                        console.log(`         ${key} = ${value}`);
                      });
                    } else {
                      console.log(
                        `         (No DB/Table related env vars found)`
                      );
                    }

                    // Show all env vars if there aren't too many
                    if (Object.keys(env).length <= 20) {
                      console.log(`      All environment variables:`);
                      Object.entries(env).forEach(([key, value]) => {
                        console.log(`         ${key} = ${value}`);
                      });
                    } else {
                      console.log(
                        `      (${
                          Object.keys(env).length
                        } total env vars, showing relevant ones only)`
                      );
                    }
                  } else {
                    console.log(`      ⚠️  No environment variables found`);
                  }

                  if (funcResponse.Configuration?.LastModified) {
                    console.log(
                      `      Last Modified: ${funcResponse.Configuration.LastModified.toISOString()}`
                    );
                  }
                } catch (err: any) {
                  console.log(
                    `      ⚠️  Error getting function details: ${err.message}`
                  );
                }
              }
            }
          } else {
            console.log(`\n   ⚠️  No Lambda function ARNs found in definition`);
          }
        } catch (parseError) {
          console.log(`   ⚠️  Could not parse state machine definition`);
        }
      }

      console.log("\n" + "=".repeat(80) + "\n");
    }
  } catch (error: any) {
    console.error(`❌ Error: ${error.message}`);
    throw error;
  }
}

async function main() {
  await checkStepFunctionEnv();
}

main().catch(console.error);
