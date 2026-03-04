import { TouchGrassDynamoDB } from "@/lib/dynamodb/TouchGrassDynamoDB";
import { NextRequest, NextResponse } from "next/server";
import { Resource } from "sst";

/**
 * Round-robin pick events across categories so the user sees variety.
 * Events within each category keep their original order (score or date).
 */
function diversifyByCategory(events: any[], limit: number): any[] {
  // Group by primary category
  const buckets = new Map<string, any[]>();
  for (const event of events) {
    const cat = Array.isArray(event.category)
      ? event.category[0] || "General"
      : event.category || "General";
    if (!buckets.has(cat)) buckets.set(cat, []);
    buckets.get(cat)!.push(event);
  }

  // Round-robin across categories
  const result: any[] = [];
  const seen = new Set<string>();
  const categoryQueues = Array.from(buckets.values());
  const indices = new Array(categoryQueues.length).fill(0);

  while (result.length < limit) {
    let added = false;
    for (let i = 0; i < categoryQueues.length; i++) {
      if (result.length >= limit) break;
      const queue = categoryQueues[i];
      while (indices[i] < queue.length) {
        const event = queue[indices[i]];
        indices[i]++;
        const id = event.pk || event.title;
        if (!seen.has(id)) {
          seen.add(id);
          result.push(event);
          added = true;
          break;
        }
      }
    }
    if (!added) break; // All categories exhausted
  }

  return result;
}

interface RecommendationRequest {
  categoryPreferences?: string[];
  clickHistory?: { eventId: string; category?: string }[];
  lat?: number;
  lng?: number;
  limit?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: RecommendationRequest = await request.json();
    const {
      categoryPreferences = [],
      clickHistory = [],
      limit = 8,
    } = body;

    const db = new TouchGrassDynamoDB(Resource.Db.name);

    // Collect all category signals
    const clickedCategories = clickHistory
      .map((c) => c.category)
      .filter(Boolean) as string[];

    const allCategorySignals = [
      ...new Set([...categoryPreferences, ...clickedCategories]),
    ];

    const hasPersonalization =
      allCategorySignals.length > 0 || clickHistory.length > 0;

    if (!hasPersonalization) {
      // No user signals yet — return a diverse mix of upcoming events
      const upcomingAll = await db.getCurrentAndFutureEvents();
      const today = new Date().toISOString().split("T")[0];
      const upcoming = upcomingAll
        .filter((e) => e.start_date && e.start_date >= today)
        .sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""));
      const diverse = diversifyByCategory(upcoming, limit);
      return NextResponse.json({ events: diverse, hasPersonalization: false });
    }

    // Fetch events for each preferred category and merge
    const today = new Date().toISOString().split("T")[0];
    let candidateEvents: any[] = [];

    if (allCategorySignals.length > 0) {
      const categoryFetches = await Promise.all(
        allCategorySignals.map((cat) => db.getEventsByCategory(cat))
      );
      // Flatten and deduplicate by pk
      const seen = new Set<string>();
      for (const events of categoryFetches) {
        for (const event of events) {
          if (event.pk && !seen.has(event.pk)) {
            seen.add(event.pk);
            candidateEvents.push(event);
          }
        }
      }
    } else {
      // Only click history signals — fetch general events
      candidateEvents = await db.getEvents();
    }

    // Filter to future/today events only
    candidateEvents = candidateEvents.filter((event) => {
      if (!event.start_date) return false;
      return event.start_date >= today;
    });

    // Score events
    const clickedEventIds = new Set(clickHistory.map((c) => c.eventId));
    const categoryPreferenceSet = new Set(
      categoryPreferences.map((c) => c.toLowerCase())
    );
    const clickedCategorySet = new Set(
      clickedCategories.map((c) => c.toLowerCase())
    );

    const scored = candidateEvents.map((event) => {
      let score = 0;
      const reasons: string[] = [];

      const eventCategories: string[] = Array.isArray(event.category)
        ? event.category
        : event.category
        ? [event.category]
        : [];

      // Boost for explicit category preferences
      for (const cat of eventCategories) {
        if (categoryPreferenceSet.has(cat.toLowerCase())) {
          score += 3;
          reasons.push(`Matches your interest in ${cat}`);
        }
        if (clickedCategorySet.has(cat.toLowerCase())) {
          score += 2;
          reasons.push(`Similar to events you've viewed`);
        }
      }

      // Penalize already-clicked events
      if (clickedEventIds.has(event.pk)) {
        score -= 1;
      }

      // Small recency boost — closer dates rank higher
      if (event.start_date) {
        const daysAway = Math.ceil(
          (new Date(event.start_date + "T00:00:00").getTime() -
            Date.now()) /
            (1000 * 60 * 60 * 24)
        );
        if (daysAway <= 7) score += 1;
      }

      return {
        ...event,
        _recommendationScore: score,
        _recommendationReasons: [...new Set(reasons)],
      };
    });

    // Sort by score descending, then by date ascending
    scored.sort((a, b) => {
      if (b._recommendationScore !== a._recommendationScore) {
        return b._recommendationScore - a._recommendationScore;
      }
      return (a.start_date || "").localeCompare(b.start_date || "");
    });

    // Diversify across categories — round-robin so the user sees variety
    const topEvents = diversifyByCategory(scored, limit);

    return NextResponse.json({
      events: topEvents,
      hasPersonalization: true,
    });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 }
    );
  }
}
