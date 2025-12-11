"use server";

import { Resource } from "sst";

export async function testNormalizeEvents() {
  try {
    // Generate random ID to ensure unique events that can always be inserted
    const randomId = Math.random().toString(36).substring(2, 9);
    const timestamp = Date.now();
    
    // Calculate future dates to ensure events are in the future
    const today = new Date();
    const futureDate1 = new Date(today);
    futureDate1.setDate(today.getDate() + 7);
    const futureDate2 = new Date(today);
    futureDate2.setDate(today.getDate() + 8);
    const futureDate3 = new Date(today);
    futureDate3.setDate(today.getDate() + 9);
    
    // Create test events with different formats - using random ID to ensure uniqueness
    const testEvents = [
      {
        title: `Test Music Concert ${randomId}`,
        description: `A test music concert for normalization testing (${timestamp})`,
        date: futureDate1.toISOString().split('T')[0],
        time: "7:00 PM",
        location: "Test Venue, Washington DC",
        category: "music",
        price: "$25",
      },
      {
        title: `Test OpenWebNinja Event ${randomId}`,
        description: `A test event from OpenWebNinja format (${timestamp})`,
        start_time: `${futureDate2.toISOString().split('T')[0]} 8:00 PM`,
        venue: {
          name: "Test OpenWebNinja Venue",
          address: "123 Test St, Washington DC",
        },
        link: `https://test.com/event-${randomId}`,
        publisher: "Test Publisher",
      },
      {
        title: `Test Crawler Event ${randomId}`,
        description: `A test event from crawler format (${timestamp})`,
        start_date: futureDate3.toISOString().split('T')[0],
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
