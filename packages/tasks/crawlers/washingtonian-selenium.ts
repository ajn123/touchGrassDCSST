import { PlaywrightCrawler, RequestList } from "crawlee";
import { Resource } from "sst";

// Returns today's date in local time as YYYY-MM-DD
const getTodayLocalDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Returns YYYY-MM-DD for date + offsetDays (local time)
const getLocalDatePlus = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

class WashingtonianEvent {
  title: string;
  date: string;
  time?: string;
  location?: string;
  description?: string;
  url?: string;
  category?: string;
  price?: string;
  venue?: string;

  constructor(
    title: string,
    date: string,
    time?: string,
    location?: string,
    description?: string,
    url?: string,
    category?: string,
    price?: string,
    venue?: string
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
  }
}

class WashingtonianPlaywrightCrawler {
  private events: WashingtonianEvent[] = [];
  private readonly CRAWL_DAYS = 21; // Number of days to crawl (3 weeks)

  async crawlEvents(): Promise<WashingtonianEvent[]> {
    console.log("🕷️ Starting Washingtonian event crawl with Playwright...");

    this.events = [];

    // Create request list for the next 3 weeks
    const requests = [];
    for (let dayOffset = 0; dayOffset < this.CRAWL_DAYS; dayOffset++) {
      const crawlDate =
        dayOffset === 0 ? getTodayLocalDate() : getLocalDatePlus(dayOffset);
      requests.push({
        url: `https://www.washingtonian.com/calendar-2/#/show?start=${crawlDate}`,
        userData: { crawlDate, dayOffset },
        uniqueKey: `washingtonian-${crawlDate}`, // Ensure each request is unique
      });
    }

    console.log("🔍 Requests:", requests);

    const requestList = await RequestList.open(null, requests);

    const crawler = new PlaywrightCrawler({
      requestList,
      maxRequestsPerCrawl: this.CRAWL_DAYS, // Process all days
      maxConcurrency: 1, // Keep single concurrency for memory
      minConcurrency: 1,
      requestHandlerTimeoutSecs: 60, // Increased timeout to 60 seconds
      requestHandler: async ({ page, request }) => {
        const { crawlDate, dayOffset } = request.userData;
        console.log(
          `📅 Crawling events for ${crawlDate} (day ${dayOffset + 1}/${
            this.CRAWL_DAYS
          })`
        );
        console.log(`🔗 Processing URL: ${request.url}`);

        try {
          // Navigate to the Washingtonian events page
          await page.goto(request.url, {
            waitUntil: "domcontentloaded", // Wait for DOM to be ready
            timeout: 30000, // Increased timeout for JS loading
          });

          // Add a small delay to let the page stabilize
          await page.waitForTimeout(3000);

          console.log(`🔍 Extracting events from page for ${crawlDate}...`);

          // Check page title and content first
          const pageTitle = await page.title();
          console.log(`📄 Page title: ${pageTitle}`);

          // Check if we're on the right page
          const pageUrl = page.url();
          console.log(`🔗 Current URL: ${pageUrl}`);

          // Extract events using the correct CSS selectors
          let events: any[] = [];
          try {
            events = await page.evaluate((targetDate) => {
              const extractedEvents: any[] = [];

              // Debug: Check what elements are available
              console.log("🔍 Debugging page elements:");
              console.log("Page title:", document.title);
              console.log("Page URL:", window.location.href);
              console.log(
                "Total elements on page:",
                document.querySelectorAll("*").length
              );
              console.log(
                "Total .csEventInfo elements:",
                document.querySelectorAll(".csEventInfo").length
              );
              console.log(
                "Total .csEvWrap elements:",
                document.querySelectorAll(".csEvWrap").length
              );
              console.log(
                "Total .csEventTile elements:",
                document.querySelectorAll(".csEventTile").length
              );
              console.log(
                "Total .csEvent elements:",
                document.querySelectorAll(".csEvent").length
              );
              console.log(
                "Total [data-date] elements:",
                document.querySelectorAll("[data-date]").length
              );

              // Check for any elements that might contain events
              console.log("Checking for common event-related classes:");
              console.log(
                "Elements with 'event' in class:",
                document.querySelectorAll("[class*='event']").length
              );
              console.log(
                "Elements with 'Event' in class:",
                document.querySelectorAll("[class*='Event']").length
              );
              console.log(
                "Elements with 'cs' in class:",
                document.querySelectorAll("[class*='cs']").length
              );

              // Check if there's any content at all
              const bodyText = document.body.textContent || "";
              console.log("Body text length:", bodyText.length);
              console.log("Body text preview:", bodyText.substring(0, 200));

              // Target the .csEventInfo elements directly
              const eventElements = document.querySelectorAll(".csEventInfo");

              console.log(
                `Found ${eventElements.length} event elements, limiting to first 5`
              );

              // Limit to first 5 events per day
              const limitedElements = Array.from(eventElements).slice(0, 5);

              limitedElements.forEach((element) => {
                try {
                  // Get all text content from .csEventInfo
                  const fullText = element.textContent?.trim() || "";

                  if (!fullText) return;

                  // Extract date from parent element's data-date attribute
                  const parentElement = element.closest(".csEvWrap");
                  const dateAttr = parentElement?.getAttribute("data-date");
                  const eventDate = dateAttr
                    ? new Date(dateAttr).toISOString().split("T")[0]
                    : targetDate;

                  // Try to extract title from .csOneLine span within this element
                  const titleElement = element.querySelector(".csOneLine span");
                  const title = titleElement?.textContent?.trim() || "";

                  // Extract URL from the parent link
                  const linkElement = element.closest("a");
                  const url = linkElement?.getAttribute("href") || "";

                  // Convert relative URLs to full details URLs
                  let fullUrl = "";
                  if (url.startsWith("http")) {
                    fullUrl = url;
                  } else if (url.startsWith("#/details/")) {
                    // Already a details URL, add the domain with calendar-2 path
                    fullUrl = `https://www.washingtonian.com/calendar-2${url}`;
                  } else if (url.startsWith("/")) {
                    // Relative URL, add domain
                    fullUrl = `https://www.washingtonian.com${url}`;
                  } else {
                    // Fallback - construct details URL from available data
                    const eventId = url.match(/\d+/)?.[0] || "unknown";
                    const titleSlug =
                      title?.toLowerCase().replace(/[^a-z0-9]+/g, "-") ||
                      "event";
                    fullUrl = `https://www.washingtonian.com/calendar-2/#/details/${titleSlug}/${eventId}/${eventDate}T00`;
                  }

                  // Try to extract venue from .cityVenue within this element
                  const venueElement = element.querySelector(".cityVenue");
                  const venue = venueElement?.textContent?.trim() || "";

                  // Try to extract time from clock icon span within this element
                  const timeElement = element.querySelector(
                    ".csIconRow .csStaticSize span"
                  );
                  const time = timeElement?.textContent?.trim() || "";

                  // Try to extract distance from location icon span within this element
                  const distanceElement = element.querySelector(
                    ".csIconInfo .csStaticSize span"
                  );
                  const distance = distanceElement?.textContent?.trim() || "";

                  extractedEvents.push({
                    title: title || "Event",
                    date: eventDate,
                    time: time,
                    location: venue,
                    venue: venue,
                    distance: distance,
                    url: fullUrl,
                    description: fullText,
                  });
                } catch (error) {
                  console.log("Error extracting event:", error);
                }
              });

              console.log(
                `✅ Extracted ${extractedEvents.length} events for ${targetDate}`
              );
              return extractedEvents;
            }, crawlDate);
          } catch (evaluateError) {
            console.log(`⚠️ Error during page evaluation: ${evaluateError}`);
            events = []; // Set empty array if evaluation fails
          }

          // Convert to WashingtonianEvent objects and add to our collection
          const washingtonianEvents = events.map(
            (event) =>
              new WashingtonianEvent(
                event.title,
                event.date,
                event.time,
                event.location,
                event.description,
                event.url,
                undefined, // category
                undefined, // price
                event.venue,
                event.distance
              )
          );

          this.events.push(...washingtonianEvents);
          console.log(
            `✅ Found ${washingtonianEvents.length} events for ${crawlDate}`
          );
        } catch (error) {
          console.error(`❌ Error crawling events for ${crawlDate}:`, error);
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
            "--window-size=1280,720", // Smaller window
            "--disable-web-security",
            "--disable-features=VizDisplayCompositor",
            "--memory-pressure-off",
            "--max_old_space_size=256", // Reduced memory limit
            "--disable-background-timer-throttling",
            "--disable-backgrounding-occluded-windows",
            "--disable-renderer-backgrounding",
            "--disable-background-networking",
            "--disable-default-apps",
            "--disable-sync",
            "--disable-translate",
            "--hide-scrollbars",
            "--metrics-recording-only",
            "--mute-audio",
            "--no-first-run",
            "--safebrowsing-disable-auto-update",
            "--disable-ipc-flooding-protection",
            "--disable-hang-monitor",
            "--disable-prompt-on-repost",
            "--disable-client-side-phishing-detection",
            "--disable-component-extensions-with-background-pages",
            "--disable-background-mode",
            "--disable-features=TranslateUI",
            "--disable-features=BlinkGenPropertyTrees",
            "--run-all-compositor-stages-before-draw",
            "--disable-threaded-compositing",
            "--disable-threaded-scrolling",
            "--disable-checker-imaging",
            "--disable-new-content-rendering-timeout",
            "--disable-image-animation-resync",
            "--disable-partial-raster",
            "--disable-skia-runtime-opts",
            "--disable-system-font-check",
            "--disable-font-subpixel-positioning",
            "--disable-lcd-text",
            "--force-color-profile=srgb",
          ],
        },
      },
    });

    try {
      await crawler.run();
      console.log(`🎉 Total events found: ${this.events.length}`);

      // Log events by date to verify all dates were processed
      const eventsByDate = this.events.reduce((acc, event) => {
        acc[event.date] = (acc[event.date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log(`📊 Events by date:`, eventsByDate);

      return this.events;
    } catch (error) {
      console.error("❌ Crawler failed:", error);
      return [];
    }
  }

  async saveEvents(events: WashingtonianEvent[]): Promise<void> {
    console.log(
      `💾 Saving ${events.length} events using Lambda normalization...`
    );

    try {
      // Call the Lambda normalization API directly
      const response = await fetch(`${Resource.Api.url}/events/normalize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          events,
          source: "washingtonian",
          eventType: "washingtonian",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log(
        `✅ Successfully normalized and saved ${result.savedCount} events`
      );
      console.log(`⏱️ Execution time: ${result.executionTime}ms`);
      console.log(
        `📊 Event IDs: ${result.eventIds.slice(0, 3).join(", ")}${
          result.eventIds.length > 3 ? "..." : ""
        }`
      );
    } catch (error) {
      console.error(`❌ Error saving events via Lambda:`, error);
      throw error;
    }
  }

  async run(): Promise<void> {
    console.log("🚀 Starting Washingtonian Playwright Crawler...");

    try {
      const events = await this.crawlEvents();

      if (events.length > 0) {
        await this.saveEvents(events);
        console.log("✅ Washingtonian crawler completed successfully!");
      } else {
        console.log("⚠️ No events found to save");
      }
    } catch (error) {
      console.error("❌ Washingtonian crawler failed:", error);
      throw error;
    }
  }
}

// Main execution
async function main() {
  console.log("🎬 Starting Washingtonian Playwright Crawler...");

  const crawler = new WashingtonianPlaywrightCrawler();

  try {
    await crawler.run();
    console.log("🎉 Washingtonian Playwright Crawler completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("💥 Washingtonian Playwright Crawler failed:", error);
    process.exit(1);
  }
}

// Run the crawler
main();
