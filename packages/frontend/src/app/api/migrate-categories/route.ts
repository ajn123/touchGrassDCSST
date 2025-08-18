import { migrateEventsToCategoryRecords } from "@/lib/dynamodb-events";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    console.log("🚀 Starting category record migration via API...");

    const result = await migrateEventsToCategoryRecords();

    console.log("✅ Category record migration completed via API:", result);

    return NextResponse.json({
      success: true,
      message: "Category record migration completed",
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Category record migration failed via API:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Category record migration failed",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Use POST to trigger category record migration",
    timestamp: new Date().toISOString(),
  });
}
