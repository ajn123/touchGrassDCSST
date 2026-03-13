import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { Handler } from "aws-lambda";
import { Resource } from "sst";

const SHOWS_URL = "https://www.dcimprov.com/shows/";
const MAX_EVENTS = 50;

const INVALID_TITLE_PATTERNS = [
  "about the show",
  "online showroom",
  "about us",
  "contact us",
  "gift cards",
  "private events",
  "group sales",
  "faq",
  "terms of service",
  "privacy policy",
  "dc improv",
];

function isInvalidTitle(title: string): boolean {
  const lower = title.toLowerCase().trim();
  return INVALID_TITLE_PATTERNS.some(
    (pattern) => lower === pattern || lower.includes(pattern)
  );
}

const MONTH_MAP: { [key: string]: number } = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};

function parseMonthDayToISO(monthName: string, day: string): string {
  const monthNum = MONTH_MAP[monthName.toLowerCase()];
  if (!monthNum) return "";

  const today = new Date();
  let year = today.getFullYear();
  const dayNum = parseInt(day);

  const date = new Date(year, monthNum - 1, dayNum);

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
 * Parse date from "January 27" or "January 30 - February 1" formats.
 */
function parseDate(dateStr: string): string {
  if (!dateStr) return "";

  const cleaned = dateStr.trim();

  // Handle date ranges — use start date
  const rangeMatch = cleaned.match(
    /([A-Za-z]+)\s+(\d{1,2})\s*[-\u2013]\s*(?:[A-Za-z]+\s+)?(\d{1,2})/i
  );
  if (rangeMatch) {
    return parseMonthDayToISO(rangeMatch[1], rangeMatch[2]);
  }

  // Handle dates with year like "January 27, 2025"
  const withYearMatch = cleaned.match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/i);
  if (withYearMatch) {
    const monthNum = MONTH_MAP[withYearMatch[1].toLowerCase()];
    if (!monthNum) return "";
    const y = parseInt(withYearMatch[3]);
    const m = String(monthNum).padStart(2, "0");
    const d = String(parseInt(withYearMatch[2])).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  // Handle single dates like "January 27"
  const singleMatch = cleaned.match(/([A-Za-z]+)\s+(\d{1,2})/i);
  if (singleMatch) {
    return parseMonthDayToISO(singleMatch[1], singleMatch[2]);
  }

  return "";
}

/**
 * Parse date range and return both start and end dates.
 */
function parseDateRange(dateStr: string): { start: string; end: string } | null {
  if (!dateStr) return null;

  const rangeMatch = dateStr.trim().match(
    /([A-Za-z]+)\s+(\d{1,2})\s*[-\u2013]\s*([A-Za-z]+)\s+(\d{1,2})/i
  );
  if (rangeMatch) {
    const start = parseMonthDayToISO(rangeMatch[1], rangeMatch[2]);
    const end = parseMonthDayToISO(rangeMatch[3], rangeMatch[4]);
    if (start && end) return { start, end };
  }

  return null;
}

/**
 * Parse time from "7:00 PM", "7:30 PM", "2 P.M." etc.
 */
function parseTime(timeStr: string): string | undefined {
  if (!timeStr) return undefined;

  const cleaned = timeStr.trim().replace(/\s+/g, " ");

  // Handle time ranges like "7:30 PM - 9:45 PM"
  const rangeMatch = cleaned.match(
    /(\d{1,2}:\d{2}\s*[ap]\.?m\.?)\s*-\s*(\d{1,2}:\d{2}\s*[ap]\.?m\.?)/i
  );
  if (rangeMatch) {
    return `${rangeMatch[1].toLowerCase().replace(/\./g, "")}-${rangeMatch[2].toLowerCase().replace(/\./g, "")}`;
  }

  const singleMatch = cleaned.match(/(\d{1,2}:\d{2}\s*[ap]\.?m\.?)/i);
  if (singleMatch) {
    return singleMatch[1].toLowerCase().replace(/\./g, "");
  }

  const noColonMatch = cleaned.match(/(\d{1,2}\s*[ap]\.?m\.?)/i);
  if (noColonMatch) {
    return noColonMatch[1].toLowerCase().replace(/\./g, "");
  }

  return cleaned || undefined;
}

/**
 * Parse price from text.
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
 * Extract show URLs from the DC Improv listing page HTML.
 */
function extractShowUrls(html: string): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  const linkRegex = /<a[^>]+href="([^"]*\/shows\/main-showroom\/[^"]+)"[^>]*>/gi;
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    let href = match[1];
    if (!href.startsWith("http")) {
      href = `https://www.dcimprov.com${href}`;
    }

    // Ensure URL has a slug after /main-showroom/
    try {
      const url = new URL(href);
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts.length < 3 || !parts[2]) continue;
    } catch {
      continue;
    }

    if (!seen.has(href)) {
      seen.add(href);
      results.push(href);
    }
  }

  return results;
}

/**
 * Extract event details from a DC Improv show page HTML.
 */
function extractShowDetails(html: string, showUrl: string): any[] {
  const bodyText = stripHtml(html);

  // Title: first h1 on the page
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  let title = h1Match ? stripHtml(h1Match[1]) : "";

  // Fallback: derive title from URL slug
  if (!title) {
    try {
      const url = new URL(showUrl);
      const parts = url.pathname.split("/").filter(Boolean);
      const slug = parts[parts.length - 1] || "";
      title = slug
        .split("-")
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    } catch {
      return [];
    }
  }

  if (!title || isInvalidTitle(title)) return [];

  // Description: first <p> after "About the Show" h2
  let description = "";
  const aboutIdx = html.search(/about\s+the\s+show/i);
  if (aboutIdx !== -1) {
    const afterAbout = html.substring(aboutIdx);
    const pMatch = afterAbout.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    if (pMatch) {
      description = stripHtml(pMatch[1]);
    }
  }

  // Date extraction from body text
  const dateTexts: string[] = [];

  // Look for date ranges like "January 30 - February 1"
  const rangeRegex = /([A-Za-z]+)\s+(\d{1,2})\s*[-\u2013]\s*(?:[A-Za-z]+\s+)?(\d{1,2})/g;
  let rangeMatch;
  while ((rangeMatch = rangeRegex.exec(bodyText)) !== null) {
    // Only accept if the month name is valid
    if (MONTH_MAP[rangeMatch[1].toLowerCase()]) {
      dateTexts.push(rangeMatch[0]);
    }
  }

  // Collect single date patterns (skip those already covered by a range)
  const singleRegex = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\b/gi;
  let singleMatch;
  while ((singleMatch = singleRegex.exec(bodyText)) !== null) {
    const candidate = singleMatch[0];
    if (!dateTexts.some((d) => d.includes(candidate))) {
      dateTexts.push(candidate);
    }
  }

  // Time extraction from "When: ..." line
  const whenMatch = bodyText.match(/When:\s*(.+)/i);
  const whenText = whenMatch ? whenMatch[1] : "";
  const parsedTimes: string[] = [];
  const timeRegex = /(\d{1,2}:\d{2}\s*(?:[ap]\.?m\.?)?|\d{1,2}\s*[ap]\.?m\.?)/gi;
  let timeMatch;
  while ((timeMatch = timeRegex.exec(whenText)) !== null) {
    const parsed = parseTime(timeMatch[1].trim());
    if (parsed && !parsedTimes.includes(parsed)) {
      parsedTimes.push(parsed);
    }
  }

  // Price extraction
  let parsedPrice: string | undefined;
  const priceMatch = bodyText.match(/\$\s*\d+(?:\.\d{2})?/);
  if (priceMatch) {
    parsedPrice = parsePrice(priceMatch[0]);
  }

  const events: any[] = [];

  const createEvent = (date: string, time?: string, startDate?: string, endDate?: string) => {
    events.push({
      title,
      date,
      time,
      location: "1140 Connecticut Ave. NW, Washington, DC 20036",
      description: description || undefined,
      url: showUrl,
      category: "comedy",
      price: parsedPrice,
      venue: "DC Improv",
      start_date: startDate,
      end_date: endDate,
    });
  };

  // Parse dates
  const parsedDates: string[] = [];
  const dateRanges: Array<{ start: string; end: string }> = [];

  for (const dateStr of dateTexts) {
    const range = parseDateRange(dateStr);
    if (range) {
      if (!dateRanges.some((r) => r.start === range.start)) {
        dateRanges.push(range);
      }
    } else {
      const parsed = parseDate(dateStr);
      if (parsed && !parsedDates.includes(parsed)) {
        parsedDates.push(parsed);
      }
    }
  }

  // Create events from date ranges
  if (dateRanges.length > 0) {
    for (const range of dateRanges) {
      const startDate = new Date(range.start);
      const endDate = new Date(range.end);
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split("T")[0];
        if (parsedTimes.length > 0) {
          for (const time of parsedTimes) {
            createEvent(dateStr, time, range.start, range.end);
          }
        } else {
          createEvent(dateStr, undefined, range.start, range.end);
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
  } else if (parsedDates.length > 0) {
    const date = parsedDates[0];
    if (parsedTimes.length > 0) {
      for (const time of parsedTimes) {
        createEvent(date, time);
      }
    } else {
      createEvent(date);
    }
  }
  // Skip fallback to today's date — if we can't find a date, skip the show

  return events;
}

export const handler: Handler = async () => {
  console.log("DC Improv Lambda handler started");

  try {
    // Step 1: Fetch listing page and extract show URLs
    const listingResponse = await fetch(SHOWS_URL);
    if (!listingResponse.ok) {
      throw new Error(`DC Improv listing fetch error: ${listingResponse.status}`);
    }

    const listingHtml = await listingResponse.text();
    console.log(`Fetched ${listingHtml.length} bytes from listing page`);

    const showUrls = extractShowUrls(listingHtml);
    console.log(`Found ${showUrls.length} show URLs`);

    if (showUrls.length === 0) {
      console.log("No show URLs found");
      return { statusCode: 200, body: "No show URLs found" };
    }

    // Step 2: Fetch each show page and extract events (concurrently, max 5 at a time)
    const allEvents: any[] = [];
    const CONCURRENCY = 5;

    for (let i = 0; i < showUrls.length; i += CONCURRENCY) {
      const batch = showUrls.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          const res = await fetch(url);
          if (!res.ok) {
            console.log(`Failed to fetch ${url}: ${res.status}`);
            return [];
          }
          const html = await res.text();
          return extractShowDetails(html, url);
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          allEvents.push(...result.value);
        }
      }
    }

    console.log(`Extracted ${allEvents.length} total events from show pages`);

    // Filter to future events only
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    const futureEvents = allEvents.filter((e) => e.date >= todayStr);
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
      source: "dcimprov",
      eventType: "dcimprov",
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
          source: "dcimprov",
          eventType: "dcimprov",
        });
        const batchName = `dcimprov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
      const executionName = `dcimprov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
      body: `Processed ${limited.length} DC Improv events`,
    };
  } catch (error) {
    console.error("DC Improv crawler failed:", error);
    throw error;
  }
};
