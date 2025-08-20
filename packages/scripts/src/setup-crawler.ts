#!/usr/bin/env tsx

import { DescribeTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { Resource } from "sst";

/**
 * Setup script for the DC Event Crawler
 * This script helps configure the necessary infrastructure and validates the setup
 */

interface SetupOptions {
  validateOnly?: boolean;
  createTables?: boolean;
  testConnection?: boolean;
}

class CrawlerSetup {
  private dynamoClient: DynamoDBClient;

  constructor() {
    this.dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION || "us-east-1",
    });
  }

  async run(options: SetupOptions = {}) {
    console.log("🚀 DC Event Crawler Setup");
    console.log("========================\n");

    try {
      // Test AWS connection
      if (options.testConnection !== false) {
        await this.testAWSConnection();
      }

      // Validate DynamoDB table
      if (options.validateOnly !== false) {
        await this.validateDynamoDBTable();
      }

      // Create tables if needed
      if (options.createTables) {
        await this.createCrawlerTables();
      }

      // Validate environment
      await this.validateEnvironment();

      // Show configuration summary
      await this.showConfigurationSummary();

      console.log("\n✅ Setup completed successfully!");
      console.log("\nNext steps:");
      console.log("1. Install dependencies: npm install");
      console.log("2. Test the crawler: npm run crawl:test");
      console.log("3. Run manual crawl: npm run crawl:manual");
      console.log("4. Start scheduled crawling: npm run crawl");
    } catch (error) {
      console.error("\n❌ Setup failed:", error);
      process.exit(1);
    }
  }

  private async testAWSConnection() {
    console.log("🔗 Testing AWS connection...");

    try {
      // Try to list tables to test connection
      const command = new DescribeTableCommand({
        TableName: Resource.Db.name,
      });

      await this.dynamoClient.send(command);
      console.log("✅ AWS connection successful");
    } catch (error: any) {
      if (error.name === "ResourceNotFoundException") {
        console.log(
          "⚠️  DynamoDB table not found (this is expected for new setups)"
        );
      } else if (error.name === "UnauthorizedOperation") {
        throw new Error("AWS credentials insufficient - check IAM permissions");
      } else {
        throw new Error(`AWS connection failed: ${error.message}`);
      }
    }
  }

  private async validateDynamoDBTable() {
    console.log("\n📊 Validating DynamoDB table...");

    try {
      const command = new DescribeTableCommand({
        TableName: Resource.Db.name,
      });

      const result = await this.dynamoClient.send(command);
      const table = result.Table;

      if (!table) {
        throw new Error("Table not found");
      }

      console.log(`✅ Table found: ${table.TableName}`);
      console.log(`   Status: ${table.TableStatus}`);
      console.log(`   Billing Mode: ${table.BillingMode}`);

      // Check for required indexes
      const gsis = table.GlobalSecondaryIndexes || [];
      const hasLocationDateIndex = gsis.some(
        (gsi) => gsi.IndexName === "locationDateIndex"
      );

      if (!hasLocationDateIndex) {
        console.log(
          "⚠️  Location-date index not found - consider adding for better performance"
        );
      } else {
        console.log("✅ Location-date index found");
      }
    } catch (error: any) {
      if (error.name === "ResourceNotFoundException") {
        console.log("⚠️  DynamoDB table not found");
        console.log("   This is expected for new setups");
        console.log(
          "   The table will be created when you first run the crawler"
        );
      } else {
        throw error;
      }
    }
  }

  private async createCrawlerTables() {
    console.log("\n🏗️  Creating crawler tables...");

    // Note: In a real setup, you'd create these through SST infrastructure
    // This is just a placeholder for manual table creation if needed

    console.log("ℹ️  Tables should be created through SST infrastructure");
    console.log("   Run: sst deploy");
    console.log("   Or check your sst.config.ts for table definitions");
  }

  private async validateEnvironment() {
    console.log("\n🔍 Validating environment...");

    const requiredEnvVars = [
      "AWS_REGION",
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
    ];

    const missing = requiredEnvVars.filter((env) => !process.env[env]);

    if (missing.length > 0) {
      console.log("⚠️  Missing environment variables:");
      missing.forEach((env) => console.log(`   - ${env}`));
      console.log("\n   Set these in your .env file or environment");
    } else {
      console.log("✅ Environment variables configured");
    }

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split(".")[0]);

    if (majorVersion < 18) {
      console.log(`⚠️  Node.js version ${nodeVersion} detected`);
      console.log("   Recommended: Node.js 18+ for best performance");
    } else {
      console.log(`✅ Node.js version ${nodeVersion} is compatible`);
    }
  }

  private async showConfigurationSummary() {
    console.log("\n📋 Configuration Summary");
    console.log("========================");

    console.log(`AWS Region: ${process.env.AWS_REGION || "us-east-1"}`);
    console.log(`DynamoDB Table: ${Resource.Db.name}`);
    console.log(`Node.js Version: ${process.version}`);

    // Show available event sources
    console.log("\nEvent Sources Configured:");
    const { dcEventSources } = await import("./dc-event-sources");

    dcEventSources.forEach((source, index) => {
      console.log(`  ${index + 1}. ${source.name}`);
      console.log(`     URL: ${source.baseUrl}`);
      console.log(`     Event URLs: ${source.eventUrls.length}`);
    });

    console.log(`\nTotal Sources: ${dcEventSources.length}`);

    // Show crawling schedules
    const { crawlingSchedule } = await import("./dc-event-sources");
    console.log("\nCrawling Schedules:");
    console.log(`  Daily: ${crawlingSchedule.daily.length} sources`);
    console.log(`  Weekly: ${crawlingSchedule.weekly.length} sources`);
    console.log(`  Monthly: ${crawlingSchedule.monthly.length} sources`);
    console.log(`  Frequent: ${crawlingSchedule.frequent.length} sources`);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  const options: SetupOptions = {
    validateOnly: args.includes("--validate-only"),
    createTables: args.includes("--create-tables"),
    testConnection: !args.includes("--no-test-connection"),
  };

  const setup = new CrawlerSetup();
  await setup.run(options);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { CrawlerSetup };
