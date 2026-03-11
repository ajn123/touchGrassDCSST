import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { Handler } from "aws-lambda";
import { Resource } from "sst";

const EVENTS_URL = "https://potomac.org/pc-events?format=json";
const MAX_EVENTS = 50;

function parseSquarespaceDate(epochMs: number): { date: string; time: string } {
  const d = new Date(epochMs);

  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return {
    date: dateFormatter.format(d),
    time: timeFormatter.format(d),
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const handler: Handler = async () => {
  console.log("Potomac Conservancy handler started");

  try {
    const response = await fetch(EVENTS_URL);
    if (!response.ok) {
      throw new Error(`Squarespace API error: ${response.status}`);
    }

    const data = await response.json();
    // Potomac Conservancy uses "items" array (standard Squarespace collection)
    const items = data.items || data.upcoming || [];

    console.log(`Found ${items.length} events`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const events: any[] = [];

    for (const item of items) {
      if (!item.title || !item.startDate) continue;

      // Skip past events
      const eventDate = new Date(item.startDate);
      if (eventDate < today) continue;

      // Only include cleanup/volunteer events (skip galas, fundraisers, etc.)
      const titleLower = item.title.toLowerCase();
      const isVolunteer =
        titleLower.includes("cleanup") ||
        titleLower.includes("clean-up") ||
        titleLower.includes("clean up") ||
        titleLower.includes("steward") ||
        titleLower.includes("restoration") ||
        titleLower.includes("volunteer") ||
        titleLower.includes("invasive") ||
        titleLower.includes("planting") ||
        titleLower.includes("service");

      if (!isVolunteer) {
        console.log(`Skipping non-volunteer event: ${item.title}`);
        continue;
      }

      const start = parseSquarespaceDate(item.startDate);
      const end = item.endDate
        ? parseSquarespaceDate(item.endDate)
        : undefined;

      const description = item.body ? stripHtml(item.body) : undefined;
      const url = item.fullUrl
        ? `https://potomac.org${item.fullUrl}`
        : "https://potomac.org/pc-events";

      // Build location from Squarespace location object
      let location: string | undefined;
      if (item.location) {
        const parts = [
          item.location.addressTitle,
          item.location.addressLine1,
          item.location.addressLine2,
        ].filter(Boolean);
        location = parts.join(", ") || undefined;
      }

      events.push({
        title: item.title,
        date: start.date,
        time: start.time,
        end_time: end?.time,
        description: description?.substring(0, 500),
        url,
        image_url: item.assetUrl || undefined,
        category: "Volunteer",
        venue: "Potomac Conservancy",
        location: location || "Washington, DC area",
      });
    }

    events.sort((a, b) => a.date.localeCompare(b.date));
    const limited = events.slice(0, MAX_EVENTS);

    console.log(
      `Total: ${events.length} volunteer events, sending ${limited.length} to normalization`
    );

    if (limited.length === 0) {
      console.log("No upcoming volunteer events found");
      return { statusCode: 200, body: "No upcoming events" };
    }

    const client = new SFNClient({});
    const executionName = `potomac-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const payload = JSON.stringify({
      events: limited,
      source: "potomacconservancy",
      eventType: "potomacconservancy",
    });

    const MAX_PAYLOAD_SIZE = 256 * 1024;
    if (payload.length > MAX_PAYLOAD_SIZE) {
      const batchSize = Math.floor(
        limited.length / Math.ceil(payload.length / MAX_PAYLOAD_SIZE)
      );
      for (let i = 0; i < limited.length; i += batchSize) {
        const batch = limited.slice(i, i + batchSize);
        const batchPayload = JSON.stringify({
          events: batch,
          source: "potomacconservancy",
          eventType: "potomacconservancy",
        });
        const batchName = `potomac-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await client.send(
          new StartExecutionCommand({
            stateMachineArn: Resource.normaizeEventStepFunction.arn,
            input: batchPayload,
            name: batchName,
          })
        );
      }
    } else {
      await client.send(
        new StartExecutionCommand({
          stateMachineArn: Resource.normaizeEventStepFunction.arn,
          input: payload,
          name: executionName,
        })
      );
    }

    console.log("Successfully sent events to normalization");
    return {
      statusCode: 200,
      body: `Processed ${limited.length} volunteer events`,
    };
  } catch (error) {
    console.error("Potomac Conservancy crawler failed:", error);
    throw error;
  }
};
