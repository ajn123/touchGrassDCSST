import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { PlaywrightCrawler } from "crawlee";
import { Resource } from "sst";

class DCImprovEvent {
  title: string;
  date: string;
  time?: string;
  location?: string;
  description?: string;
  url?: string;
  category?: string;
  price?: string;
  venue?: string;
  start_date?: string;
  end_date?: string;

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
    start_date?: string,
    end_date?: string
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
    this.start_date = start_date;
    this.end_date = end_date;
  }
}

class DCImprovCrawler {
  private events: DCImprovEvent[] = [];
  private ticketUrls: string[] = [];
  private skippedEventsCount: number = 0;

  // Parse date from various formats
  private parseDate(dateStr: string): string {
    try {
      if (!dateStr) return "";

      const cleaned = dateStr.trim();

      // Handle date ranges like "January 30 - February 1"
      const rangeMatch = cleaned.match(
        /([A-Za-z]+)\s+(\d{1,2})\s*-\s*([A-Za-z]+)\s+(\d{1,2})/i
      );
      if (rangeMatch) {
        // Use the start date
        const monthName = rangeMatch[1];
        const day = rangeMatch[2];
        return this.parseMonthDayToISO(monthName, day);
      }

      // Handle single dates like "January 27", "January 28"
      const singleDateMatch = cleaned.match(/([A-Za-z]+)\s+(\d{1,2})/i);
      if (singleDateMatch) {
        const monthName = singleDateMatch[1];
        const day = singleDateMatch[2];
        return this.parseMonthDayToISO(monthName, day);
      }

      // Handle dates with year like "January 27, 2025"
      const withYearMatch = cleaned.match(
        /([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/i
      );
      if (withYearMatch) {
        const monthName = withYearMatch[1];
        const day = withYearMatch[2];
        const year = withYearMatch[3];
        return this.parseMonthDayYearToISO(monthName, day, year);
      }

      return "";
    } catch (error) {
      console.error("Error parsing date:", error);
      return "";
    }
  }

  // Parse date range and return both start and end dates
  private parseDateRange(dateStr: string): { start: string; end: string } | null {
    try {
      if (!dateStr) return null;

      const cleaned = dateStr.trim();

      // Handle date ranges like "January 30 - February 1"
      const rangeMatch = cleaned.match(
        /([A-Za-z]+)\s+(\d{1,2})\s*-\s*([A-Za-z]+)\s+(\d{1,2})/i
      );
      if (rangeMatch) {
        const startMonth = rangeMatch[1];
        const startDay = rangeMatch[2];
        const endMonth = rangeMatch[3];
        const endDay = rangeMatch[4];

        const start = this.parseMonthDayToISO(startMonth, startDay);
        const end = this.parseMonthDayToISO(endMonth, endDay);

        if (start && end) {
          return { start, end };
        }
      }

      return null;
    } catch (error) {
      console.error("Error parsing date range:", error);
      return null;
    }
  }

  // Helper to convert month name and day to ISO date (current year assumed)
  private parseMonthDayToISO(monthName: string, day: string): string {
    const monthMap: { [key: string]: number } = {
      january: 1,
      jan: 1,
      february: 2,
      feb: 2,
      march: 3,
      mar: 3,
      april: 4,
      apr: 4,
      may: 5,
      june: 6,
      jun: 6,
      july: 7,
      jul: 7,
      august: 8,
      aug: 8,
      september: 9,
      sep: 9,
      october: 10,
      oct: 10,
      november: 11,
      nov: 11,
      december: 12,
      dec: 12,
    };

    const monthLower = monthName.toLowerCase();
    const monthNum = monthMap[monthLower];
    if (!monthNum) return "";

    const today = new Date();
    let year = today.getFullYear();
    const dayNum = parseInt(day);

    // Create date and check if it's in the past
    let date = new Date(year, monthNum - 1, dayNum);

    // If the date is more than 6 months in the past, assume it's next year
    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    if (date < sixMonthsAgo) {
      date.setFullYear(year + 1);
      year = year + 1;
    }

    const yearStr = date.getFullYear();
    const monthStr = String(date.getMonth() + 1).padStart(2, "0");
    const dayStr = String(date.getDate()).padStart(2, "0");
    return `${yearStr}-${monthStr}-${dayStr}`;
  }

  // Helper to convert month name, day, and year to ISO date
  private parseMonthDayYearToISO(
    monthName: string,
    day: string,
    year: string
  ): string {
    const monthMap: { [key: string]: number } = {
      january: 1,
      jan: 1,
      february: 2,
      feb: 2,
      march: 3,
      mar: 3,
      april: 4,
      apr: 4,
      may: 5,
      june: 6,
      jun: 6,
      july: 7,
      jul: 7,
      august: 8,
      aug: 8,
      september: 9,
      sep: 9,
      october: 10,
      oct: 10,
      november: 11,
      nov: 11,
      december: 12,
      dec: 12,
    };

    const monthLower = monthName.toLowerCase();
    const monthNum = monthMap[monthLower];
    if (!monthNum) return "";

    const yearNum = parseInt(year);
    const dayNum = parseInt(day);

    const monthStr = String(monthNum).padStart(2, "0");
    const dayStr = String(dayNum).padStart(2, "0");
    return `${yearNum}-${monthStr}-${dayStr}`;
  }

  // Parse time from formats like "7:00 PM", "7:30 PM", "2 P.M.", etc.
  private parseTime(timeStr: string): string | undefined {
    if (!timeStr) return undefined;

    const cleaned = timeStr.trim().replace(/\s+/g, " ");

    // Handle time ranges like "7:30 PM - 9:45 PM"
    const rangeMatch = cleaned.match(
      /(\d{1,2}:\d{2}\s*[ap]\.?m\.?)\s*-\s*(\d{1,2}:\d{2}\s*[ap]\.?m\.?)/i
    );
    if (rangeMatch) {
      return `${rangeMatch[1].toLowerCase().replace(/\./g, "")}-${rangeMatch[2].toLowerCase().replace(/\./g, "")}`;
    }

    // Handle single times like "7:00 PM" or "7:00 P.M."
    const singleTimeMatch = cleaned.match(/(\d{1,2}:\d{2}\s*[ap]\.?m\.?)/i);
    if (singleTimeMatch) {
      return singleTimeMatch[1].toLowerCase().replace(/\./g, "");
    }

    // Handle times without colons like "7 PM" or "2 P.M."
    const noColonMatch = cleaned.match(/(\d{1,2}\s*[ap]\.?m\.?)/i);
    if (noColonMatch) {
      return noColonMatch[1].toLowerCase().replace(/\./g, "");
    }

    return cleaned || undefined;
  }

  // Parse price from text
  private parsePrice(text: string): string | undefined {
    if (!text) return undefined;
    const lower = text.toLowerCase().trim();
    if (/(^|\b)free(\b|$)/.test(lower)) return "free";
    const money = text.match(/\$\s*([0-9]+(?:\.[0-9]{2})?)/);
    if (money) return money[1];
    const bare = text.match(/\b([0-9]+(?:\.[0-9]{2})?)\b/);
    if (bare) return bare[1];
    return undefined;
  }

  // First pass: collect all "get tickets" URLs from the homepage
  async collectTicketUrls(): Promise<string[]> {
    console.log("🔍 Collecting ticket URLs from homepage...");

    const crawler = new PlaywrightCrawler({
      maxRequestsPerCrawl: 1,
      maxConcurrency: 1,
      minConcurrency: 1,
      requestHandlerTimeoutSecs: 60,
      requestHandler: async ({ page, request }) => {
        console.log(`🔗 Processing homepage: ${request.url}`);

        try {
          await page.goto(request.url, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
          });

          await page.waitForTimeout(2000);

          // Extract all "get tickets" links and event info
          const ticketInfo = await page.evaluate(() => {
            const links: string[] = [];
            const eventData: Array<{
              url: string;
              title: string;
              dateText: string;
              venue: string;
            }> = [];

            // Look for "get tickets" links (case insensitive)
            const ticketLinks = Array.from(document.querySelectorAll("a")).filter(
              (link) => {
                const text = link.textContent?.toLowerCase().trim() || "";
                return (
                  text.includes("get tickets") ||
                  text.includes("get ticket") ||
                  link.getAttribute("href")?.includes("ticket") ||
                  link.getAttribute("href")?.includes("show")
                );
              }
            );

            ticketLinks.forEach((link) => {
              const href = link.getAttribute("href");
              if (!href) return;

              // Convert relative URLs to absolute
              const fullUrl = href.startsWith("http")
                ? href
                : `${window.location.origin}${href.startsWith("/") ? href : `/${href}`}`;

              if (!links.includes(fullUrl)) {
                links.push(fullUrl);

                // Try to extract event info from nearby elements
                let title = "";
                let dateText = "";
                let venue = "";

                // Look for title in parent or nearby elements
                const parent = link.closest("article, .event, [class*='event'], [class*='show']");
                if (parent) {
                  const titleEl =
                    parent.querySelector("h1, h2, h3, h4, [class*='title']") ||
                    parent.querySelector("strong, b");
                  if (titleEl) {
                    title = titleEl.textContent?.trim() || "";
                  }

                  // Look for date
                  const dateEl =
                    parent.querySelector("time, [class*='date'], [class*='Date']") ||
                    parent.querySelector("span, div");
                  if (dateEl) {
                    const text = dateEl.textContent?.trim() || "";
                    // Check if it looks like a date
                    if (
                      /([A-Za-z]+)\s+(\d{1,2})/.test(text) ||
                      /([A-Za-z]+)\s+(\d{1,2})\s*-\s*([A-Za-z]+)\s+(\d{1,2})/.test(
                        text
                      )
                    ) {
                      dateText = text;
                    }
                  }

                  // Look for venue info
                  const venueEl = parent.querySelector(
                    "[class*='venue'], [class*='Venue'], [class*='room'], [class*='Room']"
                  );
                  if (venueEl) {
                    venue = venueEl.textContent?.trim() || "";
                  }
                }

                // If no title found, try to get from link text or nearby text
                if (!title) {
                  title = link.textContent?.trim() || "";
                }

                eventData.push({ url: fullUrl, title, dateText, venue });
              }
            });

            return { links, eventData };
          });

          // Convert relative URLs to absolute
          this.ticketUrls = ticketInfo.links;

          console.log(`✅ Found ${this.ticketUrls.length} ticket URLs`);
          if (ticketInfo.eventData.length > 0) {
            console.log(`📋 Found ${ticketInfo.eventData.length} events with metadata`);
          }
        } catch (error) {
          console.error(`❌ Error collecting ticket URLs:`, error);
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
      await crawler.run(["https://www.dcimprov.com/"]);
      return this.ticketUrls;
    } catch (error) {
      console.error("❌ Failed to collect ticket URLs:", error);
      return [];
    }
  }

  // Second pass: visit each ticket URL and extract event details
  async crawlTicketPages(ticketUrls: string[]): Promise<DCImprovEvent[]> {
    console.log(
      `🕷️ Starting DC Improv ticket page crawl for ${ticketUrls.length} URLs...`
    );

    this.events = [];

    const crawler = new PlaywrightCrawler({
      maxRequestsPerCrawl: ticketUrls.length,
      maxConcurrency: 3,
      minConcurrency: 1,
      requestHandlerTimeoutSecs: 90,
      requestHandler: async ({ page, request }) => {
        console.log(`🔗 Processing ticket page: ${request.url}`);

        try {
          await page.goto(request.url, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
          });

          await page.waitForTimeout(3000); // Wait for page to load

          // Check if we're on a checkout page or event detail page
          const isCheckoutPage =
            request.url.includes("checkout") ||
            request.url.includes("cart") ||
            request.url.includes("purchase");

          // Extract event details
          const eventData = await page.evaluate(() => {
            // Extract title - prioritize specific selectors
            let title = "";
            
            // Priority 1: Try the specific field-entry title-link structure
            const titleLinkEl = document.querySelector("dd.field-entry.title-link.titlelink a");
            if (titleLinkEl) {
              title = titleLinkEl.textContent?.trim() || "";
            }
            
            // Priority 2: Try h1 with event-header class
            if (!title) {
              const eventHeaderEl = document.querySelector("h1.event-header");
              if (eventHeaderEl) {
                title = eventHeaderEl.textContent?.trim() || "";
              }
            }
            
            // Fallback to other selectors if not found
            if (!title) {
              const titleEl =
                document.querySelector("h1") ||
                document.querySelector("h2") ||
                document.querySelector(".event-title, [class*='title']") ||
                document.querySelector("title");
              title = titleEl?.textContent?.trim() || "";
            }

            // Extract description
            const descriptionEl =
              document.querySelector(".event-description, [class*='description']") ||
              document.querySelector("p");
            const description = descriptionEl?.textContent?.trim() || "";

            // Extract dates - look for date text in various places
            const dateTexts: string[] = [];

            // Look for date elements
            const dateElements = document.querySelectorAll(
              "time, [class*='date'], [class*='Date'], [datetime]"
            );
            dateElements.forEach((el) => {
              const datetime = el.getAttribute("datetime");
              if (datetime) {
                dateTexts.push(datetime);
              }
              const text = el.textContent?.trim();
              if (text && !dateTexts.includes(text)) {
                dateTexts.push(text);
              }
            });

            // Look for date patterns in the page text
            const bodyText = document.body.textContent || "";

            // Format: "January 27", "January 30 - February 1"
            const datePatterns = bodyText.match(
              /([A-Za-z]+)\s+(\d{1,2})(\s*-\s*([A-Za-z]+)\s+(\d{1,2}))?/g
            );
            if (datePatterns) {
              datePatterns.forEach((pattern) => {
                if (!dateTexts.includes(pattern)) {
                  dateTexts.push(pattern);
                }
              });
            }

            // Extract times
            const times: string[] = [];
            const timeElements = document.querySelectorAll(
              "time, [class*='time'], [class*='Time'], [class*='showtime']"
            );
            timeElements.forEach((el) => {
              const timeText = el.textContent?.trim();
              if (timeText && /(\d{1,2}:\d{2}\s*[ap]\.?m\.?|\d{1,2}\s*[ap]\.?m\.?)/i.test(timeText)) {
                times.push(timeText);
              }
            });

            // Also look for time patterns in text
            const timePatterns = bodyText.match(
              /(\d{1,2}:\d{2}\s*[ap]\.?m\.?|\d{1,2}\s*[ap]\.?m\.?)/gi
            );
            if (timePatterns) {
              timePatterns.forEach((pattern) => {
                const cleaned = pattern.trim();
                if (cleaned && !times.includes(cleaned)) {
                  times.push(cleaned);
                }
              });
            }

            // Extract price information
            const priceTexts: string[] = [];
            const priceElements = document.querySelectorAll(
              "[class*='price'], [class*='Price'], [class*='cost'], [class*='Cost'], [class*='ticket']"
            );
            priceElements.forEach((el) => {
              const text = el.textContent?.trim();
              if (
                text &&
                (text.includes("$") || text.toLowerCase().includes("free"))
              ) {
                priceTexts.push(text);
              }
            });

            // Extract venue
            let venue = "DC Improv";
            const venueEl = document.querySelector(
              "[class*='venue'], [class*='Venue'], [class*='room'], [class*='Room']"
            );
            if (venueEl) {
              venue = venueEl.textContent?.trim() || "DC Improv";
            }

            // Check for multiple show dates/times (for event detail pages)
            const showDates: Array<{ date: string; time: string }> = [];
            const showElements = document.querySelectorAll(
              "[class*='show'], [class*='Show'], [class*='performance'], [class*='Performance']"
            );

            showElements.forEach((el) => {
              const text = el.textContent?.trim() || "";
              const dateMatch = text.match(/([A-Za-z]+)\s+(\d{1,2})/);
              const timeMatch = text.match(/(\d{1,2}:\d{2}\s*[ap]\.?m\.?|\d{1,2}\s*[ap]\.?m\.?)/i);
              
              if (dateMatch && timeMatch) {
                showDates.push({
                  date: dateMatch[0],
                  time: timeMatch[0],
                });
              }
            });

            return {
              title,
              description,
              dates: dateTexts,
              times,
              prices: priceTexts,
              venue,
              showDates,
              isCheckout: window.location.href.includes("checkout") || 
                         window.location.href.includes("cart") ||
                         window.location.href.includes("purchase"),
            };
          });

          // If we're on a checkout page, create a single event
          if (isCheckoutPage || eventData.isCheckout) {
            if (!eventData.title) {
              console.log(`⚠️ Skipping checkout page with no title: ${request.url}`);
              return;
            }

            // Try to extract date and time from checkout page
            let parsedDate = "";
            let parsedTime: string | undefined = undefined;

            if (eventData.dates && eventData.dates.length > 0) {
              parsedDate = this.parseDate(eventData.dates[0]);
            }

            if (eventData.times && eventData.times.length > 0) {
              parsedTime = this.parseTime(eventData.times[0]);
            }

            // If no date found, use today as fallback
            if (!parsedDate) {
              const today = new Date();
              const yearStr = today.getFullYear();
              const monthStr = String(today.getMonth() + 1).padStart(2, "0");
              const dayStr = String(today.getDate()).padStart(2, "0");
              parsedDate = `${yearStr}-${monthStr}-${dayStr}`;
            }

            const parsedPrice = eventData.prices && eventData.prices.length > 0
              ? this.parsePrice(eventData.prices[0])
              : undefined;

            if (!eventData.title || eventData.title.trim() === "") {
              console.log(`⚠️ Skipping event with no title from checkout page: ${request.url}`);
              this.skippedEventsCount++;
              return;
            }

            const event = new DCImprovEvent(
              eventData.title,
              parsedDate,
              parsedTime,
              "1140 Connecticut Ave. NW, Washington, DC 20036",
              eventData.description,
              request.url,
              "comedy",
              parsedPrice,
              eventData.venue
            );
            this.events.push(event);
            console.log(`✅ Extracted single event from checkout: ${request.url}`);
            return;
          }

          // If we're on an event detail page, extract all dates/times
          if (!eventData.title || eventData.title.trim() === "") {
            console.log(`⚠️ Skipping page with no title: ${request.url}`);
            return;
          }
          
          // Skip if title is "About The Show" or similar
          if (eventData.title.toLowerCase().includes("about the show")) {
            console.log(`⚠️ Skipping page with invalid title "${eventData.title}": ${request.url}`);
            this.skippedEventsCount++;
            return;
          }

          // Parse dates
          const parsedDates: string[] = [];
          const dateRanges: Array<{ start: string; end: string }> = [];

          if (eventData.dates && eventData.dates.length > 0) {
            eventData.dates.forEach((dateStr) => {
              // Check if it's a date range
              const range = this.parseDateRange(dateStr);
              if (range) {
                dateRanges.push(range);
              } else {
                const parsed = this.parseDate(dateStr);
                if (parsed) parsedDates.push(parsed);
              }
            });
          }

          // If we have showDates from the page, use those
          if (eventData.showDates && eventData.showDates.length > 0) {
            eventData.showDates.forEach((show) => {
              const parsed = this.parseDate(show.date);
              if (parsed) {
                parsedDates.push(parsed);
                // If we have a time for this show, create an event with it
                const parsedTime = this.parseTime(show.time);
                if (parsedTime) {
                  const parsedPrice = eventData.prices && eventData.prices.length > 0
                    ? this.parsePrice(eventData.prices[0])
                    : undefined;

                  if (!eventData.title || eventData.title.trim() === "") {
                    console.log(`⚠️ Skipping event with no title from showDates: ${request.url}`);
                    this.skippedEventsCount++;
                    return; // Use return instead of continue in forEach
                  }

                  const event = new DCImprovEvent(
                    eventData.title,
                    parsed,
                    parsedTime,
                    "1140 Connecticut Ave. NW, Washington, DC 20036",
                    eventData.description,
                    request.url,
                    "comedy",
                    parsedPrice,
                    eventData.venue
                  );
                  this.events.push(event);
                }
              }
            });

            // If we created events from showDates, skip the rest
            if (this.events.length > 0) {
              console.log(`✅ Extracted ${this.events.length} events from detail page: ${request.url}`);
              return;
            }
          }

          // Parse times
          const parsedTimes: string[] = [];
          if (eventData.times && eventData.times.length > 0) {
            eventData.times.forEach((timeStr) => {
              const parsed = this.parseTime(timeStr);
              if (parsed) parsedTimes.push(parsed);
            });
          }

          // Parse price
          const parsedPrice =
            eventData.prices && eventData.prices.length > 0
              ? this.parsePrice(eventData.prices[0])
              : undefined;

          // Handle date ranges - create events for each date in the range
          if (dateRanges.length > 0) {
            dateRanges.forEach((range) => {
              const startDate = new Date(range.start);
              const endDate = new Date(range.end);
              const currentDate = new Date(startDate);

              while (currentDate <= endDate) {
                const dateStr = currentDate.toISOString().split("T")[0];
                
                if (parsedTimes.length > 0) {
                  // Create event for each time
                  parsedTimes.forEach((time) => {
                    if (!eventData.title || eventData.title.trim() === "") {
                      console.log(`⚠️ Skipping event with no title from date range: ${request.url}`);
                      this.skippedEventsCount++;
                      return;
                    }

                    const event = new DCImprovEvent(
                      eventData.title,
                      dateStr,
                      time,
                      "1140 Connecticut Ave. NW, Washington, DC 20036",
                      eventData.description,
                      request.url,
                      "comedy",
                      parsedPrice,
                      eventData.venue,
                      range.start,
                      range.end
                    );
                    this.events.push(event);
                  });
                } else {
                  // Create event without time
                  if (!eventData.title || eventData.title.trim() === "") {
                    console.log(`⚠️ Skipping event with no title from date range: ${request.url}`);
                    this.skippedEventsCount++;
                    return;
                  }

                  const event = new DCImprovEvent(
                    eventData.title,
                    dateStr,
                    undefined,
                    "1140 Connecticut Ave. NW, Washington, DC 20036",
                    eventData.description,
                    request.url,
                    "comedy",
                    parsedPrice,
                    eventData.venue,
                    range.start,
                    range.end
                  );
                  this.events.push(event);
                }

                currentDate.setDate(currentDate.getDate() + 1);
              }
            });
          } else if (parsedDates.length > 0) {
            // Multiple dates - create one event per date
            parsedDates.forEach((date) => {
              if (parsedTimes.length > 0) {
                // Create event for each time
                parsedTimes.forEach((time) => {
                  if (!eventData.title || eventData.title.trim() === "") {
                    console.log(`⚠️ Skipping event with no title from parsed dates: ${request.url}`);
                    this.skippedEventsCount++;
                    return;
                  }

                  const event = new DCImprovEvent(
                    eventData.title,
                    date,
                    time,
                    "1140 Connecticut Ave. NW, Washington, DC 20036",
                    eventData.description,
                    request.url,
                    "comedy",
                    parsedPrice,
                    eventData.venue
                  );
                  this.events.push(event);
                });
              } else {
                // Create event without time
                if (!eventData.title || eventData.title.trim() === "") {
                  console.log(`⚠️ Skipping event with no title from parsed dates: ${request.url}`);
                  this.skippedEventsCount++;
                  return;
                }

                const event = new DCImprovEvent(
                  eventData.title,
                  date,
                  undefined,
                  "1140 Connecticut Ave. NW, Washington, DC 20036",
                  eventData.description,
                  request.url,
                  "comedy",
                  parsedPrice,
                  eventData.venue
                );
                this.events.push(event);
              }
            });
          } else {
            // Fallback: create single event
            const today = new Date();
            const yearStr = today.getFullYear();
            const monthStr = String(today.getMonth() + 1).padStart(2, "0");
            const dayStr = String(today.getDate()).padStart(2, "0");
            const fallbackDate = `${yearStr}-${monthStr}-${dayStr}`;

            if (!eventData.title || eventData.title.trim() === "") {
              console.log(`⚠️ Skipping event with no title from fallback: ${request.url}`);
              this.skippedEventsCount++;
              return;
            }

            const event = new DCImprovEvent(
              eventData.title,
              fallbackDate,
              parsedTimes[0],
              "1140 Connecticut Ave. NW, Washington, DC 20036",
              eventData.description,
              request.url,
              "comedy",
              parsedPrice,
              eventData.venue
            );
            this.events.push(event);
          }

          console.log(`✅ Extracted events from: ${request.url}`);
        } catch (error) {
          console.error(`❌ Error extracting event from ${request.url}:`, error);
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
      await crawler.run(ticketUrls);
      console.log(`🎉 Total events found: ${this.events.length}`);
      if (this.skippedEventsCount > 0) {
        console.log(`⚠️ Skipped ${this.skippedEventsCount} events due to missing titles`);
      }
      return this.events;
    } catch (error) {
      console.error("❌ Crawler failed:", error);
      return [];
    }
  }

  async crawlEvents(): Promise<DCImprovEvent[]> {
    console.log("🕷️ Starting DC Improv event crawl with Playwright...");

    // Step 1: Collect all ticket URLs
    const ticketUrls = await this.collectTicketUrls();

    if (ticketUrls.length === 0) {
      console.log("⚠️ No ticket URLs found");
      return [];
    }

    // Step 2: Crawl each ticket page
    const events = await this.crawlTicketPages(ticketUrls);

    return events;
  }

  async saveEvents(events: DCImprovEvent[]): Promise<void> {
    console.log(
      `💾 Saving ${events.length} events using Lambda normalization...`
    );

    try {
      const config = {};
      const client = new SFNClient(config);

      // Generate unique execution name with timestamp
      const executionName = `dcimprov-crawler-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Sanitize events to ensure they're JSON-safe
      const sanitizedEvents = events.map((event) => {
        return {
          title: event.title ? String(event.title).replace(/\0/g, "") : undefined,
          date: event.date ? String(event.date) : undefined,
          time: event.time ? String(event.time).replace(/\0/g, "") : undefined,
          location: event.location
            ? String(event.location).replace(/\0/g, "")
            : undefined,
          description: event.description
            ? String(event.description).replace(/\0/g, "")
            : undefined,
          url: event.url ? String(event.url) : undefined,
          category: event.category
            ? String(event.category).replace(/\0/g, "")
            : undefined,
          price: event.price ? String(event.price).replace(/\0/g, "") : undefined,
          venue: event.venue ? String(event.venue).replace(/\0/g, "") : undefined,
          start_date: event.start_date ? String(event.start_date) : undefined,
          end_date: event.end_date ? String(event.end_date) : undefined,
        };
      });

      // Prepare the payload object
      const payload = {
        events: sanitizedEvents,
        source: "dcimprov",
        eventType: "dcimprov",
      };

      // Log the payload before stringifying
      console.log("📦 [STEP FUNCTIONS DEBUG] Payload object:", {
        eventCount: events.length,
        source: payload.source,
        eventType: payload.eventType,
        firstEventSample: sanitizedEvents[0]
          ? {
              title: sanitizedEvents[0].title,
              date: sanitizedEvents[0].date,
              time: sanitizedEvents[0].time,
            }
          : null,
      });

      // Stringify the payload with error handling
      let stringifiedInput: string;
      try {
        stringifiedInput = JSON.stringify(payload);
      } catch (stringifyError) {
        console.error("❌ [STEP FUNCTIONS DEBUG] JSON.stringify failed:", {
          error:
            stringifyError instanceof Error
              ? stringifyError.message
              : String(stringifyError),
          errorName:
            stringifyError instanceof Error ? stringifyError.name : "Unknown",
          eventCount: events.length,
        });

        // Try to identify which event is causing the issue
        for (let i = 0; i < sanitizedEvents.length; i++) {
          try {
            JSON.stringify(sanitizedEvents[i]);
          } catch (eventError) {
            console.error(
              `❌ [STEP FUNCTIONS DEBUG] Problematic event at index ${i}:`,
              {
                event: sanitizedEvents[i],
                error:
                  eventError instanceof Error
                    ? eventError.message
                    : String(eventError),
              }
            );
          }
        }
        throw stringifyError;
      }

      // Validate the JSON before sending
      try {
        const testParse = JSON.parse(stringifiedInput);
        console.log("📦 [STEP FUNCTIONS DEBUG] JSON validation passed");
      } catch (validationError) {
        console.error(
          "❌ [STEP FUNCTIONS DEBUG] JSON validation failed before sending:",
          {
            error:
              validationError instanceof Error
                ? validationError.message
                : String(validationError),
            errorPosition:
              validationError instanceof SyntaxError &&
              validationError.message.includes("position")
                ? validationError.message.match(/position (\d+)/)?.[1]
                : undefined,
          }
        );
        throw validationError;
      }

      // Check payload size (Step Functions limit is 262144 bytes / 256 KB)
      const AWS_LIMIT = 262144; // AWS Step Functions hard limit
      const MAX_PAYLOAD_SIZE = 260000; // Leave small buffer (260 KB) to account for any encoding differences
      const payloadSizeBytes = Buffer.from(stringifiedInput, 'utf8').length;
      
      console.log("📦 [STEP FUNCTIONS DEBUG] Payload size check:", {
        payloadSizeBytes,
        maxPayloadSize: MAX_PAYLOAD_SIZE,
        awsLimit: AWS_LIMIT,
        willBatch: payloadSizeBytes > MAX_PAYLOAD_SIZE,
      });

      console.log("📦 [STEP FUNCTIONS DEBUG] Stringified input:", {
        length: stringifiedInput.length,
        sizeBytes: payloadSizeBytes,
        maxSizeBytes: MAX_PAYLOAD_SIZE,
        firstChars: stringifiedInput.substring(0, 300),
        isValidJSON: true,
      });

      // If payload is too large, split into batches
      if (payloadSizeBytes > MAX_PAYLOAD_SIZE) {
        console.log(`⚠️ Payload size (${payloadSizeBytes} bytes) exceeds limit. Splitting into batches...`);
        
        // Calculate average event size
        const avgEventSize = payloadSizeBytes / sanitizedEvents.length;
        // Calculate safe batch size (leave 20% buffer for JSON structure overhead)
        const BATCH_SIZE = Math.max(1, Math.floor((MAX_PAYLOAD_SIZE * 0.8) / avgEventSize));
        
        console.log(`📦 Average event size: ${Math.round(avgEventSize)} bytes, Batch size: ${BATCH_SIZE} events`);

        // Helper function to send a batch with size validation
        let subBatchCounter = 0;
        const sendBatch = async (batch: any[], batchNumber: number, depth: number = 0): Promise<void> => {
          const batchPayload = {
            events: batch,
            source: "dcimprov",
            eventType: "dcimprov",
          };

          const batchStringified = JSON.stringify(batchPayload);
          const batchSizeBytes = Buffer.from(batchStringified, 'utf8').length;

          if (batchSizeBytes > AWS_LIMIT) {
            // Still too large, split in half
            console.error(`❌ Batch still too large (${batchSizeBytes} bytes). Splitting further...`);
            if (batch.length === 1) {
              // Single event is too large - this is a problem
              throw new Error(`Single event is too large (${batchSizeBytes} bytes). Cannot split further. Event: ${JSON.stringify(batch[0]).substring(0, 200)}...`);
            }
            const mid = Math.floor(batch.length / 2);
            await sendBatch(batch.slice(0, mid), batchNumber, depth + 1);
            await sendBatch(batch.slice(mid), batchNumber, depth + 1);
            return;
          }

          // Generate unique execution name with timestamp and counter to avoid collisions
          subBatchCounter++;
          const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}-${subBatchCounter}`;
          const batchExecutionName = depth > 0
            ? `${executionName}-batch-${batchNumber}-sub-${uniqueSuffix}`
            : `${executionName}-batch-${batchNumber}-${uniqueSuffix}`;
          
          const batchInputObject = {
            stateMachineArn: Resource.normaizeEventStepFunction.arn,
            input: batchStringified,
            name: batchExecutionName,
          };

          // Final safety check before sending - use actual AWS limit (262144)
          if (batchSizeBytes > 262144) {
            throw new Error(`Batch ${batchExecutionName} is still too large (${batchSizeBytes} bytes) even after splitting. AWS limit: 262144 bytes.`);
          }

          const batchCommand = new StartExecutionCommand(batchInputObject);
          const batchResponse = await client.send(batchCommand);
          console.log(`🚀 Step Functions execution ${batchExecutionName} started (${batchSizeBytes} bytes):`, batchResponse.executionArn);
        };

        // Split into batches and send
        let batchNumber = 1;
        for (let i = 0; i < sanitizedEvents.length; i += BATCH_SIZE) {
          const batch = sanitizedEvents.slice(i, i + BATCH_SIZE);
          await sendBatch(batch, batchNumber);
          batchNumber++;
        }

        console.log(`✅ Successfully started normalization workflows`);
        return;
      }

      // Payload is within limit, send normally
      // Final safety check - double verify size
      if (payloadSizeBytes > AWS_LIMIT) {
        console.error(`❌ CRITICAL: Payload size check failed! Size: ${payloadSizeBytes} bytes, AWS Limit: ${AWS_LIMIT} bytes`);
        throw new Error(`Payload size (${payloadSizeBytes} bytes) exceeds AWS limit (${AWS_LIMIT} bytes) but batching logic was not triggered. This is a bug.`);
      }

      const inputObject = {
        stateMachineArn: Resource.normaizeEventStepFunction.arn,
        input: stringifiedInput,
        name: executionName,
      };

      console.log("📦 [STEP FUNCTIONS DEBUG] Input object structure:", {
        hasStateMachineArn: !!inputObject.stateMachineArn,
        hasInput: !!inputObject.input,
        inputType: typeof inputObject.input,
        inputLength: inputObject.input.length,
        inputSizeBytes: Buffer.from(inputObject.input, 'utf8').length,
      });

      // One more check right before sending - use AWS limit
      const finalSizeCheck = Buffer.from(inputObject.input, 'utf8').length;
      if (finalSizeCheck > AWS_LIMIT) {
        throw new Error(`Final size check failed: ${finalSizeCheck} bytes exceeds AWS limit of ${AWS_LIMIT} bytes`);
      }

      const command = new StartExecutionCommand(inputObject);
      const response = await client.send(command);

      console.log("🚀 Step Functions execution successful:", response);
      console.log(`✅ Successfully started normalization workflow`);
      console.log(
        "📦 [STEP FUNCTIONS DEBUG] Execution ARN:",
        response.executionArn
      );
    } catch (error) {
      console.error(`❌ Error saving events via Lambda:`, error);
      throw error;
    }
  }

  async run(): Promise<void> {
    console.log("🚀 Starting DC Improv Crawler...");

    try {
      const events = await this.crawlEvents();

      if (events.length > 0) {
        // Limit to first 50 events
        const limitedEvents = events.slice(0, 50);
        if (events.length > 50) {
          console.log(`⚠️ Limiting events from ${events.length} to 50`);
        }

        console.log("\n📊 SUMMARY OF PARSED EVENTS:");
        console.log("=".repeat(80));
        limitedEvents.forEach((event, index) => {
          console.log(`\nEvent ${index + 1}:`);
          console.log(`  Title: ${event.title}`);
          console.log(`  Date: ${event.date}`);
          if (event.time) console.log(`  Time: ${event.time}`);
          if (event.venue) console.log(`  Venue: ${event.venue}`);
          if (event.price) console.log(`  Price: ${event.price}`);
          if (event.url) console.log(`  URL: ${event.url}`);
        });
        console.log("=".repeat(80));
        console.log(
          `\n✅ Successfully parsed ${limitedEvents.length} events from DC Improv`
        );

        await this.saveEvents(limitedEvents);
        console.log("✅ DC Improv crawler completed successfully!");
      } else {
        console.log("⚠️ No events found to save");
      }
    } catch (error) {
      console.error("❌ DC Improv crawler failed:", error);
      throw error;
    }
  }
}

// Main execution
async function main() {
  console.log("🎬 Starting DC Improv Crawler...");

  const crawler = new DCImprovCrawler();

  try {
    await crawler.run();
    console.log("🎉 DC Improv Crawler completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("💥 DC Improv Crawler failed:", error);
    process.exit(1);
  }
}

// Run the crawler
main();
