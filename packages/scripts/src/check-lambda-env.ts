#!/usr/bin/env tsx
/**
 * Script to check Lambda function environment variables
 * Usage: tsx src/check-lambda-env.ts
 */

import {
  GetFunctionCommand,
  LambdaClient,
  ListFunctionsCommand,
} from "@aws-sdk/client-lambda";

// Using the function name from the logs: monorepo-templa-production-addEventToDBFunctionFunction-cxoutkar
// Let's check what table name it's trying to use by looking at the actual error

const lambda = new LambdaClient({ region: "us-east-1" });

async function checkLambdaEnv() {
  // Try to find the function by common patterns
  const functionPatterns = [
    "monorepo-templa-production-addEventToDBFunctionFunction-cxoutkar", // Actual name from logs
    "addEventToDBFunction",
    "monorepo-template-production-addEventToDBFunction",
    "touchgrassdcsst-production-addEventToDBFunction",
  ];

  console.log("🔍 Checking Lambda function environment variables...\n");

  // First, try to get function by name patterns
  for (const pattern of functionPatterns) {
    try {
      const command = new GetFunctionCommand({
        FunctionName: pattern,
      });

      const response = await lambda.send(command);

      if (response.Configuration) {
        console.log(
          `✅ Found function: ${response.Configuration.FunctionName}`
        );
        console.log(`   ARN: ${response.Configuration.FunctionArn}`);
        console.log(`   Runtime: ${response.Configuration.Runtime}`);
        console.log(`   Last Modified: ${response.Configuration.LastModified}`);

        if (response.Configuration.Environment?.Variables) {
          console.log(`\n📋 Environment Variables:`);
          const env = response.Configuration.Environment.Variables;

          // Look for table name related variables
          Object.entries(env).forEach(([key, value]) => {
            if (
              key.includes("DB") ||
              key.includes("TABLE") ||
              key.includes("Db")
            ) {
              console.log(`   ${key} = ${value}`);
            }
          });

          // Show all env vars if there are only a few
          if (Object.keys(env).length < 20) {
            console.log(`\n   All environment variables:`);
            Object.entries(env).forEach(([key, value]) => {
              console.log(`   ${key} = ${value}`);
            });
          }
        } else {
          console.log(`\n⚠️  No environment variables found`);
        }

        return;
      }
    } catch (error: any) {
      if (error.name === "ResourceNotFoundException") {
        // Try next pattern
        continue;
      } else {
        console.error(`Error checking ${pattern}:`, error.message);
      }
    }
  }

  // If we couldn't find by pattern, try to list functions
  console.log("⚠️  Could not find function by common patterns");
  console.log("   Trying to list all functions to find it...\n");

  try {
    const listCommand = new ListFunctionsCommand({});
    const listResponse = await lambda.send(listCommand);

    if (listResponse.Functions) {
      const matchingFunctions = listResponse.Functions.filter(
        (fn) =>
          fn.FunctionName?.toLowerCase().includes("addeventtodb") ||
          fn.FunctionName?.toLowerCase().includes("addevent")
      );

      if (matchingFunctions.length > 0) {
        console.log(
          `✅ Found ${matchingFunctions.length} matching function(s):\n`
        );
        for (const fn of matchingFunctions) {
          console.log(`   - ${fn.FunctionName}`);
          try {
            const getCommand = new GetFunctionCommand({
              FunctionName: fn.FunctionName,
            });
            const funcResponse = await lambda.send(getCommand);
            
            if (funcResponse.Configuration) {
              console.log(`     Last Modified: ${funcResponse.Configuration.LastModified}`);
              console.log(`     Runtime: ${funcResponse.Configuration.Runtime}`);
            }

            if (funcResponse.Configuration?.Environment?.Variables) {
              const env = funcResponse.Configuration.Environment.Variables;
              console.log(`     Environment Variables:`);

              // Show all SST/DB related vars
              const relevantVars = Object.entries(env).filter(
                ([key]) =>
                  key.includes("DB") ||
                  key.includes("TABLE") ||
                  key.includes("Db") ||
                  key.startsWith("SST_")
              );

              if (relevantVars.length > 0) {
                relevantVars.forEach(([key, value]) => {
                  console.log(`       ${key} = ${value}`);
                });
              } else {
                console.log(`       (No DB/Table related env vars found)`);
              }

              // Show all env vars if there aren't too many
              if (Object.keys(env).length <= 30) {
                console.log(`     All environment variables:`);
                Object.entries(env).forEach(([key, value]) => {
                  console.log(`       ${key} = ${value}`);
                });
              } else {
                console.log(
                  `     (${
                    Object.keys(env).length
                  } total env vars, showing relevant ones only)`
                );
              }
            }
            console.log("");
          } catch (err: any) {
            console.log(
              `     Error getting function details: ${err.message}\n`
            );
          }
        }
      } else {
        console.log(
          "   No functions found containing 'addEventToDB' or 'addEvent'"
        );
      }
    }
  } catch (error: any) {
    console.error(`   Error listing functions: ${error.message}`);
  }

  console.log("\n💡 Check AWS Console > Lambda > Functions");
  console.log("   Look for functions containing 'addEventToDB'");
}

async function main() {
  await checkLambdaEnv();
}

main().catch(console.error);
