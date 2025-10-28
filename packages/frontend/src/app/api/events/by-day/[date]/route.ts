import { TouchGrassDynamoDB } from "@/lib/dynamodb/TouchGrassDynamoDB";
import { NextResponse } from "next/server";
import { Resource } from "sst";

// GET /api/events/by-day/[date]
// date format: YYYY-MM-DD
export async function GET(
  _req: Request,
  context: { params: Promise<{ date: string }> }
) {
  try {
    const { date: raw } = await context.params;

    if (!raw) {
      return NextResponse.json(
        { error: "Missing date. Use YYYY-MM-DD or ISO string." },
        { status: 400 }
      );
    }

    // Decode and normalize: accept ISO (e.g., 2025-10-17T04:00:00.000Z) or YYYY-MM-DD
    const decoded = decodeURIComponent(raw);
    const date = decoded.split("T")[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Invalid date. Use YYYY-MM-DD or ISO string." },
        { status: 400 }
      );
    }

    const db = new TouchGrassDynamoDB(Resource.Db.name);
    const allEvents = await db.getEvents();

    // Include events that start on the date or span over the date
    const events = allEvents.filter((ev: any) => {
      const start = ev.start_date;
      const end = ev.end_date || ev.start_date;
      if (!start) return false;

      // Simple string compare works with YYYY-MM-DD
      return start <= date && date <= end;
    });

    return NextResponse.json({ date, count: events.length, events });
  } catch (error) {
    // console.error("Error fetching events by day:", error);
    return NextResponse.json(
      { error: "Failed to fetch events by day" },
      { status: 500 }
    );
  }
}
