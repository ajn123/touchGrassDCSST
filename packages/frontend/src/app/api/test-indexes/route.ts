import { validateIndexUsage } from "@/lib/dynamodb-events";
import { NextResponse } from "next/server";

export async function GET() {
  const startTime = Date.now();

  try {
    console.log("🧪 Testing index usage via API endpoint...");

    const results = await validateIndexUsage();

    const totalTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      message: "Index validation completed",
      results,
      totalExecutionTime: totalTime,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ Index validation failed after ${totalTime}ms:`, error);

    return NextResponse.json(
      {
        success: false,
        error: "Index validation failed",
        details: error instanceof Error ? error.message : "Unknown error",
        totalExecutionTime: totalTime,
      },
      { status: 500 }
    );
  }
}
