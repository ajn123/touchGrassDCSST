import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { PlaywrightCrawler } from "crawlee";
import { Resource } from "sst";

// ============================================================================
// PARSING UTILITIES
// ============================================================================

function parseDate(dateStr: string): string {
  try {
    if (!dateStr) return "";
    const cleaned = dateStr.trim();

    // Handle ISO format "2026-03-15" or "2026-03-15T..."
    const isoMatch = cleaned.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return isoMatch[0];

    // Handle "March 15, 2026" or "Mar 15, 2026"
    const monthNames: Record<string, string> = {
      january: "01", february: "02", march: "03", april: "04",
      may: "05", june: "06", july: "07", august: "08",
      september: "09", october: "10", november: "11", december: "12",
      jan: "01", feb: "02", mar: "03", apr: "04",
      jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
    };
    const fullDateMatch = cleaned.match(/(\w+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/i);
    if (fullDateMatch) {
      const month = monthNames[fullDateMatch[1].toLowerCase()];
      if (month) {
        const day = String(parseInt(fullDateMatch[2])).padStart(2, "0");
        const today = new Date();
        const year = fullDateMatch[3] || today.getFullYear().toString();
        const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (parsedDate < today && !fullDateMatch[3]) {
          return `${today.getFullYear() + 1}-${month}-${day}`;
        }
        return `${year}-${month}-${day}`;
      }
    }

    // Handle day-of-week relative dates like "Sat, Mar 15"
    const dayMonthMatch = cleaned.match(/\w{3},?\s+(\w{3})\s+(\d{1,2})(?:,?\s*(\d{4}))?/i);
    if (dayMonthMatch) {
      const month = monthNames[dayMonthMatch[1].toLowerCase()];
      if (month) {
        const day = String(parseInt(dayMonthMatch[2])).padStart(2, "0");
        const today = new Date();
        const year = dayMonthMatch[3] || today.getFullYear().toString();
        const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (parsedDate < today && !dayMonthMatch[3]) {
          return `${today.getFullYear() + 1}-${month}-${day}`;
        }
        return `${year}-${month}-${day}`;
      }
    }

    return "";
  } catch {
    return "";
  }
}

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

function parseTime(timeStr: string): string | undefined {
  if (!timeStr) return undefined;
  const cleaned = timeStr.trim().toLowerCase();

  // Handle "7:30 PM" or "7:30pm"
  const timeMatch = cleaned.match(/(\d{1,2}(?::\d{2})?)\s*([ap]m)/i);
  if (timeMatch) return `${timeMatch[1]}${timeMatch[2]}`;

  // Handle 24-hour format
  const time24Match = cleaned.match(/(\d{1,2}):(\d{2})/);
  if (time24Match) {
    const hour = parseInt(time24Match[1]);
    const minute = time24Match[2];
    const ampm = hour >= 12 ? "pm" : "am";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minute}${ampm}`;
  }

  return undefined;
}

// ============================================================================
// CRAWLER
// ============================================================================

const MAX_EVENTS = 50;

class MeetupCrawler {
  private events: any[] = [];

  async crawlEvents(): Promise<any[]> {
    console.log("Starting Meetup.com DC event crawl with Playwright...");
    this.events = [];

    const today = new Date().toISOString().split("T")[0];
    const seenKeys = new Set<string>();

    const crawler = new PlaywrightCrawler({
      maxRequestsPerCrawl: 3,
      maxConcurrency: 1,
      minConcurrency: 1,
      requestHandlerTimeoutSecs: 120,
      requestHandler: async ({ page, request }) => {
        console.log(`Processing URL: ${request.url}`);

        try {
          await page.goto(request.url, {
            waitUntil: "networkidle",
            timeout: 60000,
          });
          await page.waitForTimeout(5000);

          // Scroll to load more events (Meetup uses infinite scroll)
          let previousHeight = 0;
          for (let i = 0; i < 5; i++) {
            const currentHeight = await page.evaluate(() => {
              window.scrollTo(0, document.body.scrollHeight);
              return document.body.scrollHeight;
            });
            await page.waitForTimeout(2000);

            if (currentHeight === previousHeight) {
              console.log(`Scroll ${i + 1}: No new content (height: ${currentHeight}px)`);
              break;
            }
            console.log(`Scroll ${i + 1}: Height ${previousHeight}px -> ${currentHeight}px`);
            previousHeight = currentHeight;
          }

          // Strategy 1: Try JSON-LD structured data
          const jsonLdEvents = await page.evaluate(() => {
            const scripts = Array.from(
              document.querySelectorAll('script[type="application/ld+json"]')
            );
            const events: any[] = [];
            for (const script of scripts) {
              try {
                const data = JSON.parse(script.textContent || "");
                const items = Array.isArray(data) ? data : [data];
                for (const item of items) {
                  if (
                    item["@type"] === "Event" ||
                    item["@type"] === "SocialEvent" ||
                    item["@type"]?.includes?.("Event")
                  ) {
                    events.push({
                      title: item.name || "",
                      startDate: item.startDate || "",
                      url: item.url || "",
                      description: (item.description || "").substring(0, 300),
                      image_url:
                        typeof item.image === "string"
                          ? item.image
                          : item.image?.url || "",
                      venue: item.location?.name || "",
                      location: item.location?.address?.streetAddress ||
                        item.location?.address?.addressLocality || "",
                      price: item.offers?.price
                        ? `$${item.offers.price}`
                        : item.isAccessibleForFree ? "free" : "",
                    });
                  }
                }
              } catch {
                // Skip invalid JSON-LD
              }
            }
            return events;
          });

          if (jsonLdEvents.length > 0) {
            console.log(`[JSON-LD] Found ${jsonLdEvents.length} events`);
            for (const evt of jsonLdEvents) {
              if (this.events.length >= MAX_EVENTS) break;

              let date = "";
              let time: string | undefined;

              if (evt.startDate) {
                const parsed = parseISODateToEastern(evt.startDate);
                if (parsed) {
                  date = parsed.date;
                  time = parsed.time;
                } else {
                  date = parseDate(evt.startDate);
                }
              }

              if (!date || !evt.title || date < today) continue;

              const dedupeKey = `${evt.title}|${date}`;
              if (seenKeys.has(dedupeKey)) continue;
              seenKeys.add(dedupeKey);

              let eventUrl = evt.url;
              if (eventUrl && !eventUrl.startsWith("http")) {
                eventUrl = `https://www.meetup.com${eventUrl}`;
              }

              this.events.push({
                title: evt.title,
                date,
                time,
                venue: evt.venue || undefined,
                location: evt.location || undefined,
                category: undefined, // Let normalizeCategory handle it
                description: evt.description || undefined,
                url: eventUrl || request.url,
                image_url: evt.image_url || undefined,
                price: evt.price || undefined,
              });
            }
          }

          // Strategy 2: DOM scraping
          if (jsonLdEvents.length === 0) {
            console.log("[DOM] No JSON-LD found, trying DOM scraping...");

            const domEvents = await page.evaluate(() => {
              const events: any[] = [];

              // Meetup event cards — try multiple selector strategies
              const selectors = [
                '[data-testid="categoryResults-eventCard"]',
                '[id*="event-card"]',
                'a[href*="/events/"]',
                '[class*="eventCard"]',
                '[class*="event-card"]',
              ];

              for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length === 0) continue;

                for (const el of elements) {
                  const card = el.closest("div, article, li") || el;

                  // Extract title
                  const titleEl =
                    card.querySelector("h2, h3, h4") ||
                    card.querySelector('[class*="title"]') ||
                    el.querySelector("h2, h3, h4");
                  const title = titleEl?.textContent?.trim() || "";
                  if (!title || title.length < 3) continue;

                  // Extract date/time from time element
                  const timeEl = card.querySelector("time[datetime]") || card.querySelector("time");
                  const dateTimeStr = timeEl?.getAttribute("datetime") || "";
                  const dateDisplayText = timeEl?.textContent?.trim() || "";

                  // Extract venue/location
                  const locationTexts = Array.from(card.querySelectorAll("p, span, div"))
                    .map(e => e.textContent?.trim() || "")
                    .filter(t => t.length > 3 && t.length < 100);

                  let venue = "";
                  let location = "";
                  for (const text of locationTexts) {
                    if (/washington|dc|virginia|maryland|nw|ne|sw|se|\d{5}/i.test(text)) {
                      location = text;
                    } else if (!venue && text !== title && !/\d{1,2}:\d{2}/.test(text)) {
                      venue = text;
                    }
                  }

                  // Extract URL
                  const linkEl = (el.tagName === "A" ? el : el.querySelector("a[href*='/events/']")) as HTMLAnchorElement | null;
                  const url = linkEl?.href || linkEl?.getAttribute("href") || "";

                  // Extract image
                  const imgEl = card.querySelector("img");
                  const image_url = imgEl?.getAttribute("src") || imgEl?.getAttribute("data-src") || "";

                  events.push({
                    title,
                    dateTime: dateTimeStr,
                    dateText: dateDisplayText,
                    venue,
                    location,
                    url,
                    image_url,
                  });
                }

                if (events.length > 0) break;
              }

              return events;
            });

            console.log(`[DOM] Found ${domEvents.length} events`);

            for (const evt of domEvents) {
              if (this.events.length >= MAX_EVENTS) break;

              let date = "";
              let time: string | undefined;

              // Try ISO datetime first
              if (evt.dateTime) {
                const parsed = parseISODateToEastern(evt.dateTime);
                if (parsed) {
                  date = parsed.date;
                  time = parsed.time;
                }
              }

              // Fallback to display text
              if (!date && evt.dateText) {
                date = parseDate(evt.dateText);
                const timeMatch = evt.dateText.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))/i);
                if (timeMatch) {
                  time = parseTime(timeMatch[1]);
                }
              }

              if (!date || !evt.title || date < today) continue;

              // Filter to DC area
              const combinedLocation = `${evt.venue} ${evt.location}`.toLowerCase();
              const isDCArea =
                combinedLocation.includes("washington") ||
                combinedLocation.includes("dc") ||
                combinedLocation.includes("arlington") ||
                combinedLocation.includes("bethesda") ||
                combinedLocation.includes("silver spring") ||
                combinedLocation.includes("alexandria") ||
                combinedLocation === " "; // Allow events with no location (might be online)

              if (!isDCArea && evt.location) continue;

              const dedupeKey = `${evt.title}|${date}`;
              if (seenKeys.has(dedupeKey)) continue;
              seenKeys.add(dedupeKey);

              let eventUrl = evt.url;
              if (eventUrl && !eventUrl.startsWith("http")) {
                eventUrl = `https://www.meetup.com${eventUrl}`;
              }

              let imageUrl = evt.image_url;
              if (imageUrl && !imageUrl.startsWith("http") && !imageUrl.startsWith("data:")) {
                imageUrl = `https://www.meetup.com${imageUrl}`;
              }

              this.events.push({
                title: evt.title,
                date,
                time,
                venue: evt.venue || undefined,
                location: evt.location || undefined,
                category: undefined,
                url: eventUrl || request.url,
                image_url: imageUrl || undefined,
              });
            }
          }

          console.log(`Total events collected: ${this.events.length}`);
        } catch (error) {
          console.error("Error crawling Meetup:", error);
        }
      },
      launchContext: {
        launchOptions: {
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--window-size=1280,720",
          ],
        },
      },
    });

    try {
      await crawler.run([
        "https://www.meetup.com/find/?location=us--dc--washington&source=EVENTS",
      ]);
      console.log(`Total Meetup events found: ${this.events.length}`);
    } catch (error) {
      console.error("Crawler failed:", error);
    }

    // Sort by date
    this.events.sort((a, b) => a.date.localeCompare(b.date));

    return this.events.slice(0, MAX_EVENTS);
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("Meetup DC crawler started");

  const crawler = new MeetupCrawler();
  const events = await crawler.crawlEvents();

  console.log(`Crawled ${events.length} total Meetup events`);

  if (events.length === 0) {
    console.log("No events found");
    return;
  }

  // Send to Step Functions
  const client = new SFNClient({});
  const payload = JSON.stringify({
    events,
    source: "meetupdc",
    eventType: "meetupdc",
  });

  const MAX_PAYLOAD_SIZE = 256 * 1024;
  if (payload.length > MAX_PAYLOAD_SIZE) {
    const batchSize = Math.floor(
      events.length / Math.ceil(payload.length / MAX_PAYLOAD_SIZE)
    );
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      const batchPayload = JSON.stringify({
        events: batch,
        source: "meetupdc",
        eventType: "meetupdc",
      });
      const batchName = `meetupdc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
    const executionName = `meetupdc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await client.send(
      new StartExecutionCommand({
        stateMachineArn: Resource.normaizeEventStepFunction.arn,
        input: payload,
        name: executionName,
      })
    );
  }

  console.log(`Meetup DC crawler completed. ${events.length} events sent to normalization.`);
}

main().catch((error) => {
  console.error("Meetup DC crawler failed:", error);
  process.exit(1);
});
