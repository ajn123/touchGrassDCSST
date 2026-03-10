import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { Handler } from "aws-lambda";
import { Resource } from "sst";

// Ticketmaster venue IDs for major DC concert venues
const DC_CONCERT_VENUES = [
  {
    name: "The Anthem",
    venueId: "KovZ917A3Y7",
    address: "901 Wharf St SW, Washington, DC 20024",
  },
  {
    name: "9:30 Club",
    venueId: "KovZpZA7knFA",
    address: "815 V St NW, Washington, DC 20001",
  },
  {
    name: "Capital One Arena",
    venueId: "KovZpaKuJe",
    address: "601 F St NW, Washington, DC 20004",
  },
  {
    name: "Merriweather Post Pavilion",
    venueId: "KovZpZA1JkvA",
    address: "10475 Little Patuxent Pkwy, Columbia, MD 21044",
  },
  {
    name: "The Fillmore Silver Spring",
    venueId: "KovZpZA6tFlA",
    address: "8656 Colesville Rd, Silver Spring, MD 20910",
  },
  {
    name: "Wolf Trap",
    venueId: "KovZpZAtvJeA",
    address: "1551 Trap Rd, Vienna, VA 22182",
  },
];

const MAX_EVENTS = 50;

/**
 * Pick the best image from Ticketmaster's image array (prefer 16:9, largest width).
 */
function pickBestImage(images: any[]): string | undefined {
  if (!images || images.length === 0) return undefined;

  // Prefer 16_9 ratio images
  const wideImages = images.filter((img: any) => img.ratio === "16_9");
  const pool = wideImages.length > 0 ? wideImages : images;

  // Pick largest width
  pool.sort((a: any, b: any) => (b.width || 0) - (a.width || 0));
  return pool[0]?.url;
}

export const handler: Handler = async () => {
  console.log("Ticketmaster Concerts handler started");

  const apiKey = Resource.TICKETMASTER_API_KEY.value;
  if (!apiKey) {
    console.error("TICKETMASTER_API_KEY not set");
    return { statusCode: 500, body: "Missing API key" };
  }

  try {
    const allEvents: any[] = [];
    const seenKeys = new Set<string>();
    const failedVenues: string[] = [];
    const today = new Date().toISOString().split("T")[0];

    for (const venue of DC_CONCERT_VENUES) {
      console.log(`Fetching concerts for ${venue.name}...`);

      try {
        const url = `https://app.ticketmaster.com/discovery/v2/events.json?venueId=${venue.venueId}&classificationName=music&size=50&sort=date,asc&apikey=${apiKey}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Ticketmaster API error: ${response.status}`);
        }

        const data = await response.json();
        const events = data?._embedded?.events || [];

        for (const event of events) {
          const localDate = event.dates?.start?.localDate;
          if (!localDate || localDate < today) continue;

          const dedupeKey = `${event.name}|${localDate}`;
          if (seenKeys.has(dedupeKey)) continue;
          seenKeys.add(dedupeKey);

          const eventVenue = event._embedded?.venues?.[0];
          const address = eventVenue?.address?.line1;
          const city = eventVenue?.city?.name || "";
          const state = eventVenue?.state?.stateCode || "";
          const location = [address, city, state].filter(Boolean).join(", ");

          allEvents.push({
            title: event.name,
            date: localDate,
            time: event.dates?.start?.localTime || undefined,
            venue: eventVenue?.name || venue.name,
            location: location || venue.address,
            category: "Music",
            description: event.info || event.pleaseNote || undefined,
            url: event.url,
            image_url: pickBestImage(event.images),
            price: event.priceRanges?.[0]?.min
              ? String(event.priceRanges[0].min)
              : undefined,
          });
        }

        console.log(
          `Found ${events.length} events for ${venue.name} (${allEvents.length} total)`
        );
      } catch (error) {
        console.error(`Failed to fetch ${venue.name}:`, error);
        failedVenues.push(venue.name);
      }

      // Rate limit: 200ms delay between venue requests
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    if (failedVenues.length > 0) {
      console.error(
        `Ticketmaster fetch failed for venues: ${failedVenues.join(", ")}`
      );
    }

    // Sort by date and limit
    allEvents.sort((a, b) => a.date.localeCompare(b.date));
    const events = allEvents.slice(0, MAX_EVENTS);

    console.log(
      `Total: ${allEvents.length} concerts, sending ${events.length} to normalization`
    );

    if (events.length === 0) {
      console.log("No upcoming concerts found");
      return { statusCode: 200, body: "No upcoming concerts" };
    }

    // Send to Step Functions for normalization
    const client = new SFNClient({});
    const payload = JSON.stringify({
      events,
      source: "ticketmaster",
      eventType: "ticketmaster",
    });

    // Batch if payload exceeds 256KB
    const MAX_PAYLOAD_SIZE = 256 * 1024;
    if (payload.length > MAX_PAYLOAD_SIZE) {
      const batchSize = Math.floor(
        events.length / Math.ceil(payload.length / MAX_PAYLOAD_SIZE)
      );
      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        const batchPayload = JSON.stringify({
          events: batch,
          source: "ticketmaster",
          eventType: "ticketmaster",
        });
        const batchName = `ticketmaster-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await client.send(
          new StartExecutionCommand({
            stateMachineArn: Resource.normaizeEventStepFunction.arn,
            input: batchPayload,
            name: batchName,
          })
        );
        console.log(
          `Batch ${Math.floor(i / batchSize) + 1} sent (${batch.length} events)`
        );
      }
    } else {
      const executionName = `ticketmaster-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await client.send(
        new StartExecutionCommand({
          stateMachineArn: Resource.normaizeEventStepFunction.arn,
          input: payload,
          name: executionName,
        })
      );
    }

    console.log(
      `Ticketmaster handler completed. ${events.length} concerts sent to normalization.`
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Ticketmaster concerts processed",
        total: events.length,
      }),
    };
  } catch (error) {
    console.error(
      JSON.stringify({
        error: error instanceof Error ? error.message : String(error),
        context: { handler: "ticketmaster-concerts" },
        timestamp: new Date().toISOString(),
      })
    );
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
