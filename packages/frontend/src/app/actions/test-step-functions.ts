"use server";

import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { Resource } from "sst";

export default async function testStepFunctionsNormalization() {
  try {
    console.log("🚀 Testing Step Functions normalization workflow...");

    const testEvents = [
      {
        title: "Test Washingtonian Event",
        description: "A test event from Washingtonian",
        date: "2024-12-25",
        time: "7:00 PM",
        location: "Test Venue, Washington DC",
        category: "Music",
        source: "washingtonian",
        url: "https://washingtonian.com/test-event",
      },
      {
        title: "Test OpenWebNinja Event",
        description: "A test event from OpenWebNinja API",
        start_date: "2024-12-26",
        start_time: "8:00 PM",
        venue: "Test Venue",
        location: "Washington DC",
        category: ["Arts", "Culture"],
        source: "openwebninja",
        external_id: "test-123",
      },
      {
        title: "Test Crawler Event",
        description: "A test event from crawler",
        eventDate: "2024-12-27",
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
