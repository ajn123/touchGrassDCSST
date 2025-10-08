#!/usr/bin/env node

/**
 * Runner script for the analytics data transformation
 *
 * This script provides a simple way to run the transformation with proper
 * environment setup and error handling.
 */

const { execSync } = require("child_process");
const path = require("path");

console.log("🚀 Starting Analytics Data Transformation...");
console.log("📋 This script will:");
console.log(
  "   1. Scan records with pk: 'USER', 'SEARCH', and 'EVENT_PAGE_VISIT'"
);
console.log("   2. Transform USER records to ANALYTICS#USER_VISIT");
console.log("   3. Transform SEARCH records to ANALYTICS#SEARCH");
console.log(
  "   4. Transform EVENT_PAGE_VISIT records to ANALYTICS#EVENT_PAGE_VISIT"
);
console.log("   5. Clean up original records");
console.log("");

// Check if we're in the right directory
const packageJsonPath = path.join(process.cwd(), "package.json");
try {
  const packageJson = require(packageJsonPath);
  if (!packageJson.name || !packageJson.name.includes("touchGrassDCSST")) {
    throw new Error("Not in the right directory");
  }
} catch (error) {
  console.error("❌ Please run this script from the project root directory");
  process.exit(1);
}

// Check for required environment variables
const requiredEnvVars = ["AWS_REGION", "SST_STAGE"];
const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error("❌ Missing required environment variables:");
  missingEnvVars.forEach((envVar) => {
    console.error(`   - ${envVar}`);
  });
  console.error("");
  console.error("💡 Make sure you have SST environment loaded:");
  console.error("   npx sst env");
  process.exit(1);
}

console.log("✅ Environment check passed");
console.log(`📍 AWS Region: ${process.env.AWS_REGION}`);
console.log(`🏗️  SST Stage: ${process.env.SST_STAGE}`);
console.log("");

// Confirm before proceeding
console.log("⚠️  WARNING: This will modify data in your DynamoDB table!");
console.log("   Make sure you have a backup before proceeding.");
console.log("");

// In a real scenario, you might want to add a confirmation prompt here
// For now, we'll proceed automatically

try {
  console.log("🔄 Running transformation script...");

  const scriptPath = path.join(__dirname, "src", "transform-analytics-data.ts");
  execSync(`npx tsx "${scriptPath}"`, {
    stdio: "inherit",
    cwd: process.cwd(),
  });

  console.log("");
  console.log("🎉 Transformation completed successfully!");
} catch (error) {
  console.error("");
  console.error("💥 Transformation failed:", error.message);
  process.exit(1);
}
