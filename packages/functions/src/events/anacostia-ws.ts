import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { Handler } from "aws-lambda";
import { Resource } from "sst";

const RSS_URL =
  "https://www.anacostiaws.org/events-and-recreation/events-calendar.html?format=feed&type=rss";
const MAX_EVENTS = 50;

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

/**
 * Parse RFC 2822 date (e.g. "Sat, 14 Mar 2026 10:30:00 -0400")
 * into { date: "YYYY-MM-DD", time: "h:mm AM/PM" }
 */
function parseRssDate(dateStr: string): { date: string; time: string } | null {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;

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
 * Simple XML tag extractor — no XML parser dependency needed.
 * Gets content between <tag> and </tag>.
 */
function extractTag(xml: string, tag: string): string {
  // Handle CDATA
  const cdataRegex = new RegExp(
    `<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`,
    "i"
  );
  const cdataMatch = xml.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();

  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = xml.match(regex);
  return match ? match[1].trim() : "";
}

export const handler: Handler = async () => {
  console.log("Anacostia Watershed Society handler started");

  try {
    const response = await fetch(RSS_URL);
    if (!response.ok) {
      throw new Error(`RSS fetch error: ${response.status}`);
    }

    const xml = await response.text();

    // Split RSS into items
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    const items: string[] = [];
    let match;
    while ((match = itemRegex.exec(xml)) !== null) {
      items.push(match[1]);
    }

    console.log(`Found ${items.length} RSS items`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const events: any[] = [];

    for (const item of items) {
      const title = extractTag(item, "title");
      const pubDateStr = extractTag(item, "pubDate");
      const description = extractTag(item, "description");
      const link = extractTag(item, "link");

      if (!title || !pubDateStr) continue;

      const parsed = parseRssDate(pubDateStr);
      if (!parsed) continue;

      // Skip past events
      const eventDate = new Date(pubDateStr);
      if (eventDate < today) continue;

      // Extract location from description HTML if present
      const descText = stripHtml(description);

      // Try to extract end time from description (format: "MM/DD/YY HH:MM am - MM/DD/YY HH:MM pm")
      let endTime: string | undefined;
      const timeRangeMatch = descText.match(
        /\d{1,2}\/\d{1,2}\/\d{2}\s+\d{1,2}:\d{2}\s*[ap]m\s*-\s*\d{1,2}\/\d{1,2}\/\d{2}\s+(\d{1,2}:\d{2}\s*[ap]m)/i
      );
      if (timeRangeMatch) {
        endTime = timeRangeMatch[1].trim();
      }

      events.push({
        title,
        date: parsed.date,
        time: parsed.time,
        end_time: endTime,
        description: descText.substring(0, 500),
        url: link || "https://www.anacostiaws.org/events-and-recreation/events-calendar.html",
        category: "Volunteer",
        venue: "Anacostia Watershed Society",
        location: "Washington, DC area",
      });
    }

    events.sort((a, b) => a.date.localeCompare(b.date));
    const limited = events.slice(0, MAX_EVENTS);

    console.log(
      `Total: ${events.length} future events, sending ${limited.length} to normalization`
    );

    if (limited.length === 0) {
      console.log("No upcoming events found");
      return { statusCode: 200, body: "No upcoming events" };
    }

    const client = new SFNClient({});
    const executionName = `anacostiaws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const payload = JSON.stringify({
      events: limited,
      source: "anacostiaws",
      eventType: "anacostiaws",
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
          source: "anacostiaws",
          eventType: "anacostiaws",
        });
        const batchName = `anacostiaws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
    console.error("Anacostia Watershed Society crawler failed:", error);
    throw error;
  }
};
