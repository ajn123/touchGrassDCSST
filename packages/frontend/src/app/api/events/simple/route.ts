import { TouchGrassDynamoDB } from "@/lib/dynamodb/TouchGrassDynamoDB";
import { NextResponse } from "next/server";
import { Resource } from "sst";

export async function GET() {
  try {
    const db = new TouchGrassDynamoDB(Resource.Db.name);
    const events = await db.getEvents();

    return NextResponse.json({
      events,
      count: events.length,
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}
