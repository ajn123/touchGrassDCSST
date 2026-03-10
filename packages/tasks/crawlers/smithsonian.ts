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

    // Handle "MM/DD/YYYY"
    const slashMatch = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
      return `${slashMatch[3]}-${slashMatch[1].padStart(2, "0")}-${slashMatch[2].padStart(2, "0")}`;
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

const MAX_EVENTS = 50;

class SmithsonianCrawler {
  private events: any[] = [];

  async crawlEvents(): Promise<any[]> {
    console.log("Starting Smithsonian event crawl with Playwright...");
    this.events = [];

    const today = new Date().toISOString().split("T")[0];
    const seenKeys = new Set<string>();

    const crawler = new PlaywrightCrawler({
      maxRequestsPerCrawl: 8,
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
                    item["@type"] === "ExhibitionEvent" ||
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
                      venue: item.location?.name || "",
                      location: item.location?.address?.streetAddress ||
                        item.location?.address || "",
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

              this.events.push({
                title: evt.title,
                date,
                time,
                venue: evt.venue || "Smithsonian Institution",
                location: evt.location || "National Mall, Washington, DC",
                category: "Arts",
                description: evt.description || undefined,
                url: evt.url || request.url,
                image_url: evt.image_url || undefined,
                price: evt.price || "free",
              });
            }
          }

          // Strategy 2: DOM scraping
          if (jsonLdEvents.length === 0) {
            console.log("[DOM] No JSON-LD found, trying DOM scraping...");

            const domEvents = await page.evaluate(() => {
              const events: any[] = [];

              // Try common Smithsonian event selectors
              const selectors = [
                ".teaser--event",
                ".event-card",
                ".event-listing",
                ".views-row",
                '[class*="event"]',
                "article",
                ".card",
              ];

              for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length === 0) continue;

                for (const el of elements) {
                  const titleEl =
                    el.querySelector("h2, h3, h4, .title, .event-title, .teaser__title") ||
                    el.querySelector("a");
                  const dateEl = el.querySelector(
                    "time, .date, .event-date, [datetime], .teaser__date"
                  );
                  const linkEl = el.querySelector("a[href]");
                  const imgEl = el.querySelector("img");
                  const venueEl = el.querySelector(
                    ".venue, .location, .museum, .teaser__location, [class*='museum']"
                  );

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
                    venue: venueEl?.textContent?.trim() || "",
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
                eventUrl = `https://www.si.edu${eventUrl}`;
              }

              let imageUrl = evt.image_url;
              if (imageUrl && !imageUrl.startsWith("http")) {
                imageUrl = `https://www.si.edu${imageUrl}`;
              }

              this.events.push({
                title: evt.title,
                date,
                time,
                venue: evt.venue || "Smithsonian Institution",
                location: "National Mall, Washington, DC",
                category: "Arts",
                url: eventUrl || request.url,
                image_url: imageUrl || undefined,
                price: "free",
              });
            }
          }

          // Check for pagination — follow "next page" link
          if (this.events.length < MAX_EVENTS) {
            const nextPageUrl = await page.evaluate(() => {
              const nextLink =
                document.querySelector('.pager__item--next a') ||
                document.querySelector('a[rel="next"]') ||
                document.querySelector('.next a');
              return nextLink?.getAttribute("href") || null;
            });

            if (nextPageUrl) {
              const fullNextUrl = nextPageUrl.startsWith("http")
                ? nextPageUrl
                : `https://www.si.edu${nextPageUrl}`;
              console.log(`Found next page: ${fullNextUrl}`);
              await page.goto(fullNextUrl, { waitUntil: "networkidle", timeout: 60000 });
              // Re-run DOM scraping on next page (simplified — real pagination handled by crawlee requests)
            }
          }
        } catch (error) {
          console.error("Error crawling Smithsonian:", error);
        }
      },
    });

    try {
      await crawler.run([
        "https://www.si.edu/events",
      ]);
      console.log(`Total Smithsonian events found: ${this.events.length}`);
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
  console.log("Smithsonian crawler started");

  const crawler = new SmithsonianCrawler();
  const events = await crawler.crawlEvents();

  console.log(`Crawled ${events.length} total Smithsonian events`);

  if (events.length === 0) {
    console.log("No events found");
    return;
  }

  // Send to Step Functions
  const client = new SFNClient({});
  const payload = JSON.stringify({
    events,
    source: "smithsonian",
    eventType: "smithsonian",
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
        source: "smithsonian",
        eventType: "smithsonian",
      });
      const batchName = `smithsonian-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
    const executionName = `smithsonian-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await client.send(
      new StartExecutionCommand({
        stateMachineArn: Resource.normaizeEventStepFunction.arn,
        input: payload,
        name: executionName,
      })
    );
  }

  console.log(`Smithsonian crawler completed. ${events.length} events sent to normalization.`);
}

main().catch((error) => {
  console.error("Smithsonian crawler failed:", error);
  process.exit(1);
});
