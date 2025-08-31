import { openSearchClient } from "@/lib/opensearch";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    console.log(
      "🔍 OpenSearch Events API called with search params:",
      Object.fromEntries(searchParams)
    );

    // Parse query parameters
    const query = searchParams.get("q") || "";
    const categories =
      searchParams.get("categories")?.split(",").filter(Boolean) || undefined;
    const costMin = searchParams.get("costMin")
      ? parseFloat(searchParams.get("costMin")!)
      : undefined;
    const costMax = searchParams.get("costMax")
      ? parseFloat(searchParams.get("costMax")!)
      : undefined;
    const costType = searchParams.get("costType") || undefined;
    const location = searchParams.get("location") || undefined;
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
    const offset = searchParams.get("offset")
      ? parseInt(searchParams.get("offset")!)
      : 0;

    // Build OpenSearch filters
    const filters = {
      type: "event", // Only search for events
      categories,
      location,
      dateRange: {
        start: dateStart,
        end: dateEnd,
      },
      sortBy,
      sortOrder,
      limit,
      offset,
      isPublic,
    };

    console.log("🔍 Using OpenSearch with filters:", filters);

    // Use OpenSearch for much better search performance
    const result = await openSearchClient.search(query, filters);

    const totalTime = Date.now() - startTime;
    console.log(
      `⏱️ OpenSearch API completed in ${totalTime}ms, retrieved ${result.total} events`
    );

    return NextResponse.json({
      events: result.hits,
      count: result.total,
      executionTime: totalTime,
      searchMethod: "opensearch",
      aggregations: result.aggregations,
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(
      `❌ Error in OpenSearch events API after ${totalTime}ms:`,
      error
    );

    return NextResponse.json(
      {
        error: "Failed to fetch events via OpenSearch",
        executionTime: totalTime,
        searchMethod: "opensearch",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
