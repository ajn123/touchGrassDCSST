import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { Handler } from "aws-lambda";
import { Resource } from "sst";

const EVENTS_URL = "https://www.clockoutdc.com/events";
const MAX_EVENTS = 50;

/**
 * Parse date from "FRIDAY, 2/27" or "2/27" format to YYYY-MM-DD.
 */
function parseDate(dateStr: string): string {
  const dateMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})/);
  if (!dateMatch) return "";

  const month = parseInt(dateMatch[1]);
  const day = parseInt(dateMatch[2]);
  const today = new Date();
  const year = today.getFullYear();

  const date = new Date(year, month - 1, day);

  // If the date is more than 6 months in the past, assume next year
  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  if (date < sixMonthsAgo) {
    date.setFullYear(year + 1);
  }

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Parse time from formats like "7-11pm", "4-9:30pm", "2pm", "sunset".
 */
function parseTime(timeStr: string): string | undefined {
  if (!timeStr) return undefined;

  if (timeStr.toLowerCase().includes("sunset")) return "sunset";

  const cleaned = timeStr.trim().replace(/\s+/g, " ");

  // Normalize ranges like "7-11pm" => "7pm-11pm"
  const rangeMatch = cleaned.match(
    /^(\d{1,2}(?::\d{2})?)\s*-\s*(\d{1,2}(?::\d{2})?)\s*([ap]m)$/i
  );
  if (rangeMatch) {
    return `${rangeMatch[1]}${rangeMatch[3].toLowerCase()}-${rangeMatch[2]}${rangeMatch[3].toLowerCase()}`;
  }

  if (/(am|pm)/i.test(cleaned)) return cleaned.toLowerCase();
  if (cleaned) return cleaned;
  return undefined;
}

/**
 * Parse price from text like "($80)", "(free)", "($75)".
 */
function parsePrice(text: string): string | undefined {
  if (!text) return undefined;
  const lower = text.toLowerCase().trim();
  if (/(^|\b)free(\b|$)/.test(lower)) return "free";
  const money = text.match(/\$\s*([0-9]+(?:\.[0-9]{2})?)/);
  if (money) return money[1];
  const bare = text.match(/\b([0-9]+(?:\.[0-9]{2})?)\b/);
  if (bare && !/^(19|20)\d{2}$/.test(bare[1])) return bare[1];
  return undefined;
}

/**
 * Simple HTML parser for ClockOut DC's static Squarespace page.
 * Finds h4 date headers and ul/li event items under each.
 */
function parseEvents(html: string): any[] {
  const events: any[] = [];

  // Split on h4 tags to process each date section
  // Pattern: <h4...>DATE TEXT</h4> followed by <ul>...<li>events</li>...</ul>
  const sections = html.split(/<h4[^>]*>/i);

  for (const section of sections) {
    // Extract date text from this h4
    const h4End = section.indexOf("</h4>");
    if (h4End === -1) continue;

    const h4Content = section.substring(0, h4End).replace(/<[^>]+>/g, "").trim();
    const dateMatch = h4Content.match(/(\d{1,2}\/\d{1,2})/);
    if (!dateMatch) continue;

    const date = parseDate(h4Content);
    if (!date) continue;

    // Find the <ul> after the h4
    const ulStart = section.indexOf("<ul", h4End);
    if (ulStart === -1) continue;

    const ulEnd = section.indexOf("</ul>", ulStart);
    if (ulEnd === -1) continue;

    const ulContent = section.substring(ulStart, ulEnd);

    // Extract each <li>
    const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let liMatch;
    while ((liMatch = liRegex.exec(ulContent)) !== null) {
      const liHtml = liMatch[1];
      const liText = liHtml
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim();

      // Extract link URL
      const linkMatch = liHtml.match(/<a[^>]+href="([^"]+)"/);
      const url = linkMatch ? linkMatch[1] : undefined;

      // Extract link text as title
      const linkTextMatch = liHtml.match(/<a[^>]*>([\s\S]*?)<\/a>/);
      let title = linkTextMatch
        ? linkTextMatch[1].replace(/<[^>]+>/g, "").trim()
        : "";

      // Extract category (text before colon)
      const catMatch = liText.match(/^([^:]+):/);
      const category = catMatch ? catMatch[1].trim() : undefined;

      // If no link text, try to extract title after category
      if (!title && catMatch) {
        const afterCat = liText.substring(
          liText.indexOf(catMatch[0]) + catMatch[0].length
        );
        const titleOnly = afterCat.match(/^([^(]+)/);
        title = titleOnly ? titleOnly[1].trim() : "";
      }

      if (!title) continue;

      // Extract parenthetical parts
      const parenRegex = /\(([^)]+)\)/g;
      let parenMatch;
      const parts: string[] = [];
      while ((parenMatch = parenRegex.exec(liText)) !== null) {
        parenMatch[1].split(",").forEach((p) => {
          const trimmed = p.trim();
          if (trimmed) parts.push(trimmed);
        });
      }

      // Classify parts
      let time: string | undefined;
      let price: string | undefined;
      let location: string | undefined;

      for (const p of parts) {
        if (
          !time &&
          /(\d\s*-\s*\d|\d{1,2}:?\d{0,2}\s*(am|pm)|sunset)/i.test(p)
        ) {
          time = p;
        } else if (
          !price &&
          (/\$|free/i.test(p) || /^\$?\s*\d+(?:\.\d{2})?$/.test(p))
        ) {
          price = p.replace(/\s+/g, " ");
        }
      }

      // Remaining parts — last one as location
      const leftovers = parts.filter((p) => p !== time && p !== price);
      if (leftovers.length > 0) {
        location = leftovers[leftovers.length - 1];
      }

      events.push({
        title,
        date,
        time: parseTime(time || ""),
        location,
        description: liText,
        url,
        category,
        price: parsePrice(price || ""),
      });
    }
  }

  return events;
}

export const handler: Handler = async () => {
  console.log("ClockOut DC Lambda handler started");

  try {
    const response = await fetch(EVENTS_URL);
    if (!response.ok) {
      throw new Error(`ClockOut DC fetch error: ${response.status}`);
    }

    const html = await response.text();
    console.log(`Fetched ${html.length} bytes of HTML`);

    const rawEvents = parseEvents(html);
    console.log(`Parsed ${rawEvents.length} raw events`);

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
      source: "clockoutdc",
      eventType: "clockoutdc",
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
          source: "clockoutdc",
          eventType: "clockoutdc",
        });
        const batchName = `clockoutdc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
      const executionName = `clockoutdc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
      body: `Processed ${limited.length} ClockOut DC events`,
    };
  } catch (error) {
    console.error("ClockOut DC crawler failed:", error);
    throw error;
  }
};
