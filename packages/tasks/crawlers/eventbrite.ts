import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { PlaywrightCrawler } from "crawlee";
import { Resource } from "sst";

class EventbriteEvent {
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
    image_url?: string,
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
    this.image_url = image_url;
    this.start_date = start_date;
    this.end_date = end_date;
  }
}

class EventbriteCrawler {
  private events: EventbriteEvent[] = [];
  private readonly MAX_PAGES = 10; // Limit pages to crawl
  private readonly EVENTS_PER_PAGE = 20;
  private readonly MAX_EVENTS = 10; // Limit total events to parse

  // Parse date from Eventbrite format (e.g., "Wed, Nov 12, 7:30 PM" or "Saturday at 12:00 PM")
  private parseDate(dateStr: string, timeStr?: string): string {
    if (!dateStr) return "";

    try {
      const today = new Date();
      const currentYear = today.getFullYear();

      // Handle relative dates like "Tomorrow", "Saturday", "This weekend"
      const lowerDate = dateStr.toLowerCase().trim();

      if (lowerDate.includes("today")) {
        const year = currentYear;
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }

      if (lowerDate.includes("tomorrow")) {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const year = tomorrow.getFullYear();
        const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
        const day = String(tomorrow.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }

      // Handle day of week like "Saturday", "Sunday"
      const dayNames = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];
      const dayIndex = dayNames.findIndex((day) => lowerDate.includes(day));
      if (dayIndex !== -1) {
        const targetDay = dayIndex;
        const currentDay = today.getDay();
        let daysToAdd = targetDay - currentDay;
        if (daysToAdd <= 0) daysToAdd += 7; // Next occurrence
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + daysToAdd);
        const year = targetDate.getFullYear();
        const month = String(targetDate.getMonth() + 1).padStart(2, "0");
        const day = String(targetDate.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }

      // Handle full date format like "Wed, Nov 12" or "Wed, Nov 12, 7:30 PM"
      const dateMatch = dateStr.match(
        /(\w{3}),\s*(\w{3})\s+(\d{1,2})(?:,\s*(\d{4}))?/i
      );
      if (dateMatch) {
        const monthNames: { [key: string]: string } = {
          jan: "01",
          feb: "02",
          mar: "03",
          apr: "04",
          may: "05",
          jun: "06",
          jul: "07",
          aug: "08",
          sep: "09",
          oct: "10",
          nov: "11",
          dec: "12",
        };
        const month = monthNames[dateMatch[2].toLowerCase().substring(0, 3)];
        const day = String(parseInt(dateMatch[3])).padStart(2, "0");
        const year = dateMatch[4] || currentYear.toString();
        return `${year}-${month}-${day}`;
      }

      // Handle date format without day of week: "Nov 22" or "Nov 22, 2024"
      const simpleDateMatch = dateStr.match(
        /^(\w{3})\s+(\d{1,2})(?:,\s*(\d{4}))?/i
      );
      if (simpleDateMatch) {
        const monthNames: { [key: string]: string } = {
          jan: "01",
          feb: "02",
          mar: "03",
          apr: "04",
          may: "05",
          jun: "06",
          jul: "07",
          aug: "08",
          sep: "09",
          oct: "10",
          nov: "11",
          dec: "12",
        };
        const month =
          monthNames[simpleDateMatch[1].toLowerCase().substring(0, 3)];
        if (!month) return "";

        const day = String(parseInt(simpleDateMatch[2])).padStart(2, "0");
        const year = simpleDateMatch[3] || currentYear.toString();

        // Check if the date is in the past (more than 6 months ago) - assume next year
        const parsedDate = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day)
        );
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        if (parsedDate < sixMonthsAgo && !simpleDateMatch[3]) {
          // If no year specified and date is in the past, assume next year
          return `${parseInt(currentYear.toString()) + 1}-${month}-${day}`;
        }

        return `${year}-${month}-${day}`;
      }

      // Try ISO format
      const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        return dateStr;
      }

      return "";
    } catch (error) {
      console.error("Error parsing date:", error);
      return "";
    }
  }

  // Parse time from formats like "7:30 PM", "12:00 PM", "7-11pm"
  private parseTime(timeStr: string): string | undefined {
    if (!timeStr) return undefined;

    const cleaned = timeStr.trim().toLowerCase();

    // Handle ranges like "7-11pm"
    const rangeMatch = cleaned.match(
      /(\d{1,2}(?::\d{2})?)\s*-\s*(\d{1,2}(?::\d{2})?)\s*([ap]m)/
    );
    if (rangeMatch) {
      const start = rangeMatch[1];
      const end = `${rangeMatch[2]}${rangeMatch[3]}`;
      const startWithSuffix = `${start}${rangeMatch[3]}`;
      return `${startWithSuffix}-${end}`;
    }

    // Handle single time with am/pm (e.g., "5:30 PM", "7pm", "12:00 am")
    const timeMatch = cleaned.match(/(\d{1,2}(?::\d{2})?)\s*([ap]m)/);
    if (timeMatch) {
      const time = timeMatch[1];
      const period = timeMatch[2];
      return `${time}${period}`;
    }

    // If already contains am/pm anywhere, return as-is (lowercase)
    if (/(am|pm)/.test(cleaned)) {
      return cleaned;
    }

    // Handle 24-hour format
    const time24Match = cleaned.match(/(\d{1,2}):(\d{2})/);
    if (time24Match) {
      const hour = parseInt(time24Match[1]);
      const minute = time24Match[2];
      const ampm = hour >= 12 ? "pm" : "am";
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minute}${ampm}`;
    }

    return cleaned;
  }

  // Parse price from Eventbrite format
  private parsePrice(priceText: string): string | undefined {
    if (!priceText) return undefined;

    const lower = priceText.toLowerCase().trim();

    // Check for free
    if (lower.includes("free")) return "free";

    // Extract price from text like "$25.00", "$25", "From $20", "25.00"
    const priceMatch = priceText.match(/\$?\s*([0-9]+(?:\.[0-9]{2})?)/);
    if (priceMatch) {
      return priceMatch[1];
    }

    return undefined;
  }

  async crawlEvents(): Promise<EventbriteEvent[]> {
    console.log("🕷️ Starting Eventbrite event crawl with Playwright...");

    this.events = [];

    const crawler = new PlaywrightCrawler({
      maxRequestsPerCrawl: this.MAX_PAGES * this.EVENTS_PER_PAGE,
      maxConcurrency: 2,
      minConcurrency: 1,
      requestHandlerTimeoutSecs: 90,
      requestHandler: async ({ page, request }) => {
        console.log(`🔗 Processing URL: ${request.url}`);

        try {
          console.log("📄 Loading page...");
          await page.goto(request.url, {
            waitUntil: "domcontentloaded",
            timeout: 60000,
          });
          console.log("✅ Page loaded successfully");

          // Wait for events to load
          console.log("⏳ Waiting for events to load (3 seconds)...");
          await page.waitForTimeout(3000);

          // Scroll to load more events (Eventbrite uses infinite scroll)
          console.log("📜 Starting infinite scroll to load more events...");
          let previousHeight = 0;
          let scrollAttempts = 0;
          const maxScrollAttempts = 5;

          while (scrollAttempts < maxScrollAttempts) {
            const currentHeight = await page.evaluate(() => {
              window.scrollTo(0, document.body.scrollHeight);
              return document.body.scrollHeight;
            });

            await page.waitForTimeout(2000);

            if (currentHeight === previousHeight) {
              console.log(
                `   📊 Scroll attempt ${
                  scrollAttempts + 1
                }: No new content loaded (height: ${currentHeight}px)`
              );
              break;
            }

            console.log(
              `   📊 Scroll attempt ${
                scrollAttempts + 1
              }: Height increased from ${previousHeight}px to ${currentHeight}px`
            );
            previousHeight = currentHeight;
            scrollAttempts++;
          }
          console.log(
            `✅ Finished scrolling after ${scrollAttempts} attempt(s)`
          );

          let events: any[] = [];
          try {
            console.log("🔍 Extracting events from page...");
            const result = await page.evaluate(() => {
              const extractedEvents: any[] = [];

              // Find event cards by looking for the tracking layer and getting its parent container
              // The tracking layer is inside the event card, so we find its parent
              const trackingLayers = Array.from(
                document.querySelectorAll(
                  '[data-testid="event-card-tracking-layer"]'
                )
              );

              const eventCards: Element[] = [];
              trackingLayers.forEach((layer) => {
                // Find the parent container that likely contains the event card
                const card =
                  layer.closest(
                    'article, div[class*="event"], div[class*="card"], a[href*="/e/"]'
                  ) || layer.parentElement?.parentElement;
                if (card && !eventCards.includes(card)) {
                  eventCards.push(card);
                }
              });

              const usedFallback = eventCards.length === 0;

              // Fallback: try standard Eventbrite selectors if tracking layer didn't work
              if (usedFallback) {
                const fallbackCards = Array.from(
                  document.querySelectorAll(
                    '[data-testid="event-card"], .event-card, [class*="event-card"], article[class*="event"], a[href*="/e/"]'
                  )
                );
                eventCards.push(...fallbackCards);
              }

              eventCards.forEach((card, index) => {
                try {
                  // Extract title
                  const titleEl =
                    card.querySelector("h3") ||
                    card.querySelector('[class*="title"]') ||
                    card.querySelector('[data-testid*="title"]') ||
                    card.querySelector("a[href*='/e/']");
                  const title = titleEl?.textContent?.trim() || "";

                  if (!title) {
                    return;
                  }

                  // Extract URL
                  const linkEl =
                    card.querySelector("a[href*='/e/']") ||
                    card.closest("a[href*='/e/']");
                  let url = linkEl?.getAttribute("href") || "";
                  if (url && !url.startsWith("http")) {
                    url = `https://www.eventbrite.com${url}`;
                  }

                  // Extract date/time - try multiple selectors
                  let dateText = "";
                  let timeText = "";

                  // Try to find date/time elements - look for Typography elements or elements with date/time classes
                  const dateTimeEl =
                    card.querySelector('[data-testid="event-card-date"]') ||
                    card.querySelector('[data-testid*="date"]') ||
                    card.querySelector('[data-testid*="Date"]') ||
                    card.querySelector('[data-testid*="datetime"]') ||
                    card.querySelector('[data-testid*="DateTime"]') ||
                    card.querySelector("time[datetime]") ||
                    card.querySelector("time") ||
                    card.querySelector(
                      '[class*="Typography"][class*="body"]'
                    ) ||
                    card.querySelector('p[class*="Typography"]') ||
                    card.querySelector('[class*="date"]') ||
                    card.querySelector('[class*="Date"]') ||
                    card.querySelector('[class*="datetime"]') ||
                    card.querySelector('[class*="DateTime"]');

                  if (dateTimeEl) {
                    // Try to get text content
                    let dateTimeText = dateTimeEl.textContent?.trim() || "";
                    // If no text, try datetime attribute
                    if (!dateTimeText && dateTimeEl.getAttribute("datetime")) {
                      dateTimeText = dateTimeEl.getAttribute("datetime") || "";
                    }
                    // If still no text, try innerText
                    if (
                      !dateTimeText &&
                      (dateTimeEl as HTMLElement).innerText
                    ) {
                      dateTimeText =
                        (dateTimeEl as HTMLElement).innerText.trim() || "";
                    }

                    // Check if the text contains both date and time separated by bullet (•) or other separators
                    if (dateTimeText) {
                      // Split by bullet, dash, or pipe
                      const separators = /[•·\-\|]/;
                      const parts = dateTimeText
                        .split(separators)
                        .map((p) => p.trim())
                        .filter((p) => p);

                      if (parts.length >= 2) {
                        // First part is likely date, second part is likely time
                        dateText = parts[0];
                        timeText = parts[1];

                        // Verify the second part actually looks like a time
                        const timePattern =
                          /\b(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))\b/i;
                        if (!timePattern.test(timeText)) {
                          // Second part doesn't look like time, check if first part has time
                          const firstPartTime = dateText.match(timePattern);
                          if (firstPartTime) {
                            timeText = firstPartTime[1];
                            dateText = dateText.replace(timePattern, "").trim();
                          }
                          // If still no time, try to find it in the original text
                          const originalTime = dateTimeText.match(timePattern);
                          if (originalTime && !timeText) {
                            timeText = originalTime[1];
                          }
                        }
                      } else {
                        // Single part - check if it contains both date and time patterns
                        const timePattern =
                          /\b(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))\b/i;
                        const timeMatch = dateTimeText.match(timePattern);

                        if (timeMatch) {
                          // Extract time
                          timeText = timeMatch[1];
                          // Remove time from date text
                          dateText = dateTimeText
                            .replace(timePattern, "")
                            .trim();
                        } else {
                          // No time pattern found, treat as date only
                          dateText = dateTimeText;
                        }
                      }
                    }
                  }

                  // If we found date but no time, search more aggressively in the card
                  if (dateText && !timeText) {
                    // Search all Typography elements for time
                    const allTypographyEls = card.querySelectorAll(
                      'p[class*="Typography"], [class*="Typography"][class*="body"]'
                    );
                    for (const el of Array.from(allTypographyEls)) {
                      const text = el.textContent?.trim() || "";
                      const timePattern =
                        /\b(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))\b/i;
                      const timeMatch = text.match(timePattern);
                      if (timeMatch) {
                        timeText = timeMatch[1];
                        break;
                      }
                    }

                    // If still no time, search all text in the card
                    if (!timeText) {
                      const allText = card.textContent || "";
                      const timePattern =
                        /\b(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))\b/i;
                      const timeMatch = allText.match(timePattern);
                      if (timeMatch) {
                        timeText = timeMatch[1];
                      }
                    }
                  }

                  // If date is still empty, try to find date-like text patterns in the card
                  if (!dateText) {
                    const allText = card.textContent || "";
                    // Look for date patterns like "Wed, Nov 12", "Nov 12, 2024", "12/15", etc.
                    const datePatterns = [
                      /\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[,.]?\s+(\w{3})\s+(\d{1,2})/i,
                      /\b(\w{3})\s+(\d{1,2})(?:,\s+(\d{4}))?/i,
                      /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/i,
                      /\b(\d{4})-(\d{2})-(\d{2})/i,
                      /\b(Today|Tomorrow|Yesterday)/i,
                    ];

                    for (const pattern of datePatterns) {
                      const match = allText.match(pattern);
                      if (match) {
                        dateText = match[0];
                        break;
                      }
                    }
                  }

                  // Extract time separately if not already found - try multiple selectors
                  if (!timeText) {
                    const timeEl =
                      card.querySelector('[data-testid="event-card-time"]') ||
                      card.querySelector('[data-testid*="time"]') ||
                      card.querySelector('[data-testid*="Time"]') ||
                      card.querySelector('[class*="time"]') ||
                      card.querySelector('[class*="Time"]');

                    if (timeEl) {
                      timeText = timeEl.textContent?.trim() || "";
                      if (!timeText && (timeEl as HTMLElement).innerText) {
                        timeText =
                          (timeEl as HTMLElement).innerText.trim() || "";
                      }
                    }
                  }

                  // If time is still empty and dateText contains time info, try to extract it
                  if (!timeText && dateText) {
                    const timePattern =
                      /\b(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm))\b/i;
                    const timeMatch = dateText.match(timePattern);
                    if (timeMatch) {
                      timeText = timeMatch[1];
                      // Remove time from dateText if it was combined
                      dateText = dateText.replace(timePattern, "").trim();
                      // Also remove any remaining separators
                      dateText = dateText
                        .replace(/^[•·\-\|]\s*|\s*[•·\-\|]\s*$/g, "")
                        .trim();
                    }
                  }

                  // Clean up dateText - remove any remaining separators at the end
                  if (dateText) {
                    dateText = dateText.replace(/\s*[•·\-\|]\s*$/, "").trim();
                  }

                  // Extract location/venue
                  const locationEl =
                    card.querySelector('[data-testid*="location"]') ||
                    card.querySelector('[class*="location"]') ||
                    card.querySelector('[class*="venue"]') ||
                    card.querySelector('[data-testid*="venue"]');
                  const locationText = locationEl?.textContent?.trim() || "";

                  // Extract price
                  const priceEl =
                    card.querySelector('[data-testid*="price"]') ||
                    card.querySelector('[class*="price"]') ||
                    card.querySelector('[class*="cost"]');
                  const priceText = priceEl?.textContent?.trim() || "";

                  // Extract image
                  const imageEl =
                    card.querySelector("img") ||
                    card.querySelector('[class*="image"]');
                  const imageUrl =
                    imageEl?.getAttribute("src") ||
                    imageEl?.getAttribute("data-src") ||
                    "";

                  // Extract description
                  const descEl =
                    card.querySelector('[class*="description"]') ||
                    card.querySelector("p");
                  const description = descEl?.textContent?.trim() || "";

                  extractedEvents.push({
                    title,
                    date: dateText,
                    time: timeText,
                    location: locationText,
                    description,
                    url,
                    price: priceText,
                    image_url: imageUrl,
                    _debug:
                      extractedEvents.length < 3
                        ? {
                            dateFound: dateText || "NOT FOUND",
                            timeFound: timeText || "NOT FOUND",
                            dateSelector: dateTimeEl
                              ? dateTimeEl.tagName
                              : "none",
                            timeSelector: timeEl ? timeEl.tagName : "none",
                            dateTimeText: dateTimeEl
                              ? dateTimeEl.textContent
                                  ?.trim()
                                  .substring(0, 50) || ""
                              : "none",
                          }
                        : undefined,
                  });
                } catch (error) {
                  // Silently skip cards that fail to extract
                }
              });

              return {
                events: extractedEvents,
                cardCount: eventCards.length,
                usedFallback: usedFallback,
              };
            });

            console.log(
              `   Found ${result.cardCount} event cards using ${
                result.usedFallback ? "fallback" : "tracking layer"
              } selector`
            );
            console.log(
              `✅ Page evaluation completed: found ${result.events.length} raw events`
            );

            // Debug: Log date extraction info for first few events
            result.events.slice(0, 3).forEach((event: any, idx: number) => {
              if (event._debug) {
                console.log(
                  `   DEBUG Event ${idx + 1} - "${event.title?.substring(
                    0,
                    50
                  )}":`
                );
                console.log(`      Date: ${event._debug.dateFound}`);
                console.log(`      Time: ${event._debug.timeFound}`);
                console.log(`      Date element: ${event._debug.dateSelector}`);
                console.log(`      Time element: ${event._debug.timeSelector}`);
                console.log(
                  `      Raw dateTime text: ${event._debug.dateTimeText}`
                );
              }
            });

            // Remove debug info before processing
            events = result.events.map((event: any) => {
              const { _debug, ...cleanEvent } = event;
              return cleanEvent;
            });
          } catch (evaluateError) {
            console.error(`❌ Error during page evaluation: ${evaluateError}`);
            events = [];
          }

          // Also try to extract from the page structure if the above didn't work
          if (events.length === 0) {
            console.log(
              "⚠️ No events found with standard selectors, trying alternative method..."
            );
            try {
              events = await page.evaluate(() => {
                const extractedEvents: any[] = [];
                // Look for any links that contain /e/ which is Eventbrite's event URL pattern
                const eventLinks = Array.from(
                  document.querySelectorAll('a[href*="/e/"]')
                );

                eventLinks.forEach((link) => {
                  const url = link.getAttribute("href") || "";
                  if (!url.includes("/e/")) return;

                  // Try to find the parent container
                  const card =
                    link.closest(
                      "article, div[class*='card'], div[class*='event']"
                    ) || link.parentElement;

                  const title = link.textContent?.trim() || "";
                  if (!title || title.length < 3) return;

                  // Look for date/time in nearby elements
                  const siblings = Array.from(card?.children || []);
                  let dateText = "";
                  let timeText = "";
                  let locationText = "";
                  let priceText = "";

                  siblings.forEach((sibling) => {
                    const text = sibling.textContent?.trim() || "";
                    if (
                      !dateText &&
                      /(today|tomorrow|mon|tue|wed|thu|fri|sat|sun|\d{1,2}\/\d{1,2})/i.test(
                        text
                      )
                    ) {
                      dateText = text;
                    }
                    if (
                      !timeText &&
                      /(\d{1,2}:\d{2}\s*(am|pm)|noon|midnight)/i.test(text)
                    ) {
                      timeText = text;
                    }
                    if (
                      !locationText &&
                      /(washington|dc|venue|location)/i.test(text)
                    ) {
                      locationText = text;
                    }
                    if (!priceText && /(\$|free|price)/i.test(text)) {
                      priceText = text;
                    }
                  });

                  extractedEvents.push({
                    title,
                    date: dateText,
                    time: timeText,
                    location: locationText,
                    url: url.startsWith("http")
                      ? url
                      : `https://www.eventbrite.com${url}`,
                    price: priceText,
                  });
                });

                return extractedEvents;
              });
            } catch (altError) {
              console.error("Alternative extraction method failed:", altError);
            }
          }

          console.log(`\n🔄 Processing ${events.length} raw events...`);
          let processedCount = 0;
          let skippedCount = 0;
          let duplicateCount = 0;

          for (const e of events) {
            processedCount++;
            console.log(
              `\n📝 Processing event ${processedCount}/${events.length}: "${
                e.title?.substring(0, 50) || "Unknown"
              }..."`
            );

            // Normalize date and time
            console.log(`   📅 Raw date: "${e.date || "N/A"}"`);
            const normalizedDate = this.parseDate(e.date, e.time);
            console.log(`   📅 Parsed date: ${normalizedDate || "FAILED"}`);

            console.log(`   ⏰ Raw time: "${e.time || "N/A"}"`);
            const normalizedTime = this.parseTime(e.time || "");
            console.log(`   ⏰ Parsed time: ${normalizedTime || "N/A"}`);

            console.log(`   💰 Raw price: "${e.price || "N/A"}"`);
            const normalizedPrice = this.parsePrice(e.price);
            console.log(`   💰 Parsed price: ${normalizedPrice || "N/A"}`);

            // Extract venue from location if it contains a venue name
            let venue = e.venue;
            let location = e.location;
            if (!venue && location) {
              // Try to extract venue name (usually before a comma or specific patterns)
              const venueMatch = location.match(/^([^,]+)/);
              if (venueMatch) {
                venue = venueMatch[1].trim();
              }
            }

            if (!normalizedDate) {
              console.log(
                `   ⚠️ SKIPPING - could not parse date from "${e.date}"`
              );
              skippedCount++;
              continue;
            }

            const event = new EventbriteEvent(
              e.title,
              normalizedDate,
              normalizedTime,
              location,
              e.description,
              e.url,
              undefined, // category - could be extracted if available
              normalizedPrice,
              venue,
              e.image_url,
              normalizedDate, // start_date
              undefined // end_date
            );

            // Check for duplicates
            const isDuplicate = this.events.some(
              (existing) =>
                existing.title === event.title &&
                existing.date === event.date &&
                existing.url === event.url
            );

            if (!isDuplicate) {
              this.events.push(event);
              console.log(`   ✅ ADDED - Event #${this.events.length}:`);
              console.log(`      📌 Title: ${event.title}`);
              console.log(`      📅 Date: ${event.date}`);
              if (event.time) console.log(`      ⏰ Time: ${event.time}`);
              if (event.venue) console.log(`      🏢 Venue: ${event.venue}`);
              if (event.location)
                console.log(`      📍 Location: ${event.location}`);
              if (event.price) console.log(`      💰 Price: ${event.price}`);
              if (event.url) console.log(`      🔗 URL: ${event.url}`);

              // Stop processing once we've reached the max number of events
              if (this.events.length >= this.MAX_EVENTS) {
                console.log(
                  `\n🛑 Reached maximum event limit (${this.MAX_EVENTS}), stopping processing...`
                );
                break;
              }
            } else {
              console.log(`   ⚠️ DUPLICATE - Already exists`);
              duplicateCount++;
            }
          }

          console.log(`\n📊 Extraction Summary:`);
          console.log(`   Total raw events found: ${events.length}`);
          console.log(`   Processed: ${processedCount}`);
          console.log(
            `   Added: ${this.events.length} (limit: ${this.MAX_EVENTS})`
          );
          console.log(`   Skipped (no date): ${skippedCount}`);
          console.log(`   Duplicates: ${duplicateCount}`);
          console.log(
            `✅ Total unique events collected: ${this.events.length}`
          );
        } catch (error) {
          console.error(`❌ Error extracting events:`, error);
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
        "https://www.eventbrite.com/d/dc--washington/all-events/",
      ]);
      console.log(`🎉 Total events found: ${this.events.length}`);
      return this.events;
    } catch (error) {
      console.error("❌ Crawler failed:", error);
      return [];
    }
  }

  async saveEvents(events: EventbriteEvent[]): Promise<void> {
    console.log(
      `\n💾 Saving ${events.length} events using Step Functions normalization...`
    );

    if (events.length === 0) {
      console.log("⚠️ No events to save, skipping save step");
      return;
    }

    try {
      const config = {};
      const client = new SFNClient(config);

      const executionName = `eventbrite-crawler-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      console.log(`📤 Creating Step Functions execution: ${executionName}`);
      console.log(
        `   State Machine ARN: ${Resource.normaizeEventStepFunction.arn}`
      );
      console.log(`   Event count: ${events.length}`);
      console.log(`   Source: eventbrite`);
      console.log(`   Event Type: eventbrite`);

      const inputObject = {
        stateMachineArn: Resource.normaizeEventStepFunction.arn,
        input: JSON.stringify({
          events: events,
          source: "eventbrite",
          eventType: "eventbrite",
        }),
        name: executionName,
      };

      const command = new StartExecutionCommand(inputObject);
      const response = await client.send(command);

      console.log("✅ Step Functions execution started successfully");
      console.log(`   Execution ARN: ${response.executionArn}`);
      console.log(`   Start Date: ${response.startDate}`);
      console.log(
        `✅ Successfully started normalization workflow for ${events.length} events`
      );
    } catch (error) {
      console.error(`❌ Error saving events via Step Functions:`, error);
      if (error instanceof Error) {
        console.error(`   Error message: ${error.message}`);
        console.error(`   Error stack: ${error.stack}`);
      }
      throw error;
    }
  }

  async run(): Promise<void> {
    console.log("🚀 Starting Eventbrite Crawler...");
    const startTime = Date.now();

    try {
      const events = await this.crawlEvents();
      const crawlTime = Date.now() - startTime;

      if (events.length > 0) {
        console.log("\n" + "=".repeat(80));
        console.log("📊 FINAL SUMMARY OF PARSED EVENTS");
        console.log("=".repeat(80));
        console.log(
          `✅ Successfully parsed ${events.length} events from Eventbrite`
        );
        console.log(`⏱️  Crawl time: ${(crawlTime / 1000).toFixed(2)} seconds`);
        console.log("\n📋 Event Details:");
        events.forEach((event, index) => {
          console.log(`\n${index + 1}. ${event.title}`);
          console.log(`   Date: ${event.date}`);
          if (event.time) console.log(`   Time: ${event.time}`);
          if (event.venue) console.log(`   Venue: ${event.venue}`);
          if (event.location) console.log(`   Location: ${event.location}`);
          if (event.price) console.log(`   Price: ${event.price}`);
          if (event.url) console.log(`   URL: ${event.url}`);
        });
        console.log("\n" + "=".repeat(80));

        const saveStartTime = Date.now();
        await this.saveEvents(events);
        const saveTime = Date.now() - saveStartTime;
        console.log(`⏱️  Save time: ${(saveTime / 1000).toFixed(2)} seconds`);

        const totalTime = Date.now() - startTime;
        console.log(`\n✅ Eventbrite crawler completed successfully!`);
        console.log(
          `⏱️  Total execution time: ${(totalTime / 1000).toFixed(2)} seconds`
        );
      } else {
        console.log("\n⚠️ No events found to save");
        console.log(
          `⏱️  Total execution time: ${(
            (Date.now() - startTime) /
            1000
          ).toFixed(2)} seconds`
        );
      }
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error("\n❌ Eventbrite crawler failed:");
      console.error(
        `   Error: ${error instanceof Error ? error.message : String(error)}`
      );
      if (error instanceof Error && error.stack) {
        console.error(`   Stack: ${error.stack}`);
      }
      console.error(
        `⏱️  Execution time before failure: ${(totalTime / 1000).toFixed(
          2
        )} seconds`
      );
      throw error;
    }
  }
}

// Main execution
async function main() {
  console.log("🎬 Starting Eventbrite Crawler...");

  const crawler = new EventbriteCrawler();

  try {
    await crawler.run();
    console.log("🎉 Eventbrite Crawler completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("💥 Eventbrite Crawler failed:", error);
    process.exit(1);
  }
}

// Run the crawler
main();
