import { getEvents } from "@/lib/dynamodb/dynamodb-events";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("🧪 Testing getEvents function...");

    const events = await getEvents();

    console.log(`🧪 Found ${events.length} events`);

    if (events.length > 0) {
      console.log("🧪 First event:", {
        pk: events[0].pk,
        title: events[0].title,
        isPublic: events[0].isPublic,
      });
    }

    return NextResponse.json({
      success: true,
      count: events.length,
      events: events.slice(0, 5), // Return first 5 for testing
      message: `Found ${events.length} events total`,
    });
  } catch (error) {
    console.error("❌ Test failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        count: 0,
        events: [],
      },
      { status: 500 }
    );
  }
}
