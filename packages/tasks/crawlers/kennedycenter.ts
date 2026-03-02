import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { PlaywrightCrawler } from "crawlee";
import { Resource } from "sst";

class KennedyCenterEvent {
  title: string;
  date: string;
  time?: string;
  location?: string;
  description?: string;
  url?: string;
  category?: string;
  price?: string;
  venue?: string;
  image_url?: string;

  constructor(
    title: string,
    date: string,
    time?: string,
    location?: string,
    description?: string,
    url?: string,
    category?: string,
    price?: string,
    venue?: string,
    image_url?: string
  ) {
    this.title = title;
    this.date = date;
    this.time = time;
    this.location = location;
    this.description = description;
    this.url = url;
    this.category = category;
    this.price = price;
    this.venue = venue;
    this.image_url = image_url;
  }
}

class KennedyCenterCrawler {
  private events: KennedyCenterEvent[] = [];
  private readonly MAX_EVENTS = 50;

  private parseDate(dateStr: string): string {
    try {
      if (!dateStr) return "";
      const cleaned = dateStr.trim();

      // Handle "March 15, 2026" or "Mar 15, 2026"
      const fullDateMatch = cleaned.match(
        /(\w+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/i
      );
      if (fullDateMatch) {
        const monthNames: Record<string, string> = {
          january: "01", february: "02", march: "03", april: "04",
          may: "05", june: "06", july: "07", august: "08",
          september: "09", october: "10", november: "11", december: "12",
          jan: "01", feb: "02", mar: "03", apr: "04",
          jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
        };
        const month = monthNames[fullDateMatch[1].toLowerCase()];
        if (month) {
          const day = String(parseInt(fullDateMatch[2])).padStart(2, "0");
          const today = new Date();
          const year = fullDateMatch[3] || today.getFullYear().toString();
          const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          // If date is in the past and no year specified, try next year
          if (parsedDate < today && !fullDateMatch[3]) {
            return `${today.getFullYear() + 1}-${month}-${day}`;
          }
          return `${year}-${month}-${day}`;
        }
      }

      // Handle ISO format
      const isoMatch = cleaned.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) return isoMatch[0];

      return "";
    } catch (error) {
      console.error("Error parsing date:", error);
      return "";
    }
  }

  private parseTime(timeStr: string): string | undefined {
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

  private parsePrice(text: string): string | undefined {
    if (!text) return undefined;
    const lower = text.toLowerCase().trim();
    if (/(^|\b)free(\b|$)/.test(lower)) return "free";
    const money = text.match(/\$\s*([0-9]+(?:\.[0-9]{2})?)/);
    if (money) return money[1];
    return undefined;
  }

  private mapCategory(category: string): string {
    const lowerCat = category.toLowerCase();
    if (lowerCat.includes("comedy")) return "Comedy";
    if (lowerCat.includes("jazz") || lowerCat.includes("music") || lowerCat.includes("concert") || lowerCat.includes("orchestra") || lowerCat.includes("symphony")) return "Music";
    if (lowerCat.includes("theater") || lowerCat.includes("theatre") || lowerCat.includes("play") || lowerCat.includes("musical")) return "Theater";
    if (lowerCat.includes("dance") || lowerCat.includes("ballet")) return "Arts";
    if (lowerCat.includes("family") || lowerCat.includes("kids")) return "Community";
    if (lowerCat.includes("film")) return "Arts";
    return "Arts";
  }

  async crawlEvents(): Promise<KennedyCenterEvent[]> {
    console.log("Starting Kennedy Center event crawl with Playwright...");
    this.events = [];

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
          // Wait longer for React SPA to hydrate
          await page.waitForTimeout(5000);

          // Debug: log page title and link count
          const pageTitle = await page.title();
          const linkCount = await page.evaluate(() => document.querySelectorAll("a").length);
          console.log(`[DEBUG] Page title: "${pageTitle}", total <a> tags: ${linkCount}`);

          // Strategy 1: Try JSON-LD structured data
          const jsonLdEvents = await page.evaluate(() => {
            const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
            const events: any[] = [];
            for (const script of scripts) {
              try {
                const data = JSON.parse(script.textContent || "");
                const items = Array.isArray(data) ? data : [data];
                for (const item of items) {
                  if (item["@type"] === "Event" || item["@type"]?.includes?.("Event")) {
                    events.push({
                      title: item.name || "",
                      date: item.startDate || "",
                      time: item.startDate || "",
                      url: item.url || "",
                      description: (item.description || "").substring(0, 300),
                      price: item.offers?.price ? `$${item.offers.price}` : item.offers?.lowPrice ? `$${item.offers.lowPrice}` : "",
                      image_url: typeof item.image === "string" ? item.image : item.image?.url || "",
                      category: item.genre || item["@type"] || "",
                      location: item.location?.name || item.location?.address?.streetAddress || "",
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
            console.log(`[JSON-LD] Found ${jsonLdEvents.length} events from structured data`);
          }

          // Strategy 2: Extract events from links pointing to /whats-on/ detail pages
          const linkEvents = await page.evaluate(() => {
            const extractedEvents: any[] = [];
            const seenUrls = new Set<string>();

            // Find all links to event detail pages
            const eventLinks = Array.from(document.querySelectorAll('a[href*="/whats-on/"]'));
            console.log(`[DEBUG] Found ${eventLinks.length} links matching /whats-on/`);

            for (const link of eventLinks) {
              const href = link.getAttribute("href") || "";
              // Skip navigation/category links, only want detail pages with multiple path segments
              const pathSegments = href.replace(/^https?:\/\/[^/]+/, "").split("/").filter(Boolean);
              if (pathSegments.length < 3) continue; // e.g. /whats-on/explore/ is too short

              const fullUrl = href.startsWith("http") ? href : `https://www.kennedy-center.org${href}`;
              if (seenUrls.has(fullUrl)) continue;
              seenUrls.add(fullUrl);

              // Get the containing card/parent element for context
              const container = link.closest("li, article, section, div") || link;

              // Extract title: prefer heading inside the link or container
              const titleEl = link.querySelector("h1, h2, h3, h4, h5") ||
                container.querySelector("h1, h2, h3, h4, h5");
              let title = titleEl?.textContent?.trim() || link.textContent?.trim() || "";
              // Clean up excessive whitespace
              title = title.replace(/\s+/g, " ").trim();
              if (!title || title.length < 3 || title.length > 200) continue;

              // Extract date from <time> elements or datetime attributes
              const timeEl = container.querySelector("time") || link.querySelector("time");
              let dateText = timeEl?.getAttribute("datetime") || timeEl?.textContent?.trim() || "";

              // Also check for date-like text in the container
              if (!dateText) {
                const containerText = container.textContent || "";
                const dateMatch = containerText.match(
                  /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2}(?:,?\s*\d{4})?/i
                );
                if (dateMatch) dateText = dateMatch[0];
              }

              // Extract image
              const imgEl = container.querySelector("img") || link.querySelector("img");
              const imageUrl = imgEl?.getAttribute("src") || imgEl?.getAttribute("data-src") || "";

              // Extract description
              const descEl = container.querySelector("p");
              const description = descEl?.textContent?.trim()?.substring(0, 300) || "";

              // Extract category/genre
              const categoryEl = container.querySelector("[class*='genre'], [class*='category'], [class*='type'], span");
              const category = categoryEl?.textContent?.trim() || "";

              extractedEvents.push({
                title,
                date: dateText,
                time: "",
                url: fullUrl,
                description,
                price: "",
                image_url: imageUrl,
                category,
              });
            }

            return extractedEvents;
          });

          console.log(`[Links] Found ${linkEvents.length} events from page links`);

          // Scroll to load lazy content and try again if few results
          if (linkEvents.length < 5) {
            console.log("[DEBUG] Few events found, scrolling to load more...");
            for (let i = 0; i < 8; i++) {
              await page.evaluate(() => window.scrollBy(0, window.innerHeight));
              await page.waitForTimeout(1000);
            }

            const afterScrollCount = await page.evaluate(
              () => document.querySelectorAll('a[href*="/whats-on/"]').length
            );
            console.log(`[DEBUG] After scrolling: ${afterScrollCount} /whats-on/ links`);
          }

          // Merge results: JSON-LD first, then link-extracted events
          const allRawEvents = [...jsonLdEvents, ...linkEvents];
          console.log(`[Total] ${allRawEvents.length} raw events before dedup/filtering`);

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          for (const e of allRawEvents) {
            if (this.events.length >= this.MAX_EVENTS) break;

            const parsedDate = this.parseDate(e.date);
            if (!parsedDate) continue;

            // Skip past events
            const eventDate = new Date(parsedDate + "T00:00:00");
            if (eventDate < today) continue;

            // Skip duplicates
            if (this.events.some((existing) => existing.title === e.title && existing.date === parsedDate)) continue;

            const category = this.mapCategory(e.category || "Arts");

            const event = new KennedyCenterEvent(
              e.title,
              parsedDate,
              this.parseTime(e.time),
              e.location || "2700 F Street NW, Washington, DC 20566",
              e.description,
              e.url,
              category,
              this.parsePrice(e.price),
              "Kennedy Center",
              e.image_url
            );
            this.events.push(event);
            console.log(`Extracted event #${this.events.length}: ${event.title} (${event.date})`);
          }

          console.log(`Found ${this.events.length} total events after filtering`);
        } catch (error) {
          console.error("Error extracting events:", error);
          // Save debug screenshot on failure
          try {
            await page.screenshot({ path: "/tmp/kc-debug.png", fullPage: true });
            console.log("[DEBUG] Screenshot saved to /tmp/kc-debug.png");
          } catch {
            console.log("[DEBUG] Could not save screenshot");
          }
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
      await crawler.run(["https://www.kennedy-center.org/whats-on/calendar/"]);
      console.log(`Total events found: ${this.events.length}`);
      return this.events;
    } catch (error) {
      console.error("Crawler failed:", error);
      return [];
    }
  }

  async saveEvents(events: KennedyCenterEvent[]): Promise<void> {
    console.log(`Saving ${events.length} events using Step Functions normalization...`);
    if (events.length === 0) return;

    try {
      const client = new SFNClient({});
      const executionName = `kennedycenter-crawler-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const sanitizedEvents = events.map((event) => ({
        title: event.title ? String(event.title).replace(/\0/g, "") : undefined,
        date: event.date ? String(event.date) : undefined,
        time: event.time ? String(event.time).replace(/\0/g, "") : undefined,
        location: event.location ? String(event.location).replace(/\0/g, "") : undefined,
        description: event.description ? String(event.description).replace(/\0/g, "") : undefined,
        url: event.url ? String(event.url) : undefined,
        category: event.category ? String(event.category).replace(/\0/g, "") : undefined,
        price: event.price ? String(event.price).replace(/\0/g, "") : undefined,
        venue: event.venue ? String(event.venue).replace(/\0/g, "") : undefined,
        image_url: event.image_url ? String(event.image_url) : undefined,
      }));

      const payload = {
        events: sanitizedEvents,
        source: "kennedycenter",
        eventType: "kennedycenter",
      };

      const stringifiedInput = JSON.stringify(payload);

      // Check payload size and batch if needed (256KB limit)
      const MAX_PAYLOAD_SIZE = 256 * 1024;
      if (stringifiedInput.length > MAX_PAYLOAD_SIZE) {
        console.log(`Payload exceeds 256KB (${stringifiedInput.length} bytes), batching...`);
        const batchSize = Math.floor(sanitizedEvents.length / Math.ceil(stringifiedInput.length / MAX_PAYLOAD_SIZE));
        for (let i = 0; i < sanitizedEvents.length; i += batchSize) {
          const batch = sanitizedEvents.slice(i, i + batchSize);
          const batchPayload = JSON.stringify({ events: batch, source: "kennedycenter", eventType: "kennedycenter" });
          const batchName = `kennedycenter-crawler-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const command = new StartExecutionCommand({
            stateMachineArn: Resource.normaizeEventStepFunction.arn,
            input: batchPayload,
            name: batchName,
          });
          await client.send(command);
          console.log(`Batch ${Math.floor(i / batchSize) + 1} sent (${batch.length} events)`);
        }
      } else {
        const command = new StartExecutionCommand({
          stateMachineArn: Resource.normaizeEventStepFunction.arn,
          input: stringifiedInput,
          name: executionName,
        });
        const response = await client.send(command);
        console.log("Step Functions execution started:", response.executionArn);
      }

      console.log(`Successfully started normalization workflow for ${events.length} events`);
    } catch (error) {
      console.error("Error saving events via Step Functions:", error);
      throw error;
    }
  }

  async run(): Promise<void> {
    console.log("Starting Kennedy Center Crawler...");
    try {
      const events = await this.crawlEvents();
      if (events.length > 0) {
        console.log(`\nSuccessfully parsed ${events.length} events from Kennedy Center`);
        await this.saveEvents(events);
        console.log("Kennedy Center crawler completed successfully!");
      } else {
        console.log("No events found to save");
      }
    } catch (error) {
      console.error("Kennedy Center crawler failed:", error);
      throw error;
    }
  }
}

async function main() {
  const crawler = new KennedyCenterCrawler();
  try {
    await crawler.run();
    process.exit(0);
  } catch (error) {
    console.error("Kennedy Center Crawler failed:", error);
    process.exit(1);
  }
}

main();
