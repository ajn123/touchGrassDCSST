import {
  deleteEventsByCategory,
  deleteMultipleEvents,
} from "@/lib/dynamodb/dynamodb-events";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventIds, category } = body;

    if (category) {
      // Delete all events in a category
      const result = await deleteEventsByCategory(category);
      return NextResponse.json(JSON.parse(result.body), {
        status: result.statusCode,
      });
    } else if (eventIds && Array.isArray(eventIds)) {
      // Delete specific events by IDs
      const result = await deleteMultipleEvents(eventIds);
      return NextResponse.json(JSON.parse(result.body), {
        status: result.statusCode,
      });
    } else {
      return NextResponse.json(
        { error: "Either eventIds array or category must be provided" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error in batch delete API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
