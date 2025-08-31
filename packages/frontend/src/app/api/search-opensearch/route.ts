import { openSearchClient } from "@/lib/opensearch";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    console.log(
      "🔍 OpenSearch Unified API called with search params:",
      Object.fromEntries(searchParams)
    );

    // Parse query parameters
    const query = searchParams.get("q") || "";
    const types = (searchParams.get("types")?.split(",").filter(Boolean) as (
      | "event"
      | "group"
    )[]) || ["event", "group"];
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
      // Don't filter by type if searching both events and groups
      // Only filter by type if searching for a specific type
      type: types.length === 1 ? types[0] : undefined,
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

    console.log("🔍 Using OpenSearch unified search with filters:", filters);

    // Use OpenSearch for unified search of events and groups
    const result = await openSearchClient.search(query, filters);

    // Separate events and groups from results
    const events = result.hits.filter((item: any) => item.type === "event");
    const groups = result.hits.filter((item: any) => item.type === "group");

    const totalTime = Date.now() - startTime;
    console.log(
      `⏱️ OpenSearch unified API completed in ${totalTime}ms, retrieved ${result.total} total items (${events.length} events, ${groups.length} groups)`
    );

    return NextResponse.json({
      events,
      groups,
      total: result.total,
      eventsCount: events.length,
      groupsCount: groups.length,
      executionTime: totalTime,
      searchMethod: "opensearch",
      aggregations: result.aggregations,
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(
      `❌ Error in OpenSearch unified API after ${totalTime}ms:`,
      error
    );

    return NextResponse.json(
      {
        error: "Failed to search via OpenSearch",
        executionTime: totalTime,
        searchMethod: "opensearch",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
