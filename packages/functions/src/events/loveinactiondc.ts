import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { Handler } from "aws-lambda";
import { Resource } from "sst";

const EVENTS_URL =
  "https://www.loveinactiondc.com/volunteeropportunities?format=json";
const MAX_EVENTS = 50;

/**
 * Convert epoch milliseconds to Eastern date (YYYY-MM-DD) and time (h:mm AM/PM).
 */
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

/**
 * Strip HTML tags and decode entities for plain text description.
 */
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
  console.log("Love In Action DC handler started");

  try {
    const response = await fetch(EVENTS_URL);
    if (!response.ok) {
      throw new Error(`Squarespace API error: ${response.status}`);
    }

    const data = await response.json();
    const upcoming = data.upcoming || [];

    console.log(`Found ${upcoming.length} upcoming events`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const events: any[] = [];

    for (const item of upcoming) {
      if (!item.title || !item.startDate) continue;

      // Skip full events
      const titleLower = item.title.toLowerCase();
      if (
        titleLower.includes("(event full)") ||
        titleLower.includes("(full)")
      ) {
        console.log(`Skipping full event: ${item.title}`);
        continue;
      }

      // Skip past events
      const eventDate = new Date(item.startDate);
      if (eventDate < today) continue;

      const start = parseSquarespaceDate(item.startDate);
      const end = item.endDate
        ? parseSquarespaceDate(item.endDate)
        : undefined;

      // Clean title (remove status markers)
      const title = item.title
        .replace(/\s*\(Event Full\)\s*/gi, "")
        .replace(/\s*\(FULL\)\s*/gi, "")
        .trim();

      const description = item.body ? stripHtml(item.body) : undefined;
      const url = item.fullUrl
        ? `https://www.loveinactiondc.com${item.fullUrl}`
        : "https://www.loveinactiondc.com/volunteeropportunities";

      events.push({
        title,
        date: start.date,
        time: start.time,
        end_time: end?.time,
        description: description?.substring(0, 500),
        url,
        image_url: item.assetUrl || undefined,
        category: "Volunteer",
        venue: "Love In Action DC",
        location: "Washington, DC",
      });
    }

    // Sort by date and limit
    events.sort((a, b) => a.date.localeCompare(b.date));
    const limited = events.slice(0, MAX_EVENTS);

    console.log(
      `Total: ${events.length} future events, sending ${limited.length} to normalization`
    );

    if (limited.length === 0) {
      console.log("No upcoming volunteer events found");
      return { statusCode: 200, body: "No upcoming events" };
    }

    // Send to Step Functions for normalization
    const client = new SFNClient({});
    const executionName = `loveinactiondc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const payload = JSON.stringify({
      events: limited,
      source: "loveinactiondc",
      eventType: "loveinactiondc",
    });

    // Batch if payload exceeds 256KB
    const MAX_PAYLOAD_SIZE = 256 * 1024;
    if (payload.length > MAX_PAYLOAD_SIZE) {
      const batchSize = Math.floor(
        limited.length / Math.ceil(payload.length / MAX_PAYLOAD_SIZE)
      );
      for (let i = 0; i < limited.length; i += batchSize) {
        const batch = limited.slice(i, i + batchSize);
        const batchPayload = JSON.stringify({
          events: batch,
          source: "loveinactiondc",
          eventType: "loveinactiondc",
        });
        const batchName = `loveinactiondc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
    console.error("Love In Action DC crawler failed:", error);
    throw error;
  }
};
