#!/usr/bin/env node

/**
 * Script to migrate existing events to create category records for GSI indexing
 * This script calls the POST /api/migrate-categories endpoint
 */

const https = require("https");
const http = require("http");

// Configuration
const config = {
  hostname: "localhost",
  port: 3000,
  path: "/api/migrate-categories",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "User-Agent": "Category-Migration-Script/1.0",
  },
};

// Helper function to make HTTP request
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const protocol = options.port === 443 ? https : http;

    const req = protocol.request(options, (res) => {
      let responseData = "";

      res.on("data", (chunk) => {
        responseData += chunk;
      });

      res.on("end", () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData,
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData,
          });
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Main migration function
async function runMigration() {
  console.log("🚀 Starting category record migration...");
  console.log(
    `📡 Making POST request to: http://${config.hostname}:${config.port}${config.path}`
  );
  console.log(
    "⏳ This may take a while depending on the number of events...\n"
  );

  try {
    const startTime = Date.now();

    const response = await makeRequest(config);

    const totalTime = Date.now() - startTime;

    console.log("✅ Migration completed successfully!");
    console.log(`⏱️ Total time: ${totalTime}ms`);
    console.log(`📊 Status Code: ${response.statusCode}`);
    console.log("\n📋 Response Details:");
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log("\n🎉 Migration was successful!");
      if (response.data.result) {
        console.log(
          `📈 Events processed: ${response.data.result.migrated || "Unknown"}`
        );
        console.log(
          `❌ Errors encountered: ${response.data.result.errors || "Unknown"}`
        );
      }
    } else {
      console.log("\n⚠️ Migration completed but may have had issues");
    }
  } catch (error) {
    console.error("\n❌ Migration failed with error:");
    console.error(error.message);

    if (error.code === "ECONNREFUSED") {
      console.log("\n💡 Troubleshooting tips:");
      console.log("1. Make sure your Next.js development server is running");
      console.log(
        `2. Verify the server is accessible at http://${config.hostname}:${config.port}`
      );
      console.log("3. Check that the /api/migrate-categories endpoint exists");
    }

    process.exit(1);
  }
}

// Handle command line arguments
function parseArguments() {
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--host":
      case "-h":
        config.hostname = args[i + 1] || "localhost";
        i++;
        break;
      case "--port":
      case "-p":
        config.port = parseInt(args[i + 1]) || 3000;
        i++;
        break;
      case "--help":
        console.log(`
Category Migration Script

Usage: node migrate_categories.js [options]

Options:
  -h, --host <hostname>  Server hostname (default: localhost)
  -p, --port <port>      Server port (default: 3000)
  --help                  Show this help message

Examples:
  node migrate_categories.js
  node migrate_categories.js --host 192.168.1.100 --port 3001
  node migrate_categories.js -h myapp.com -p 443
        `);
        process.exit(0);
        break;
    }
  }
}

// Main execution
if (require.main === module) {
  parseArguments();
  runMigration();
}

module.exports = { runMigration, makeRequest };
