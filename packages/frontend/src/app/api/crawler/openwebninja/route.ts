import { NextRequest, NextResponse } from "next/server";
import { Resource } from "sst";

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 Manual OpenWebNinja crawler trigger requested");

    // Call the OpenWebNinja Lambda function via the API route
    const response = await fetch(`${Resource.Api.url}/crawler/openwebninja`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: result.message || "OpenWebNinja crawler completed successfully",
      eventsFound: result.processed,
      eventsAdded: result.inserted,
      reindexed: result.reindexed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Failed to trigger OpenWebNinja crawler:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
