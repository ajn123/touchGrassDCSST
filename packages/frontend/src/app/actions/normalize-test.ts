"use server";

import { Resource } from "sst";

export async function testNormalizeEvents() {
  try {
    // Create test events with different formats
    const testEvents = [
      {
        title: "Test Music Concert",
        description: "A test music concert for normalization testing",
        date: "2024-12-25",
        time: "7:00 PM",
        location: "Test Venue, Washington DC",
        category: "music",
        price: "$25",
      },
      {
        title: "Test OpenWebNinja Event",
        description: "A test event from OpenWebNinja format",
        start_time: "2024-12-26 8:00 PM",
        venue: {
          name: "Test OpenWebNinja Venue",
          address: "123 Test St, Washington DC",
        },
        link: "https://test.com/event",
        publisher: "Test Publisher",
      },
      {
        title: "Test Crawler Event",
        description: "A test event from crawler format",
        start_date: "2024-12-27",
        start_time: "6:30 PM",
        location: "Test Crawler Location",
        venue: "Test Crawler Venue",
        category: ["festival", "community"],
        cost: {
          type: "free",
          currency: "USD",
          amount: 0,
        },
      },
    ];

    console.log(`Api URL: ${Resource.Api.url}`);
    console.log(`'  client', testEvents`);
    console.log(`Trying to normalize events ... `);
    const response = await fetch(`${Resource.Api.url}/events/normalize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        events: testEvents,
        source: "admin-test",
        eventType: "washingtonian", // Test with washingtonian format first
      }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      return {
        success: true,
        message: `✅ Normalization test successful! ${result.message}`,
        eventsAdded: result.savedCount,
        eventsFound: result.normalizedCount,
        executionTime: result.executionTime,
        timestamp: new Date().toISOString(),
        savedEvents: result.savedEvents,
      };
    } else {
      return {
        success: false,
        message: `❌ Normalization test failed: ${
          result.error || "Unknown error"
        }`,
        error: result.error,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `❌ Network error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
