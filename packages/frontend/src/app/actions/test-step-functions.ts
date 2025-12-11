"use server";

import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { Resource } from "sst";

export default async function testStepFunctionsNormalization() {
  try {
    console.log("🚀 Testing Step Functions normalization workflow...");

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

    const testEvents = [
      {
        title: `Test Washingtonian Event ${randomId}`,
        description: `A test event from Washingtonian (${timestamp})`,
        date: futureDate1.toISOString().split('T')[0],
        time: "7:00 PM",
        location: "Test Venue, Washington DC",
        category: "Music",
        source: "washingtonian",
        url: `https://washingtonian.com/test-event-${randomId}`,
      },
      {
        title: `Test OpenWebNinja Event ${randomId}`,
        description: `A test event from OpenWebNinja API (${timestamp})`,
        start_date: futureDate2.toISOString().split('T')[0],
        start_time: "8:00 PM",
        venue: "Test Venue",
        location: "Washington DC",
        category: ["Arts", "Culture"],
        source: "openwebninja",
        external_id: `test-${randomId}-${timestamp}`,
      },
      {
        title: `Test Crawler Event ${randomId}`,
        description: `A test event from crawler (${timestamp})`,
        eventDate: futureDate3.toISOString().split('T')[0],
        eventTime: "9:00 PM",
        eventLocation: "Test Location",
        eventCategory: "Food & Drink",
        source: "crawler",
      },
    ];

    const config = {}; // type is SFNClientConfig
    const client = new SFNClient(config);

    // Generate unique execution name with timestamp
    const executionName = `test-normalization-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const inputObject = {
      // StartExecutionInput
      stateMachineArn: Resource.normaizeEventStepFunction.arn, // corrected resource name
      input: JSON.stringify({
        events: testEvents,
        source: "admin-test",
        eventType: "washingtonian",
      }),
    };

    const command = new StartExecutionCommand(inputObject);
    const response = await client.send(command);

    console.log("🚀 Step Functions test successful:", response);

    return {
      success: true,
      message: `Step Functions execution started successfully`,
      executionArn: response.executionArn,
      executionName: executionName,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ Step Functions test failed:", error);
    return {
      success: false,
      message: `❌ Step Functions error: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    };
  }
}
