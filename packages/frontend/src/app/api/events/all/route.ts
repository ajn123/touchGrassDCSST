import { TouchGrassDynamoDB } from "@/lib/dynamodb/TouchGrassDynamoDB";
import { NextRequest, NextResponse } from "next/server";
import { Resource } from "sst";

/**
 * GET /api/events/all
 * Returns all events from DynamoDB (current/future by default, or all if includePastEvents=true)
 * Filtering is done on the frontend
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const includePastEvents = searchParams.get("includePastEvents") === "true";
    
    const db = new TouchGrassDynamoDB(Resource.Db.name);
    
    // Get events based on includePastEvents parameter
    const events = includePastEvents 
      ? await db.getEvents() // Get all events including past
      : await db.getCurrentAndFutureEvents(); // Get only current and future events

    const totalTime = Date.now() - startTime;
    console.log(
      `⏱️ Fetched ${events.length} events (includePastEvents: ${includePastEvents}) in ${totalTime}ms`
    );

    return NextResponse.json({
      events,
      count: events.length,
      executionTime: totalTime,
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ Error fetching events after ${totalTime}ms:`, error);
    return NextResponse.json(
      { error: "Failed to fetch events", executionTime: totalTime },
      { status: 500 }
    );
  }
}

