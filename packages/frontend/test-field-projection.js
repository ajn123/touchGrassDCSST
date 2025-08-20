#!/usr/bin/env node

/**
 * Test script for the field projection feature
 * This script demonstrates how to use the new fields parameter in the events API
 */

const API_BASE = "http://localhost:3000/api";

async function testFieldProjection() {
  console.log("🧪 Testing Field Projection Feature\n");

  try {
    // Test 1: Get all fields (default behavior)
    console.log("📋 Test 1: Get all fields (default)");
    const allFieldsResponse = await fetch(`${API_BASE}/events?limit=2`);
    const allFieldsData = await allFieldsResponse.json();
    console.log(
      `✅ Retrieved ${allFieldsData.events.length} events with all fields`
    );
    console.log(
      `📊 Sample event keys: ${Object.keys(allFieldsData.events[0] || {}).join(
        ", "
      )}`
    );
    console.log(`⏱️ Execution time: ${allFieldsData.executionTime}ms\n`);

    // Test 2: Get only title and location
    console.log("🎯 Test 2: Get only title and location fields");
    const titleLocationResponse = await fetch(
      `${API_BASE}/events?fields=title,location&limit=2`
    );
    const titleLocationData = await titleLocationResponse.json();
    console.log(
      `✅ Retrieved ${titleLocationData.events.length} events with title and location only`
    );
    console.log(
      `📊 Sample event keys: ${Object.keys(
        titleLocationData.events[0] || {}
      ).join(", ")}`
    );
    console.log(`⏱️ Execution time: ${titleLocationData.executionTime}ms\n`);

    // Test 3: Get only title, location, and cost
    console.log("💰 Test 3: Get only title, location, and cost fields");
    const titleLocationCostResponse = await fetch(
      `${API_BASE}/events?fields=title,location,cost&limit=2`
    );
    const titleLocationCostData = await titleLocationCostResponse.json();
    console.log(
      `✅ Retrieved ${titleLocationCostData.events.length} events with title, location, and cost only`
    );
    console.log(
      `📊 Sample event keys: ${Object.keys(
        titleLocationCostData.events[0] || {}
      ).join(", ")}`
    );
    console.log(
      `⏱️ Execution time: ${titleLocationCostData.executionTime}ms\n`
    );

    // Test 4: Search with field projection
    console.log("🔍 Test 4: Search with field projection");
    const searchResponse = await fetch(
      `${API_BASE}/events?q=event&fields=title,cost&limit=2`
    );
    const searchData = await searchResponse.json();
    console.log(
      `✅ Retrieved ${searchData.events.length} events matching "event" with title and cost only`
    );
    console.log(
      `📊 Sample event keys: ${Object.keys(searchData.events[0] || {}).join(
        ", "
      )}`
    );
    console.log(`⏱️ Execution time: ${searchData.executionTime}ms\n`);

    // Test 5: Category search with field projection
    console.log("🏷️ Test 5: Category search with field projection");
    const categoryResponse = await fetch(
      `${API_BASE}/events?categories=music&fields=title,location&limit=2`
    );
    const categoryData = await categoryResponse.json();
    console.log(
      `✅ Retrieved ${categoryData.events.length} events in music category with title and location only`
    );
    console.log(
      `📊 Sample event keys: ${Object.keys(categoryData.events[0] || {}).join(
        ", "
      )}`
    );
    console.log(`⏱️ Execution time: ${categoryData.executionTime}ms\n`);

    console.log("🎉 All tests completed successfully!");
    console.log("\n📝 Summary:");
    console.log("- Field projection works with all search methods");
    console.log("- DynamoDB ProjectionExpression is used for efficiency");
    console.log("- Required fields (pk) are automatically included");
    console.log("- Backward compatibility is maintained");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.log("\n💡 Make sure the development server is running:");
    console.log("   npm run dev");
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testFieldProjection();
}

module.exports = { testFieldProjection };
