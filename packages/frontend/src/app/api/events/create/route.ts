import { TouchGrassDynamoDB } from "@/lib/dynamodb/TouchGrassDynamoDB";
import { NextRequest, NextResponse } from "next/server";
import { Resource } from "sst";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const db = new TouchGrassDynamoDB(Resource.Db.name);
    const result = await db.createEvent(formData);
    
    return NextResponse.json({
      success: true,
      message: result,
    });
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}
