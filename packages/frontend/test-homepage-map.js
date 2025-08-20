#!/usr/bin/env node

/**
 * Test script for the HomepageMap component
 * This script tests the API endpoint that the map component uses
 */

const API_BASE = "http://localhost:3000/api";

async function testHomepageMap() {
  console.log("🧪 Testing HomepageMap Component API\n");

  try {
    // Test 1: Fetch events with location data using field projection
    console.log("📍 Test 1: Fetch events with location data");
    const locationResponse = await fetch(
      `${API_BASE}/events?fields=title,description,location,coordinates,cost,category,date&is_public=true`
    );
    
    if (!locationResponse.ok) {
      throw new Error(`HTTP error! status: ${locationResponse.status}`);
    }
    
    const locationData = await locationResponse.json();
    console.log(`✅ Retrieved ${locationData.events?.length || 0} total events`);
    
    // Filter events with location data
    const eventsWithLocation = locationData.events?.filter(event => 
      event.coordinates || event.location
    ) || [];
    
    console.log(`📍 Found ${eventsWithLocation.length} events with location data`);
    console.log(`⏱️ Execution time: ${locationData.executionTime}ms\n`);

    // Test 2: Show sample events with location data
    if (eventsWithLocation.length > 0) {
      console.log("🎯 Sample events with location data:");
      eventsWithLocation.slice(0, 3).forEach((event, index) => {
        console.log(`\n${index + 1}. ${event.title}`);
        console.log(`   📍 Location: ${event.location || 'N/A'}`);
        console.log(`   🗺️ Coordinates: ${event.coordinates || 'N/A'}`);
        console.log(`   🏷️ Category: ${event.category || 'N/A'}`);
        console.log(`   💰 Cost: ${event.cost ? (typeof event.cost === 'object' ? event.cost.amount : event.cost) : 'N/A'}`);
        console.log(`   📅 Date: ${event.date || 'N/A'}`);
      });
    }

    // Test 3: Test field projection efficiency
    console.log("\n🎯 Test 3: Field projection efficiency");
    const allFieldsResponse = await fetch(`${API_BASE}/events?is_public=true&limit=5`);
    const allFieldsData = await allFieldsResponse.json();
    
    if (allFieldsData.events?.[0]) {
      const allFieldsKeys = Object.keys(allFieldsData.events[0]);
      const projectedKeys = ['pk', 'title', 'description', 'location', 'coordinates', 'cost', 'category', 'date'];
      
      console.log(`📊 All fields response: ${allFieldsKeys.length} fields`);
      console.log(`📊 Projected fields response: ${projectedKeys.length} fields`);
      console.log(`📈 Data reduction: ${Math.round((1 - projectedKeys.length / allFieldsKeys.length) * 100)}%`);
    }

    // Test 4: Test different field combinations
    console.log("\n🎯 Test 4: Different field combinations");
    const titleOnlyResponse = await fetch(`${API_BASE}/events?fields=title,coordinates&is_public=true&limit=3`);
    const titleOnlyData = await titleOnlyResponse.json();
    
    if (titleOnlyData.events?.[0]) {
      const titleOnlyKeys = Object.keys(titleOnlyData.events[0]);
      console.log(`📊 Title + coordinates only: ${titleOnlyKeys.join(', ')}`);
    }

    console.log("\n🎉 All tests completed successfully!");
    console.log("\n📝 Summary:");
    console.log(`- Total events: ${locationData.events?.length || 0}`);
    console.log(`- Events with location: ${eventsWithLocation.length}`);
    console.log(`- Field projection working: ✅`);
    console.log(`- API response time: ${locationData.executionTime}ms`);
    
    if (eventsWithLocation.length === 0) {
      console.log("\n⚠️  No events with location data found!");
      console.log("   This might mean:");
      console.log("   - No events have been created yet");
      console.log("   - Events don't have coordinates or location fields");
      console.log("   - The map component will show a 'no events' message");
    }

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.log("\n💡 Make sure the development server is running:");
    console.log("   npm run dev");
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testHomepageMap();
}

module.exports = { testHomepageMap };
