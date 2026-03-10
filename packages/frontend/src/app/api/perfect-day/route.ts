import { TouchGrassDynamoDB } from "@/lib/dynamodb/TouchGrassDynamoDB";
import {
  bucketEventsByTime,
  buildItineraryPrompt,
  formatEventsForPrompt,
  type EventForBucketing,
  type Itinerary,
  type PerfectDayPreferences,
} from "@/lib/perfect-day";
import { NextRequest, NextResponse } from "next/server";
import { Resource } from "sst";

const PLACES_API_BASE = "https://maps.googleapis.com/maps/api/place";

// ── Google Places (inline to keep server-side key usage simple) ──

interface PlaceResult {
  name: string;
  rating: number;
  userRatingsTotal: number;
  address: string;
}

async function searchRestaurants(query: string, limit = 6): Promise<PlaceResult[]> {
  const apiKey = Resource.GOOGLE_MAPS_API_KEY.value;
  const url = `${PLACES_API_BASE}/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();
    if (data.status !== "OK" || !Array.isArray(data.results)) return [];

    return data.results.slice(0, limit).map((place: any) => ({
      name: place.name || "",
      rating: place.rating || 0,
      userRatingsTotal: place.user_ratings_total || 0,
      address: place.formatted_address || "",
    }));
  } catch {
    return [];
  }
}

function formatRestaurantsForPrompt(places: PlaceResult[]): string {
  if (places.length === 0) return "No restaurant data available.";
  return places
    .filter((p) => p.rating > 0)
    .sort((a, b) => b.rating - a.rating)
    .map((p) => `- ${p.name} — ${p.rating}/5 (${p.userRatingsTotal} reviews) — ${p.address}`)
    .join("\n");
}

// ── OpenRouter ──

async function callOpenRouter(prompt: string): Promise<string> {
  const apiKey = Resource.OPENROUTER_API_KEY.value;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-001",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${text}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// ── Route Handler ──

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: PerfectDayPreferences = await request.json();
    const { date, categories, budget } = body;

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    // 1. Query events for this date
    const db = new TouchGrassDynamoDB(Resource.Db.name);
    const allEvents = await db.getCurrentAndFutureEvents();

    // Filter to events on the selected date
    const dateEvents = allEvents.filter((event: any) => {
      const eventDate = event.start_date || "";
      return eventDate === date;
    });

    // Separate food/drink events from activity events
    const foodCategories = ["food & drink", "food", "drink", "nightlife"];
    const foodEvents: EventForBucketing[] = [];
    const activityEvents: EventForBucketing[] = [];

    for (const event of dateEvents) {
      const cat = Array.isArray(event.category)
        ? event.category.map((c: string) => c.toLowerCase())
        : [(event.category || "").toLowerCase()];

      if (cat.some((c: string) => foodCategories.some((fc) => c.includes(fc)))) {
        foodEvents.push(event);
      } else {
        // If categories specified, prefer matching events
        if (categories.length > 0) {
          const matchesCategory = cat.some((c: string) =>
            categories.some((pref) => c.includes(pref.toLowerCase()))
          );
          if (matchesCategory) {
            activityEvents.push(event);
          }
        } else {
          activityEvents.push(event);
        }
      }
    }

    // If category filtering was too strict, add back unfiltered events
    if (activityEvents.length < 5 && categories.length > 0) {
      for (const event of dateEvents) {
        if (!activityEvents.includes(event) && !foodEvents.includes(event)) {
          activityEvents.push(event);
        }
        if (activityEvents.length >= 15) break;
      }
    }

    // 2. Bucket activity events by time of day
    const buckets = bucketEventsByTime(activityEvents);
    const eventsText = formatEventsForPrompt(buckets);

    // 3. Fetch restaurants from Google Places
    const restaurantQuery = "best restaurants Washington DC";
    const restaurants = await searchRestaurants(restaurantQuery);
    const restaurantsText = formatRestaurantsForPrompt(restaurants);

    // 4. Build prompt and call OpenRouter
    const prompt = buildItineraryPrompt(eventsText, restaurantsText, foodEvents, body);
    const rawResponse = await callOpenRouter(prompt);

    // 5. Parse the AI response
    let itinerary: Itinerary;
    try {
      // Strip markdown code fences if present
      const cleaned = rawResponse
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      const parsed = JSON.parse(cleaned);
      itinerary = {
        date,
        title: parsed.title || "Your Perfect Day in DC",
        slots: parsed.slots || [],
        tips: parsed.tips || "",
      };
    } catch {
      // If JSON parse fails, try to extract JSON from the response
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          itinerary = {
            date,
            title: parsed.title || "Your Perfect Day in DC",
            slots: parsed.slots || [],
            tips: parsed.tips || "",
          };
        } catch {
          return NextResponse.json(
            { error: "Failed to parse AI response", raw: rawResponse.substring(0, 500) },
            { status: 500 },
          );
        }
      } else {
        return NextResponse.json(
          { error: "Failed to parse AI response", raw: rawResponse.substring(0, 500) },
          { status: 500 },
        );
      }
    }

    const executionTime = Date.now() - startTime;

    return NextResponse.json({
      itinerary,
      meta: {
        eventsOnDate: dateEvents.length,
        activityEventsUsed: activityEvents.length,
        foodEventsFound: foodEvents.length,
        restaurantsFound: restaurants.length,
        executionTime,
      },
    });
  } catch (error) {
    console.error("Perfect Day API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate itinerary" },
      { status: 500 },
    );
  }
}
