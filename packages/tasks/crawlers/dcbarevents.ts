import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { PlaywrightCrawler } from "crawlee";
import { Resource } from "sst";

// ============================================================================
// VENUE CONFIGURATIONS
// ============================================================================

const DC_BAR_VENUES = [
  {
    name: "Board Room",
    url: "https://boardroomdc.com/events/",
    address: "1737 Connecticut Ave NW, Washington, DC 20009",
  },
  {
    name: "Dacha Beer Garden",
    url: "https://www.dachadc.com/navy-yard-events",
    address: "79 Potomac Ave SE, Washington, DC 20003",
  },
  {
    name: "Red Bear Brewing",
    url: "https://www.redbear.beer/events",
    address: "209 M St NE, Washington, DC 20002",
  },
  {
    name: "Lyman's Tavern",
    url: "https://www.lymanstavern.com/events",
    address: "3720 14th St NW, Washington, DC 20010",
  },
  {
    name: "Decades DC",
    url: "https://www.decadesdc.com/events",
    address: "1219 Connecticut Ave NW, Washington, DC 20036",
  },
  {
    name: "Penn Social",
    url: "https://pennsocialdc.com/events/",
    address: "801 E St NW, Washington, DC 20004",
  },
  {
    name: "The Salt Line",
    url: "https://www.thesaltline.com/events",
    address: "79 Potomac Ave SE, Washington, DC 20003",
  },
  {
    name: "City Tap House",
    url: "https://www.citytap.com/location/penn-quarter/events/",
    address: "901 9th St NW, Washington, DC 20001",
  },
];

const MAX_EVENTS = 50;

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

    // Handle "MM/DD/YYYY" or "MM/DD"
    const slashMatch = cleaned.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
    if (slashMatch) {
      const year = slashMatch[3] || new Date().getFullYear().toString();
      return `${year}-${slashMatch[1].padStart(2, "0")}-${slashMatch[2].padStart(2, "0")}`;
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

// ============================================================================
// CRAWLER
// ============================================================================

class DCBarEventsCrawler {
  private events: any[] = [];

  async crawlEvents(): Promise<any[]> {
    console.log("Starting DC Bar Events crawl with Playwright...");
    this.events = [];

    const today = new Date().toISOString().split("T")[0];
    const seenKeys = new Set<string>();

    const crawler = new PlaywrightCrawler({
      maxRequestsPerCrawl: DC_BAR_VENUES.length + 5,
      maxConcurrency: 1,
      minConcurrency: 1,
      requestHandlerTimeoutSecs: 120,
      requestHandler: async ({ page, request }) => {
        const venue = DC_BAR_VENUES.find((v) => request.url.includes(new URL(v.url).hostname));
        if (!venue) return;

        console.log(`Processing ${venue.name}: ${request.url}`);

        try {
          await page.goto(request.url, {
            waitUntil: "networkidle",
            timeout: 60000,
          });
          await page.waitForTimeout(3000);

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
                    item["@type"] === "FoodEvent" ||
                    item["@type"] === "SocialEvent" ||
                    item["@type"]?.includes?.("Event")
                  ) {
                    events.push({
                      title: item.name || "",
                      startDate: item.startDate || "",
                      url: item.url || "",
                      description: (item.description || "").substring(0, 300),
                      price: item.offers?.price
                        ? `$${item.offers.price}`
                        : item.isAccessibleForFree ? "free" : "",
                      image_url:
                        typeof item.image === "string"
                          ? item.image
                          : item.image?.url || "",
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
            console.log(`[JSON-LD] Found ${jsonLdEvents.length} events for ${venue.name}`);
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

              this.events.push({
                title: evt.title,
                date,
                time,
                venue: venue.name,
                location: venue.address,
                category: "Food & Drink",
                description: evt.description || undefined,
                url: evt.url || request.url,
                image_url: evt.image_url || undefined,
                price: evt.price || undefined,
              });
            }
          }

          // Strategy 2: DOM scraping fallback
          if (jsonLdEvents.length === 0) {
            console.log(`[DOM] No JSON-LD found for ${venue.name}, trying DOM scraping...`);

            const domEvents = await page.evaluate(() => {
              const events: any[] = [];

              // Try common selectors for event listings on bar/restaurant websites
              const selectors = [
                ".event-listing",
                ".event-item",
                ".event-card",
                '[class*="event"]',
                ".show-listing",
                ".show-item",
                'article[class*="event"]',
                ".sqs-block-content",
                ".summary-item",
                ".eventlist-event",
                ".tribe-events-calendar-list__event",
                '[class*="tribe_events"]',
                ".wpem-event-box",
                ".type-tribe_events",
              ];

              for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length === 0) continue;

                for (const el of elements) {
                  const titleEl =
                    el.querySelector("h2, h3, h4, .title, .event-title, .event-name, .summary-title") ||
                    el.querySelector("a");
                  const dateEl = el.querySelector(
                    "time, .date, .event-date, [datetime], .summary-metadata-item--date, .tribe-event-schedule-details"
                  );
                  const linkEl = el.querySelector("a[href]");
                  const imgEl = el.querySelector("img");
                  const priceEl = el.querySelector('[class*="price"], [class*="cost"]');

                  const title = titleEl?.textContent?.trim();
                  if (!title || title.length < 3) continue;

                  events.push({
                    title,
                    date:
                      dateEl?.getAttribute("datetime") ||
                      dateEl?.textContent?.trim() ||
                      "",
                    url: linkEl?.getAttribute("href") || "",
                    image_url: imgEl?.getAttribute("src") || imgEl?.getAttribute("data-src") || "",
                    price: priceEl?.textContent?.trim() || "",
                  });
                }

                if (events.length > 0) break;
              }

              return events;
            });

            console.log(`[DOM] Found ${domEvents.length} events for ${venue.name}`);

            for (const evt of domEvents) {
              if (this.events.length >= MAX_EVENTS) break;

              let date = "";
              let time: string | undefined;

              if (evt.date) {
                const parsed = parseISODateToEastern(evt.date);
                if (parsed) {
                  date = parsed.date;
                  time = parsed.time;
                } else {
                  date = parseDate(evt.date);
                }
              }

              if (!date || !evt.title || date < today) continue;

              const dedupeKey = `${evt.title}|${date}`;
              if (seenKeys.has(dedupeKey)) continue;
              seenKeys.add(dedupeKey);

              // Resolve relative URLs
              let eventUrl = evt.url;
              if (eventUrl && !eventUrl.startsWith("http")) {
                eventUrl = new URL(eventUrl, venue.url).toString();
              }

              let imageUrl = evt.image_url;
              if (imageUrl && !imageUrl.startsWith("http") && !imageUrl.startsWith("data:")) {
                imageUrl = new URL(imageUrl, venue.url).toString();
              }

              // Parse price
              let price: string | undefined;
              if (evt.price) {
                const lower = evt.price.toLowerCase();
                if (lower.includes("free")) price = "free";
                else {
                  const priceMatch = evt.price.match(/\$\s*([0-9]+(?:\.[0-9]{2})?)/);
                  if (priceMatch) price = priceMatch[1];
                }
              }

              this.events.push({
                title: evt.title,
                date,
                time,
                venue: venue.name,
                location: venue.address,
                category: "Food & Drink",
                url: eventUrl || request.url,
                image_url: imageUrl || undefined,
                price,
              });
            }
          }
        } catch (error) {
          console.error(`Error crawling ${venue.name}:`, error);
        }
      },
    });

    const requests = DC_BAR_VENUES.map((v) => ({ url: v.url }));
    await crawler.run(requests);

    // Sort by date
    this.events.sort((a, b) => a.date.localeCompare(b.date));

    return this.events.slice(0, MAX_EVENTS);
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("DC Bar Events crawler started");

  const crawler = new DCBarEventsCrawler();
  const events = await crawler.crawlEvents();

  console.log(`Crawled ${events.length} total DC bar events`);

  if (events.length === 0) {
    console.log("No events found");
    return;
  }

  // Send to Step Functions
  const client = new SFNClient({});
  const payload = JSON.stringify({
    events,
    source: "dcbarevents",
    eventType: "dcbarevents",
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
        source: "dcbarevents",
        eventType: "dcbarevents",
      });
      const batchName = `dcbarevents-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
    const executionName = `dcbarevents-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await client.send(
      new StartExecutionCommand({
        stateMachineArn: Resource.normaizeEventStepFunction.arn,
        input: payload,
        name: executionName,
      })
    );
  }

  console.log(`DC Bar Events crawler completed. ${events.length} events sent to normalization.`);
}

main().catch((error) => {
  console.error("DC Bar Events crawler failed:", error);
  process.exit(1);
});
