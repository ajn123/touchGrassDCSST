import { getEvent } from "@/lib/dynamodb-events";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id: eventId } = await params;

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    console.log(`🔍 Fetching event: ${eventId}`);
    const event = await getEvent(eventId);

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    console.log(`✅ Event found: ${event.title}`);
    return NextResponse.json({
      event,
      success: true,
    });
  } catch (error) {
    console.error(`❌ Error fetching event:`, error);
    return NextResponse.json(
      {
        error: "Failed to fetch event",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
