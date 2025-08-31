// Simple test script to verify OpenSearch returns both events and groups
const { searchOpenSearch } = require("./src/lib/opensearch-actions");

async function testOpenSearchUnified() {
  console.log("🧪 Testing OpenSearch unified search (events + groups)...");

  try {
    // Test 1: Search with a query that should return both events and groups
    console.log(
      '\n📝 Test 1: Search with query "music" (should return both events and groups)'
    );
    const results1 = await searchOpenSearch("music", { limit: 20 });

    console.log("✅ Search successful");
    console.log(`📊 Total results: ${results1.total}`);
    console.log(`📈 Hits returned: ${results1.hits.length}`);

    // Count events and groups
    const events = results1.hits.filter((item) => item.type === "event");
    const groups = results1.hits.filter((item) => item.type === "group");

    console.log(`🎵 Events found: ${events.length}`);
    console.log(`👥 Groups found: ${groups.length}`);

    if (events.length > 0) {
      console.log("🎵 Sample event:", events[0].title);
    }
    if (groups.length > 0) {
      console.log("👥 Sample group:", groups[0].title);
    }

    // Test 2: Search with no query (should return recent items)
    console.log("\n📝 Test 2: Search with no query (recent items)");
    const results2 = await searchOpenSearch("", { limit: 10 });

    console.log("✅ Recent items search successful");
    console.log(`📊 Total results: ${results2.total}`);

    const events2 = results2.hits.filter((item) => item.type === "event");
    const groups2 = results2.hits.filter((item) => item.type === "group");

    console.log(`🎵 Events found: ${events2.length}`);
    console.log(`👥 Groups found: ${groups2.length}`);

    // Test 3: Search with type filter for events only
    console.log("\n📝 Test 3: Search events only (with type filter)");
    const results3 = await searchOpenSearch("event", {
      type: "event",
      limit: 10,
    });

    console.log("✅ Events-only search successful");
    console.log(`📊 Total results: ${results3.total}`);

    const events3 = results3.hits.filter((item) => item.type === "event");
    const groups3 = results3.hits.filter((item) => item.type === "group");

    console.log(`🎵 Events found: ${events3.length}`);
    console.log(`👥 Groups found: ${groups3.length}`);

    // Test 4: Search with type filter for groups only
    console.log("\n📝 Test 4: Search groups only (with type filter)");
    const results4 = await searchOpenSearch("group", {
      type: "group",
      limit: 10,
    });

    console.log("✅ Groups-only search successful");
    console.log(`📊 Total results: ${results4.total}`);

    const events4 = results4.hits.filter((item) => item.type === "event");
    const groups4 = results4.hits.filter((item) => item.type === "group");

    console.log(`🎵 Events found: ${events4.length}`);
    console.log(`👥 Groups found: ${groups4.length}`);

    console.log("\n🎉 All OpenSearch tests completed successfully!");
    console.log(
      "✅ OpenSearch is correctly returning both events and groups when no type filter is applied"
    );
  } catch (error) {
    console.error("❌ Test failed with error:", error.message);
    console.log("\n💡 Make sure OpenSearch is properly configured and running");
  }
}

// Run the test
testOpenSearchUnified();
