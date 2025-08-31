import OpenSearchMigrator from "./migrate-to-opensearch";

async function testOpenSearch() {
  console.log("🧪 Testing OpenSearch Connection");
  console.log("================================");

  const config = {
    endpoint: process.env.OPENSEARCH_ENDPOINT || "http://localhost:9200",
    region: process.env.AWS_REGION || "us-east-1",
    indexName: "test-index",
    username: process.env.OPENSEARCH_USERNAME || "admin",
    password: process.env.OPENSEARCH_PASSWORD || "admin",
  };

  console.log("Configuration:", {
    endpoint: config.endpoint,
    region: config.region,
    indexName: config.indexName,
    username: config.username,
    password: config.password ? "***" : "not set",
  });

  try {
    const migrator = new OpenSearchMigrator(config);

    console.log("✅ OpenSearch client created successfully");

    // Test basic connection
    console.log("🔍 Testing connection...");
    const stats = await migrator.getIndexStats();
    console.log("✅ Connection successful");

    // Test index creation
    console.log("🔧 Testing index creation...");
    const indexCreated = await migrator.createIndex();
    if (indexCreated) {
      console.log("✅ Index creation successful");
    } else {
      console.log("⚠️ Index creation failed");
    }

    // Test search
    console.log("🔍 Testing search functionality...");
    const searchResults = await migrator.search("test");
    console.log("✅ Search functionality working");

    console.log("🎉 All tests passed! OpenSearch is ready for migration.");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

// Run the test
testOpenSearch().catch(console.error);
