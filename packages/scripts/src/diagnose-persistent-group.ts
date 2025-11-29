#!/usr/bin/env tsx
/**
 * Script to diagnose why a group persists after deletion
 * Usage: npm run shell tsx src/diagnose-persistent-group.ts
 */

import {
  DynamoDBClient,
  ScanCommand,
  GetItemCommand,
} from "@aws-sdk/client-dynamodb";
import { SFNClient, ListExecutionsCommand, DescribeExecutionCommand } from "@aws-sdk/client-sfn";
import { Resource } from "sst";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const sfnClient = new SFNClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const tableName = Resource.Db.name;

async function findPersistentGroups() {
  console.log("🔍 Diagnosing Persistent Groups");
  console.log("=".repeat(80));
  console.log(`Table: ${tableName}`);
  console.log("=".repeat(80));

  // Step 1: Find all groups in the database
  console.log("\n📋 Step 1: Scanning for all GROUP# items...");
  let allGroupItems: any[] = [];
  let lastKey: any = undefined;

  do {
    const scanCommand = new ScanCommand({
      TableName: tableName,
      FilterExpression: "begins_with(pk, :groupPrefix)",
      ExpressionAttributeValues: {
        ":groupPrefix": { S: "GROUP#" },
      },
      ExclusiveStartKey: lastKey,
    });

    const result = await dbClient.send(scanCommand);
    if (result.Items) {
      allGroupItems.push(...result.Items);
    }
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  console.log(`   Found ${allGroupItems.length} GROUP# items`);

  if (allGroupItems.length === 0) {
    console.log("\n✅ No groups found in database!");
    return;
  }

  // Group by pk
  const groupsByPk = new Map<string, any[]>();
  allGroupItems.forEach((item) => {
    const pk = item.pk?.S || "unknown";
    if (!groupsByPk.has(pk)) {
      groupsByPk.set(pk, []);
    }
    groupsByPk.get(pk)!.push(item);
  });

  console.log(`\n📊 Found ${groupsByPk.size} unique groups:`);
  groupsByPk.forEach((items, pk) => {
    const groupInfo = items.find((i) => i.sk?.S === "GROUP_INFO");
    const schedules = items.filter((i) => i.sk?.S?.startsWith("SCHEDULE#"));
    console.log(`\n   ${pk}:`);
    console.log(`      - Total items: ${items.length}`);
    console.log(`      - GROUP_INFO: ${groupInfo ? "✅" : "❌"}`);
    console.log(`      - Schedules: ${schedules.length}`);
    
    if (groupInfo) {
      const unmarshalled = Object.fromEntries(
        Object.entries(groupInfo).map(([k, v]: [string, any]) => {
          if (k === "pk" || k === "sk") return [k, v.S];
          if (v.S) return [k, v.S];
          if (v.N) return [k, Number(v.N)];
          if (v.BOOL !== undefined) return [k, v.BOOL];
          if (v.M) return [k, Object.fromEntries(Object.entries(v.M).map(([k2, v2]: [string, any]) => [k2, v2.S || v2.N || v2]))];
          return [k, v];
        })
      );
      console.log(`      - Title: ${unmarshalled.title || "N/A"}`);
      console.log(`      - isPublic: ${unmarshalled.isPublic || "N/A"}`);
    }
  });

  // Step 2: Check if groups exist in groups.json
  console.log("\n📄 Step 2: Checking groups.json...");
  const projectRoot = path.resolve(__dirname, "../../..");
  const groupsPath = path.join(projectRoot, "groups.json");
  
  if (fs.existsSync(groupsPath)) {
    const groupsData = JSON.parse(fs.readFileSync(groupsPath, "utf8"));
    console.log(`   Found ${groupsData.length} groups in groups.json`);
    
    groupsByPk.forEach((items, pk) => {
      const groupTitle = pk.replace("GROUP#", "");
      const inJson = groupsData.some((g: any) => g.title === groupTitle);
      console.log(`   ${pk}: ${inJson ? "✅ In groups.json" : "❌ NOT in groups.json"}`);
    });
  } else {
    console.log("   ⚠️  groups.json not found");
  }

  // Step 3: Check for in-flight Step Function executions
  console.log("\n⚙️  Step 3: Checking for in-flight Step Function executions...");
  try {
    // Try to get Step Function ARN from Resource
    let stepFunctionArn: string | undefined;
    try {
      stepFunctionArn = (Resource as any).normalizeEventStepFunction?.arn || 
                       (Resource as any).normaizeEventStepFunction?.arn; // Note: typo in actual name
    } catch (e) {
      console.log("   ⚠️  Could not access Step Function resource");
    }
    
    if (!stepFunctionArn) {
      console.log("   ⚠️  Step Function ARN not available, skipping execution check");
    } else {
      console.log(`   Step Function ARN: ${stepFunctionArn}`);

      const listCommand = new ListExecutionsCommand({
        stateMachineArn: stepFunctionArn,
        maxResults: 10,
        statusFilter: "RUNNING",
      });

      const runningExecutions = await sfnClient.send(listCommand);
      
      if (runningExecutions.executions && runningExecutions.executions.length > 0) {
        console.log(`   ⚠️  Found ${runningExecutions.executions.length} RUNNING executions:`);
        for (const exec of runningExecutions.executions) {
          console.log(`      - ${exec.name} (${exec.executionArn})`);
          console.log(`        Started: ${exec.startDate}`);
        }
      } else {
        console.log("   ✅ No running executions");
      }

      // Check recent executions
      const recentCommand = new ListExecutionsCommand({
        stateMachineArn: stepFunctionArn,
        maxResults: 5,
      });
      const recentExecutions = await sfnClient.send(recentCommand);
      
      if (recentExecutions.executions && recentExecutions.executions.length > 0) {
        console.log(`\n   📋 Recent executions (last 5):`);
        for (const exec of recentExecutions.executions) {
          console.log(`      - ${exec.name}: ${exec.status} (${exec.startDate})`);
        }
      }
    }
  } catch (error) {
    console.log(`   ⚠️  Could not check Step Functions: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Step 4: Check for any items with unusual structure
  console.log("\n🔬 Step 4: Checking for unusual item structures...");
  groupsByPk.forEach((items, pk) => {
    const unusualItems = items.filter((item) => {
      const sk = item.sk?.S || "";
      return sk !== "GROUP_INFO" && !sk.startsWith("SCHEDULE#");
    });
    
    if (unusualItems.length > 0) {
      console.log(`   ⚠️  ${pk} has ${unusualItems.length} items with unusual sk values:`);
      unusualItems.forEach((item) => {
        console.log(`      - sk: ${item.sk?.S || "N/A"}`);
      });
    }
  });

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("📊 Summary:");
  console.log("=".repeat(80));
  console.log(`Total groups found: ${groupsByPk.size}`);
  console.log(`Total items: ${allGroupItems.length}`);
  
  if (groupsByPk.size > 0) {
    console.log("\n💡 To delete a specific group, run:");
    groupsByPk.forEach((items, pk) => {
      const groupTitle = pk.replace("GROUP#", "");
      console.log(`   npm run delete:group "${groupTitle}"`);
    });
  }
}

findPersistentGroups()
  .then(() => {
    console.log("\n✅ Diagnosis complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Diagnosis failed:", error);
    process.exit(1);
  });

