import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { Handler } from "aws-lambda";
import { Resource } from "sst";

// The site migrated from a Joomla RSS feed to WordPress + The Events Calendar,
// which exposes a clean REST API. We page through it starting from today.
const API_BASE = "https://www.anacostiaws.org/wp-json/tribe/events/v1/events";
const FALLBACK_URL = "https://www.anacostiaws.org/events/";
const MAX_EVENTS = 50;
const PER_PAGE = 50;

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
 * Convert The Events Calendar date details (already in the site's local
 * Eastern time) into { date: "YYYY-MM-DD", time: "h:mm AM/PM" }.
 */
function formatEventTime(
  details: any
): { date: string; time: string } | null {
  if (!details || !details.year || !details.month || !details.day) return null;

  const date = `${details.year}-${details.month}-${details.day}`;

  let time = "";
  const hour = parseInt(details.hour ?? "", 10);
  const minutes = details.minutes ?? "00";
  if (!isNaN(hour)) {
    const period = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    time = `${hour12}:${minutes} ${period}`;
  }

  return { date, time };
}

export const handler: Handler = async () => {
  console.log("Anacostia Watershed Society handler started");

  try {
    // Start from today (site-local date) so we only pull upcoming events.
    const todayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const rawEvents: any[] = [];
    let pageUrl: string | null = `${API_BASE}?per_page=${PER_PAGE}&start_date=${todayStr}`;
    let pageCount = 0;

    // Page through the REST API (next_rest_url) until exhausted or capped.
    while (pageUrl && rawEvents.length < MAX_EVENTS && pageCount < 10) {
      const response = await fetch(pageUrl);
      if (!response.ok) {
        throw new Error(`Events REST API error: ${response.status}`);
      }
      const data: any = await response.json();
      const pageEvents: any[] = Array.isArray(data.events) ? data.events : [];
      rawEvents.push(...pageEvents);
      pageUrl = data.next_rest_url || null;
      pageCount++;
    }

    console.log(`Fetched ${rawEvents.length} events from REST API`);

    const events: any[] = [];

    for (const ev of rawEvents) {
      const title = ev.title ? stripHtml(ev.title) : "";
      const start = formatEventTime(ev.start_date_details);
      if (!title || !start) continue;

      const end = formatEventTime(ev.end_date_details);
      const endTime = end && end.time ? end.time : undefined;

      const descText = stripHtml(ev.description || ev.excerpt || "");

      const venueName = ev.venue?.venue;
      const locationParts = [ev.venue?.address, ev.venue?.city].filter(Boolean);

      events.push({
        title,
        date: start.date,
        time: start.time,
        end_time: endTime,
        description: descText.substring(0, 500),
        url: ev.url || FALLBACK_URL,
        category: "Volunteer",
        venue: venueName || "Anacostia Watershed Society",
        location: locationParts.length
          ? locationParts.join(", ")
          : "Washington, DC area",
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
