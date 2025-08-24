import { searchEventsOptimized } from "@/lib/dynamodb-events";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    console.log(
      "🔍 API route called with search params:",
      Object.fromEntries(searchParams)
    );

    // Parse query parameters
    const query = searchParams.get("q") || undefined;
    const categories =
      searchParams.get("categories")?.split(",").filter(Boolean) || undefined;
    const costMin = searchParams.get("costMin")
      ? parseFloat(searchParams.get("costMin")!)
      : undefined;
    const costMax = searchParams.get("costMax")
      ? parseFloat(searchParams.get("costMax")!)
      : undefined;
    const costType = searchParams.get("costType") || undefined;
    const location =
      searchParams.get("location")?.split(",").filter(Boolean) || undefined;
    const dateStart = searchParams.get("dateStart") || undefined;
    const dateEnd = searchParams.get("dateEnd") || undefined;
    const sortBy = searchParams.get("sortBy") || undefined;
    const sortOrder =
      (searchParams.get("sortOrder") as "asc" | "desc") || undefined;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : 100;
    const isPublic =
      searchParams.get("isPublic") === "true"
        ? true
        : searchParams.get("isPublic") === "false"
        ? false
        : undefined;
    const fields =
      searchParams.get("fields")?.split(",").filter(Boolean) || undefined;

    // Build filters object
    const filters = {
      query,
      categories,
      costRange: {
        min: costMin,
        max: costMax,
        type: costType,
      },
      location,
      dateRange: {
        start: dateStart,
        end: dateEnd,
      },
      sortBy,
      sortOrder,
      limit,
      is_public: isPublic,
      fields,
    };

    console.log("🔍 Using searchEventsOptimized with filters:", filters);

    // Use the optimized search function with timeout handling
    const events = await searchEventsOptimized(filters);

    const totalTime = Date.now() - startTime;
    console.log(
      `⏱️ API route completed in ${totalTime}ms, retrieved ${events.length} events`
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
