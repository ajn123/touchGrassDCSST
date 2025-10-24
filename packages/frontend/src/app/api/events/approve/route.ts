import { TouchGrassDynamoDB } from "@/lib/dynamodb/TouchGrassDynamoDB";
import { NextRequest, NextResponse } from "next/server";
import { Resource } from "sst";

export async function POST(request: NextRequest) {
  try {
    const { eventId } = await request.json();
    const db = new TouchGrassDynamoDB(Resource.Db.name);
    const result = await db.approveEvent(eventId);

    return NextResponse.json({
      success: true,
      message: result,
    });
  } catch (error) {
    console.error("Error approving event:", error);
    return NextResponse.json(
      { error: "Failed to approve event" },
      { status: 500 }
    );
  }
}
