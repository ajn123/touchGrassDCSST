import { searchEventsOptimized } from "@/lib/dynamodb/dynamodb-events";
import { EventNormalizer, NormalizedEvent } from "@/lib/event-normalizer";
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
      isPublic: isPublic,
      fields,
    };

    console.log("🔍 Using searchEventsOptimized with filters:", filters);

    // Use the optimized search function with timeout handling
    const result = await searchEventsOptimized(filters);

    // Handle both array and object return types
    const events = Array.isArray(result) ? result : result.events;
    const count = Array.isArray(result) ? result.length : result.total;

    const totalTime = Date.now() - startTime;
    console.log(
      `⏱️ API route completed in ${totalTime}ms, retrieved ${count} events`
    );

    return NextResponse.json({
      events,
      count,
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

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { events, source, eventType, action } = body;

    // Handle normalization requests
    if (action === "normalize" || eventType) {
      if (!events || !Array.isArray(events)) {
        return NextResponse.json(
          { error: "Events array is required" },
          { status: 400 }
        );
      }

      const normalizer = new EventNormalizer();
      const normalizedEvents: NormalizedEvent[] = [];

      // Transform events based on type
      for (const event of events) {
        let normalizedEvent: NormalizedEvent;

        switch (eventType) {
          case "openwebninja":
            normalizedEvent = normalizer.transformOpenWebNinjaEvent(event);
            break;
          case "washingtonian":
            normalizedEvent = normalizer.transformWashingtonianEvent(event);
            break;
          case "crawler":
            normalizedEvent = normalizer.transformCrawlerEvent(event);
            break;
          default:
            // Assume it's already in normalized format
            normalizedEvent = event;
        }

        normalizedEvents.push(normalizedEvent);
      }

      // Save all events
      const eventIds = await normalizer.saveEvents(normalizedEvents, source);

      const totalTime = Date.now() - startTime;
      return NextResponse.json({
        success: true,
        savedCount: eventIds.length,
        eventIds,
        message: `Successfully normalized and saved ${eventIds.length} events`,
        executionTime: totalTime,
      });
    }

    // Handle direct event creation (existing functionality)
    // This would be for creating single events from forms, etc.
    return NextResponse.json(
      { error: "Invalid action. Use action: 'normalize' for batch processing" },
      { status: 400 }
    );
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`❌ Error in events POST after ${totalTime}ms:`, error);
    return NextResponse.json(
      { error: "Failed to process events", executionTime: totalTime },
      { status: 500 }
    );
  }
}
