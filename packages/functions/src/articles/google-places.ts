import { Resource } from "sst";

const PLACES_API_BASE = "https://maps.googleapis.com/maps/api/place";

export interface PlaceResult {
  name: string;
  rating: number;
  userRatingsTotal: number;
  address: string;
  placeId: string;
}

export interface PlaceDetails {
  name: string;
  rating: number;
  address: string;
  website?: string;
  reviews: { text: string; rating: number; authorName: string }[];
}

export interface GooglePlacesContent {
  places: PlaceResult[];
  detailedPlaces: PlaceDetails[];
}

function getApiKey(): string {
  return Resource.GOOGLE_MAPS_API_KEY.value;
}

/**
 * Search for places matching a query in the DC area
 */
export async function searchPlaces(query: string, limit = 10): Promise<PlaceResult[]> {
  const apiKey = getApiKey();
  const url = `${PLACES_API_BASE}/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    console.warn(`Google Places search failed: ${response.status}`);
    return [];
  }

  const data = await response.json();
  if (data.status !== "OK" || !Array.isArray(data.results)) {
    console.warn(`Google Places status: ${data.status}`);
    return [];
  }

  return data.results
    .slice(0, limit)
    .map((place: any) => ({
      name: place.name || "",
      rating: place.rating || 0,
      userRatingsTotal: place.user_ratings_total || 0,
      address: place.formatted_address || "",
      placeId: place.place_id || "",
    }));
}

/**
 * Get detailed info and reviews for a specific place
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const apiKey = getApiKey();
  const fields = "name,rating,formatted_address,reviews,website";
  const url = `${PLACES_API_BASE}/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    console.warn(`Google Place details failed for ${placeId}: ${response.status}`);
    return null;
  }

  const data = await response.json();
  if (data.status !== "OK" || !data.result) {
    return null;
  }

  const result = data.result;
  return {
    name: result.name || "",
    rating: result.rating || 0,
    address: result.formatted_address || "",
    website: result.website || undefined,
    reviews: (result.reviews || []).map((r: any) => ({
      text: r.text || "",
      rating: r.rating || 0,
      authorName: r.author_name || "Anonymous",
    })),
  };
}

/**
 * Gather Google Places content for a query - search + top place details
 */
export async function gatherGooglePlacesContent(query: string): Promise<GooglePlacesContent> {
  const places = await searchPlaces(query, 10);

  // Get details for top 5 places (reviews are only in details endpoint)
  const topPlaces = places.slice(0, 5);
  const detailedPlaces: PlaceDetails[] = [];

  for (const place of topPlaces) {
    if (place.placeId) {
      const details = await getPlaceDetails(place.placeId);
      if (details) {
        detailedPlaces.push(details);
      }
      // Small delay between requests
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return { places, detailedPlaces };
}

/**
 * Format Google Places content into a readable string for the LLM prompt
 */
export function formatGooglePlacesForPrompt(content: GooglePlacesContent): string {
  if (content.places.length === 0) {
    return "No Google Places results found for this topic.";
  }

  const placesList = content.places
    .filter((p) => p.rating > 0)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 10)
    .map((p) => `- ${p.name} — ${p.rating}/5 (${p.userRatingsTotal} reviews) — ${p.address}`)
    .join("\n");

  const reviewSnippets = content.detailedPlaces
    .flatMap((p) =>
      p.reviews
        .filter((r) => r.text.length > 30 && r.rating >= 4)
        .slice(0, 2)
        .map((r) => `- About ${p.name}: "${r.text.substring(0, 250)}" (${r.rating}/5)`)
    )
    .join("\n");

  let result = `## Top-Rated Places from Google\n\n${placesList}`;
  if (reviewSnippets) {
    result += `\n\n## Selected Google Reviews\n${reviewSnippets}`;
  }
  return result;
}
