import { TouchGrassDynamoDB } from "@/lib/dynamodb/TouchGrassDynamoDB";
import { NextRequest, NextResponse } from "next/server";
import { Resource } from "sst";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : 50;

    const db = new TouchGrassDynamoDB(Resource.Db.name);

    // Get all events and sort by createdAt descending
    const allEvents = await db.getEvents();

    // Sort by createdAt (most recent first)
    const sortedEvents = allEvents.sort((a: any, b: any) => {
      const aCreated = a.createdAt || 0;
      const bCreated = b.createdAt || 0;

      // Handle string timestamps
      const aTime =
        typeof aCreated === "string" ? parseInt(aCreated) : aCreated;
      const bTime =
        typeof bCreated === "string" ? parseInt(bCreated) : bCreated;

      return (bTime || 0) - (aTime || 0);
    });

    // Take the most recent events
    const recentEvents = sortedEvents.slice(0, limit);

    return NextResponse.json({
      events: recentEvents,
      count: recentEvents.length,
      total: allEvents.length,
    });
  } catch (error) {
    console.error("Error fetching recent events:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch recent events",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
