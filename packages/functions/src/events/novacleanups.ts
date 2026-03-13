import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { Handler } from "aws-lambda";
import { Resource } from "sst";

const EVENTS_URL = "https://novacleanups.com/events";
const MAX_EVENTS = 50;

/**
 * Parse date from "Mar 01, 2026" format to YYYY-MM-DD.
 */
function parseDate(dateStr: string): string | undefined {
  const months: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };

  const match = dateStr.match(/([A-Za-z]{3})\s+(\d{1,2}),\s*(\d{4})/);
  if (!match) return undefined;

  const month = months[match[1].toLowerCase()];
  if (!month) return undefined;

  const day = match[2].padStart(2, "0");
  return `${match[3]}-${month}-${day}`;
}

/**
 * Parse time from "11:00 AM (EST)" format.
 */
function parseTime(timeStr: string): string | undefined {
  const match = timeStr.match(/(\d{1,2}:\d{2}\s*[AP]M)/i);
  return match ? match[1] : undefined;
}

/**
 * Strip HTML tags and normalize whitespace.
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Parse NOVA Cleanups events page.
 * Structure: <section class="eventCard"> containing:
 *   - eventCard__img > a > img (image + link)
 *   - eventCard__content >
 *       - eventCard__label (span)
 *       - a > h4.eventCard__title (location name)
 *       - eventCard__date > span (date text)
 *       - eventCard__duration > span (duration)
 *       - eventCard__description > p (description)
 */
function parseEvents(html: string): any[] {
  const events: any[] = [];

  // Split on <section class="eventCard to get each card block
  const sections = html.split(/<section\s+class="eventCard/i);

  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];

    // Extract image URL
    const imgMatch = section.match(/eventCard__img[\s\S]*?<img[^>]+src="([^"]+)"/i);
    const imageUrl = imgMatch
      ? imgMatch[1].replace(/&amp;/g, "&").split("?")[0]
      : undefined;

    // Extract link URL (from the image link or title link)
    const linkMatch = section.match(/<a[^>]+href="([^"]+)"/i);
    const rawUrl = linkMatch ? linkMatch[1] : undefined;

    // Extract label
    const labelMatch = section.match(/eventCard__label[^>]*>([\s\S]*?)<\//i);
    const label = labelMatch ? stripHtml(labelMatch[1]) : "Neighborhood Cleanup";

    // Extract title/location from h4
    const titleMatch = section.match(/eventCard__title[\s\S]*?>([\s\S]*?)<\/h4>/i);
    const location = titleMatch ? stripHtml(titleMatch[1]) : "";

    // Extract date from span inside eventCard__date
    const dateMatch = section.match(/eventCard__date[\s\S]*?<span>([\s\S]*?)<\/span>/i);
    const dateTimeStr = dateMatch ? stripHtml(dateMatch[1]) : "";

    // Extract duration from span inside eventCard__duration
    const durMatch = section.match(/eventCard__duration[\s\S]*?<span>([\s\S]*?)<\/span>/i);
    const duration = durMatch ? stripHtml(durMatch[1]) : undefined;

    // Extract description
    const descMatch = section.match(/eventCard__description[\s\S]*?>([\s\S]*?)(?:<\/p>\s*<\/p>|<\/div>)/i);
    const description = descMatch ? stripHtml(descMatch[1]) : undefined;

    // Build title
    const title = location
      ? `${label} - ${location}`
      : label;

    if (!title || !dateTimeStr) continue;

    const date = parseDate(dateTimeStr);
    const time = parseTime(dateTimeStr);

    if (!date) continue;

    const url = rawUrl
      ? rawUrl.startsWith("http")
        ? rawUrl.replace(/\?.*$/, "")
        : `https://novacleanups.com${rawUrl.replace(/\?.*$/, "")}`
      : "https://novacleanups.com/events";

    events.push({
      title,
      date,
      time,
      duration,
      description,
      url,
      image_url: imageUrl,
      category: "Volunteer",
      venue: "NOVA Cleanups",
      location: location || undefined,
    });
  }

  return events;
}

export const handler: Handler = async () => {
  console.log("NOVA Cleanups handler started");

  try {
    const response = await fetch(EVENTS_URL);
    if (!response.ok) {
      throw new Error(`NOVA Cleanups fetch error: ${response.status}`);
    }

    const html = await response.text();
    console.log(`Fetched ${html.length} bytes of HTML`);

    const rawEvents = parseEvents(html);
    console.log(`Parsed ${rawEvents.length} raw events`);

    // Filter to future events only
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    const futureEvents = rawEvents.filter((e) => e.date && e.date >= todayStr);
    console.log(`${futureEvents.length} future events after filtering`);

    // Sort and limit
    futureEvents.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    const limited = futureEvents.slice(0, MAX_EVENTS);

    if (limited.length === 0) {
      console.log("No upcoming events found");
      return { statusCode: 200, body: "No upcoming events" };
    }

    // Send to Step Functions
    const client = new SFNClient({});
    const payload = JSON.stringify({
      events: limited,
      source: "novacleanups",
      eventType: "novacleanups",
    });

    const executionName = `novacleanups-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await client.send(
      new StartExecutionCommand({
        stateMachineArn: Resource.normaizeEventStepFunction.arn,
        input: payload,
        name: executionName,
      })
    );

    console.log(`Successfully sent ${limited.length} events to normalization`);
    return {
      statusCode: 200,
      body: `Processed ${limited.length} NOVA Cleanups events`,
    };
  } catch (error) {
    console.error("NOVA Cleanups crawler failed:", error);
    throw error;
  }
};
