import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { Handler } from "aws-lambda";
import { Resource } from "sst";

const EVENTS_URL = "https://www.dccomedyloft.com/events";
const MAX_EVENTS = 50;

/**
 * Convert a UTC ISO 8601 date string to Eastern time date + time strings.
 */
function parseISODateToEastern(isoDate: string): { date: string; time: string } | null {
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return null;

    const dateStr = d.toLocaleDateString("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const timeStr = d.toLocaleTimeString("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const [month, day, year] = dateStr.split("/");
    const date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

    return { date, time: timeStr.toLowerCase() };
  } catch {
    return null;
  }
}

/**
 * Strip HTML tags from a string.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract JSON-LD Event entries from HTML.
 */
function parseEvents(html: string): any[] {
  const events: any[] = [];

  // Find all <script type="application/ld+json"> blocks
  const scriptRegex = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let scriptMatch;

  while ((scriptMatch = scriptRegex.exec(html)) !== null) {
    let parsed: any;
    try {
      parsed = JSON.parse(scriptMatch[1]);
    } catch {
      continue;
    }

    // Handle array, @graph wrapper, Place.Events wrapper, or bare object
    const items: any[] = Array.isArray(parsed)
      ? parsed
      : parsed["Events"]
      ? parsed["Events"]
      : parsed["@graph"]
      ? parsed["@graph"]
      : [parsed];

    for (const item of items) {
      if (item["@type"] !== "Event") continue;

      const title = (item.name || "").trim();
      const startDate = item.startDate || "";
      if (!title || !startDate) continue;

      const description = item.description ? stripHtml(item.description) : "";

      let url = item.url || "";
      if (url && !url.startsWith("http")) {
        url = `https://www.dccomedyloft.com${url}`;
      }
      if (url && !url.includes("dccomedyloft.com")) continue;

      const eastern = parseISODateToEastern(startDate);
      if (!eastern) continue;

      events.push({
        title,
        date: eastern.date,
        time: eastern.time,
        location: "1523 22nd St NW, Washington DC 20037",
        description: description || undefined,
        url: url || undefined,
        category: "comedy",
        venue: "The Comedy Loft of DC",
      });
    }
  }

  return events;
}

export const handler: Handler = async () => {
  console.log("DC Comedy Loft Lambda handler started");

  try {
    const response = await fetch(EVENTS_URL);
    if (!response.ok) {
      throw new Error(`DC Comedy Loft fetch error: ${response.status}`);
    }

    const html = await response.text();
    console.log(`Fetched ${html.length} bytes of HTML`);

    const rawEvents = parseEvents(html);
    console.log(`Parsed ${rawEvents.length} events from JSON-LD`);

    // Filter to future events only
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    const futureEvents = rawEvents.filter((e) => e.date >= todayStr);
    console.log(`${futureEvents.length} future events after filtering`);

    // Sort and limit
    futureEvents.sort((a, b) => a.date.localeCompare(b.date));
    const limited = futureEvents.slice(0, MAX_EVENTS);

    if (limited.length === 0) {
      console.log("No upcoming events found");
      return { statusCode: 200, body: "No upcoming events" };
    }

    // Send to Step Functions
    const client = new SFNClient({});
    const payload = JSON.stringify({
      events: limited,
      source: "dccomedyloft",
      eventType: "dccomedyloft",
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
          source: "dccomedyloft",
          eventType: "dccomedyloft",
        });
        const batchName = `dccomedyloft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await client.send(
          new StartExecutionCommand({
            stateMachineArn: Resource.normaizeEventStepFunction.arn,
            input: batchPayload,
            name: batchName,
          })
        );
        console.log(`Batch ${Math.floor(i / batchSize) + 1} sent (${batch.length} events)`);
      }
    } else {
      const executionName = `dccomedyloft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      await client.send(
        new StartExecutionCommand({
          stateMachineArn: Resource.normaizeEventStepFunction.arn,
          input: payload,
          name: executionName,
        })
      );
    }

    console.log(`Successfully sent ${limited.length} events to normalization`);
    return {
      statusCode: 200,
      body: `Processed ${limited.length} DC Comedy Loft events`,
    };
  } catch (error) {
    console.error("DC Comedy Loft crawler failed:", error);
    throw error;
  }
};
