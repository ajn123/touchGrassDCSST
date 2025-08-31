#!/usr/bin/env tsx

import { existsSync, writeFileSync } from "fs";
import { join } from "path";

async function setupEnvironment() {
  console.log("🔧 OpenSearch Environment Setup");
  console.log("===============================");

  const envFile = join(process.cwd(), ".env.opensearch");

  if (existsSync(envFile)) {
    console.log("ℹ️ Environment file already exists at .env.opensearch");
    console.log("   You can edit it manually or delete it to recreate.");
    return;
  }

  const envContent = `# OpenSearch Configuration
# Copy these values from your AWS OpenSearch domain

# OpenSearch endpoint (get from AWS Console)
OPENSEARCH_ENDPOINT=https://search-your-domain.us-east-1.es.amazonaws.com

# OpenSearch credentials
OPENSEARCH_USERNAME=admin
OPENSEARCH_PASSWORD=your-password

# OpenSearch index name
OPENSEARCH_INDEX=events

# DynamoDB table name
DYNAMODB_TABLE=your-table-name

# AWS region
AWS_REGION=us-east-1

# How to use:
# 1. Update the values above with your actual OpenSearch domain details
# 2. Run: source .env.opensearch
# 3. Run: npm run node:migrate
# 4. Run: npm run node:test:search
`;

  writeFileSync(envFile, envContent);

  console.log("✅ Created .env.opensearch file");
  console.log(
    "📝 Please edit the file with your actual OpenSearch domain details:"
  );
  console.log(`   ${envFile}`);
  console.log("");
  console.log("🚀 After updating the file, run:");
  console.log("   source .env.opensearch");
  console.log("   npm run node:migrate");
  console.log("   npm run node:test:search");
}

setupEnvironment().catch(console.error);
