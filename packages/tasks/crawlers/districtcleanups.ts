import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { PlaywrightCrawler } from "crawlee";
import { Resource } from "sst";

const MAX_EVENTS = 50;
const CALENDAR_URL = "https://www.districtcleanups.com/calendar";

function parseDate(dateStr: string): string {
  try {
    if (!dateStr) return "";
    const cleaned = dateStr.trim();

    const isoMatch = cleaned.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return isoMatch[0];

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

class DistrictCleanupsCrawler {
  private events: any[] = [];

  async crawlEvents(): Promise<any[]> {
    console.log("Starting District Cleanups event crawl with Playwright...");
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

          // Wait for Wix Events widget to render
          await page.waitForTimeout(5000);

          // Scroll down to trigger lazy loading
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
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
                    item["@type"]?.includes?.("Event")
                  ) {
                    events.push({
                      title: item.name || "",
                      startDate: item.startDate || "",
                      endDate: item.endDate || "",
                      url: item.url || "",
                      description: (item.description || "").substring(0, 500),
                      image_url:
                        typeof item.image === "string"
                          ? item.image
                          : item.image?.url || "",
                      venue: item.location?.name || "",
                      location: item.location?.address?.streetAddress ||
                        (typeof item.location?.address === "string" ? item.location.address : "") || "",
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
                venue: evt.venue || "District Cleanups",
                location: evt.location || undefined,
                category: "Volunteer",
                description: evt.description || undefined,
                url: evt.url || request.url,
                image_url: evt.image_url || undefined,
                price: "free",
              });
            }
          }

          // Strategy 2: DOM scraping for Wix Events widget
          if (this.events.length === 0) {
            console.log("[DOM] No JSON-LD found, trying DOM scraping...");

            const domEvents = await page.evaluate(() => {
              const events: any[] = [];

              // Wix Events widget selectors
              const selectors = [
                '[data-hook="ev-list-item"]',
                '[data-hook="event-card"]',
                ".event-card",
                ".event-list-item",
                '[class*="eventCard"]',
                '[class*="event-card"]',
                '[class*="listItem"]',
                "li[data-testid]",
                // Generic fallbacks
                "article",
                ".card",
                '[role="listitem"]',
              ];

              for (const selector of selectors) {
                const elements = document.querySelectorAll(selector);
                if (elements.length === 0) continue;

                console.log(`Found ${elements.length} elements with selector: ${selector}`);

                for (const el of elements) {
                  const titleEl =
                    el.querySelector("h2, h3, h4, [data-hook*='title'], .event-title") ||
                    el.querySelector("a");
                  const dateEl = el.querySelector(
                    "time, [datetime], [data-hook*='date'], .event-date, [class*='date']"
                  );
                  const linkEl = el.querySelector("a[href]");
                  const imgEl = el.querySelector("img");
                  const locationEl = el.querySelector(
                    "[data-hook*='location'], .event-location, [class*='location']"
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
                    location: locationEl?.textContent?.trim() || "",
                  });
                }

                if (events.length > 0) break;
              }

              // Fallback: look for any text that looks like events with dates
              if (events.length === 0) {
                const allText = document.body.innerText;
                console.log(`Page text length: ${allText.length}`);
                console.log(`First 500 chars: ${allText.substring(0, 500)}`);
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

              let eventUrl = evt.url;
              if (eventUrl && !eventUrl.startsWith("http")) {
                eventUrl = `https://www.districtcleanups.com${eventUrl}`;
              }

              let imageUrl = evt.image_url;
              if (imageUrl && imageUrl.startsWith("//")) {
                imageUrl = `https:${imageUrl}`;
              }

              this.events.push({
                title: evt.title,
                date,
                time,
                venue: "District Cleanups",
                location: evt.location || undefined,
                category: "Volunteer",
                url: eventUrl || CALENDAR_URL,
                image_url: imageUrl || undefined,
                price: "free",
              });
            }
          }

          // Strategy 3: Intercept Wix Events API calls
          if (this.events.length === 0) {
            console.log("[API] No DOM events found, trying API interception...");

            // Reload page and intercept network requests
            const apiEvents: any[] = [];
            page.on("response", async (response) => {
              const url = response.url();
              if (url.includes("events") && response.status() === 200) {
                try {
                  const json = await response.json();
                  if (json.events || json.items || json.data) {
                    const items = json.events || json.items || json.data;
                    if (Array.isArray(items)) {
                      apiEvents.push(...items);
                    }
                  }
                } catch {
                  // Not JSON
                }
              }
            });

            await page.goto(request.url, { waitUntil: "networkidle", timeout: 60000 });
            await page.waitForTimeout(5000);

            if (apiEvents.length > 0) {
              console.log(`[API] Intercepted ${apiEvents.length} events`);
              for (const evt of apiEvents) {
                if (this.events.length >= MAX_EVENTS) break;

                const title = evt.title || evt.name || "";
                if (!title) continue;

                let date = "";
                let time: string | undefined;
                const startDate = evt.scheduling?.startDate || evt.startDate || evt.start || "";
                if (startDate) {
                  const parsed = parseISODateToEastern(startDate);
                  if (parsed) {
                    date = parsed.date;
                    time = parsed.time;
                  } else {
                    date = parseDate(startDate);
                  }
                }

                if (!date || date < today) continue;

                const dedupeKey = `${title}|${date}`;
                if (seenKeys.has(dedupeKey)) continue;
                seenKeys.add(dedupeKey);

                this.events.push({
                  title,
                  date,
                  time,
                  venue: "District Cleanups",
                  location: evt.location?.address || evt.location?.name || undefined,
                  category: "Volunteer",
                  description: (evt.description || evt.about || "").substring(0, 500),
                  url: evt.eventPageUrl || evt.url || CALENDAR_URL,
                  image_url: evt.mainImage?.url || evt.image?.url || undefined,
                  price: "free",
                });
              }
            }
          }
        } catch (error) {
          console.error("Error crawling District Cleanups:", error);
        }
      },
    });

    try {
      await crawler.run([CALENDAR_URL]);
      console.log(`Total District Cleanups events found: ${this.events.length}`);
    } catch (error) {
      console.error("Crawler failed:", error);
    }

    this.events.sort((a, b) => a.date.localeCompare(b.date));
    return this.events.slice(0, MAX_EVENTS);
  }
}

async function main() {
  console.log("District Cleanups crawler started");

  const crawler = new DistrictCleanupsCrawler();
  const events = await crawler.crawlEvents();

  console.log(`Crawled ${events.length} total District Cleanups events`);

  if (events.length === 0) {
    console.log("No events found");
    return;
  }

  const client = new SFNClient({});
  const payload = JSON.stringify({
    events,
    source: "districtcleanups",
    eventType: "districtcleanups",
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
        source: "districtcleanups",
        eventType: "districtcleanups",
      });
      const batchName = `districtcleanups-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
    const executionName = `districtcleanups-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await client.send(
      new StartExecutionCommand({
        stateMachineArn: Resource.normaizeEventStepFunction.arn,
        input: payload,
        name: executionName,
      })
    );
  }

  console.log(`District Cleanups crawler completed. ${events.length} events sent to normalization.`);
}

main().catch((error) => {
  console.error("District Cleanups crawler failed:", error);
  process.exit(1);
});
