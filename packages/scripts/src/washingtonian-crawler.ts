import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import puppeteer, { Browser } from "puppeteer";
import { Resource } from "sst";

interface WashingtonianEvent {
  title: string;
  date?: string;
  time?: string;
  location?: string;
  description?: string;
  url?: string;
  category?: string;
  price?: string;
}

class WashingtonianCrawler {
  private client: DynamoDBClient;

  constructor() {
    this.client = new DynamoDBClient({
      region: process.env.AWS_REGION || "us-east-1",
    });
  }

  async crawlEventsForDate(
    startDateISO: string
  ): Promise<WashingtonianEvent[]> {
    console.log("🕷️ Starting Washingtonian event crawl with Puppeteer...");

    let browser: Browser | null = null;

    try {
      // Launch Puppeteer browser
      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
        ],
      });

      const page = await browser.newPage();

      // Set user agent
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      );

      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });

      const baseUrl = "https://www.washingtonian.com/calendar-2/#/show";
      const url = `${baseUrl}?start=${encodeURIComponent(
        startDateISO
      )}&distance=15`;

      console.log(`🌐 Navigating to: ${url}`);

      // Navigate to the page and wait for it to load
      console.log("🌐 Navigating to page...");
      try {
        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        console.log("✅ Page loaded successfully");
      } catch (error) {
        console.log("⚠️ Navigation error, trying alternative approach:", error);
        // Try with different wait condition
        await page.goto(url, {
          waitUntil: "load",
          timeout: 30000,
        });
      }

      // Wait for page to be fully ready
      console.log("⏳ Waiting for page to be ready...");
      await page.waitForFunction(
        () => {
          return document.readyState === "complete";
        },
        { timeout: 10000 }
      );

      // Wait a bit more for JavaScript to render
      console.log("⏳ Waiting for JavaScript to render...");
      await page.waitForTimeout(5000);

      // Check if page is still accessible
      try {
        const pageTitle = await page.title();
        console.log(`📄 Page title: ${pageTitle}`);
      } catch (error) {
        console.log("⚠️ Page not accessible, trying to recover...");
        // Try to reload the page
        await page.reload({ waitUntil: "domcontentloaded", timeout: 15000 });
        await page.waitForTimeout(3000);
      }

      // Wait for events to load (look for csEventInfo elements)
      console.log("⏳ Waiting for events to load...");
      try {
        await page.waitForSelector(".csEventInfo", { timeout: 15000 });
        console.log("✅ Found csEventInfo elements");
      } catch (error) {
        console.log("⚠️ No csEventInfo elements found, continuing anyway...");
        // Try to find any event-related elements
        try {
          const hasEvents = await page.evaluate(() => {
            return (
              document.querySelectorAll(
                '[class*="event"], [class*="Event"], [class*="cs"]'
              ).length > 0
            );
          });
          console.log(
            `🔍 Found ${hasEvents ? "some" : "no"} event-related elements`
          );
        } catch (evalError) {
          console.log("⚠️ Could not evaluate page content:", evalError);
        }
      }

      // Try to extract events directly from the page using Puppeteer
      console.log("🔍 Extracting events directly from page...");
      let extractedEvents: any[] = [];

      try {
        extractedEvents = await page.evaluate(() => {
          const events: any[] = [];

          // Look for csEventInfo elements
          const eventElements = document.querySelectorAll(".csEventInfo");
          console.log(`Found ${eventElements.length} event elements`);

          eventElements.forEach((element, index) => {
            try {
              // Extract title
              const titleElement = element.querySelector(".csOneLine span");
              const title = titleElement
                ? titleElement.textContent?.trim()
                : "";

              // Extract venue
              const venueElement = element.querySelector(".cityVenue span");
              const venue = venueElement
                ? venueElement.textContent?.trim()
                : "";

              // Extract location (after pipe)
              const locationElements =
                element.querySelectorAll(".cityVenue span");
              let location = "";
              if (locationElements.length > 2) {
                location = locationElements[2].textContent?.trim() || "";
              }

              // Extract time
              const timeElement = element.querySelector(".csIconRow span");
              const time = timeElement ? timeElement.textContent?.trim() : "";

              // Extract distance
              const distanceElement = element.querySelector(".csIconInfo span");
              const distance = distanceElement
                ? distanceElement.textContent?.trim()
                : "";

              // Extract details URL (anchor within the event container)
              let url: string | undefined = undefined;
              // Prefer the wrapping anchor (the event card is often wrapped by <a ...>)
              let anchor =
                (element.closest("a[href]") as HTMLAnchorElement | null) ||
                (element.querySelector("a[href]") as HTMLAnchorElement | null);
              if (anchor) {
                const href = anchor.getAttribute("href") || "";
                try {
                  url = new URL(href, window.location.href).toString();
                } catch (_) {
                  url = anchor.href || href || undefined;
                }
              }

              if (title) {
                events.push({
                  title,
                  venue,
                  location,
                  time,
                  distance,
                  url,
                  fullLocation:
                    venue && location
                      ? `${venue}, ${location}`
                      : venue || location,
                });
              }
            } catch (e) {
              console.log(`Error extracting event ${index}:`, e);
            }
          });

          return events;
        });

        console.log(
          `🎯 Extracted ${extractedEvents.length} events directly from page`
        );
        if (extractedEvents.length > 0) {
          console.log("📋 Sample event:", extractedEvents[0]);
        }
      } catch (error) {
        console.log("⚠️ Error extracting events from page:", error);
        extractedEvents = [];
      }

      // Get the HTML content after JavaScript has rendered
      let html = "";
      try {
        html = await page.content();
        console.log("📄 Got HTML content, length:", html.length);

        // Log first 1000 characters to see what we're working with
        console.log("📄 First 1000 characters:", html.substring(0, 1000));
      } catch (error) {
        console.log("⚠️ Could not get page content:", error);
        html = "";
      }

      // Since this appears to be a SPA, we might need to look for:
      // 1. Initial data in script tags
      // 2. API endpoints that load the data
      // 3. Or use a headless browser approach

      // Convert extracted events to WashingtonianEvent format
      let events: WashingtonianEvent[] = [];

      if (extractedEvents.length > 0) {
        console.log(
          "🎯 Converting extracted events to WashingtonianEvent format..."
        );

        for (const extractedEvent of extractedEvents) {
          const event: WashingtonianEvent = {
            title: extractedEvent.title,
            date: startDateISO,
            time: extractedEvent.time || undefined,
            location: extractedEvent.fullLocation || undefined,
            description: extractedEvent.distance
              ? `Distance: ${extractedEvent.distance}`
              : undefined,
            url: extractedEvent.url || undefined,
            category: undefined, // Not available in this structure
            price: undefined, // Not available in this structure
          };

          events.push(event);
          console.log("✅ Converted event:", event.title);
        }
      } else {
        // Fallback to HTML parsing if direct extraction didn't work
        console.log("🔄 Fallback: Parsing HTML content...");

        const eventMatches = html.match(
          /<div[^>]*class="[^"]*csEventInfo[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
        );

        if (eventMatches) {
          console.log(
            "🎯 Found csEventInfo elements in HTML:",
            eventMatches.length
          );

          for (const eventHtml of eventMatches) {
            try {
              const event = this.parseEventHTML(eventHtml);
              if (event) {
                // Ensure a date is set based on the crawled day
                if (!event.date) event.date = startDateISO;
                events.push(event);
                console.log("✅ Parsed event from HTML:", event.title);
              }
            } catch (e) {
              console.log("⚠️ Error parsing event HTML:", e);
            }
          }
        } else {
          // Last resort: try to find any text that looks like event titles
          console.log(
            "🔄 Last resort: Looking for event-like text patterns..."
          );
          const titleMatches = html.match(
            /<span[^>]*>([^<]{10,100})<\/span>/gi
          );
          if (titleMatches) {
            console.log(
              `🔍 Found ${titleMatches.length} potential event titles`
            );
            // Take first few as sample events
            const sampleTitles = titleMatches.slice(0, 5);
            for (const titleMatch of sampleTitles) {
              const title = titleMatch.replace(/<[^>]*>/g, "").trim();
              if (title && title.length > 10) {
                events.push({
                  title,
                  date: startDateISO,
                  time: undefined,
                  location: undefined,
                  description: "Extracted from HTML fallback",
                  url: undefined,
                  category: undefined,
                  price: undefined,
                });
                console.log("✅ Added fallback event:", title);
              }
            }
          }
        }
      }

      // Also look for csRand CSS classes as fallback
      const csRandMatches = html.match(/csRand\d+/g);
      if (csRandMatches && events.length === 0) {
        console.log("🎯 Found csRand CSS classes:", csRandMatches);

        // Look for elements with csRand classes that might contain event data
        for (const csRandClass of csRandMatches) {
          const classRegex = new RegExp(
            `class="[^"]*${csRandClass}[^"]*"`,
            "gi"
          );
          const classMatches = html.match(classRegex);
          if (classMatches) {
            console.log(
              `📊 Found elements with ${csRandClass} class:`,
              classMatches
            );

            // Look for data attributes or content within these elements
            const elementRegex = new RegExp(
              `<[^>]*class="[^"]*${csRandClass}[^"]*"[^>]*>([\\s\\S]*?)<\\/[^>]*>`,
              "gi"
            );
            const elementMatches = html.match(elementRegex);
            if (elementMatches) {
              console.log(
                `📋 Found content in ${csRandClass} elements:`,
                elementMatches
              );

              // Try to extract event data from the content
              for (const element of elementMatches) {
                try {
                  // Look for JSON data in data attributes
                  const dataAttrMatch = element.match(/data-[^=]*="([^"]+)"/gi);
                  if (dataAttrMatch) {
                    console.log(
                      `🔍 Found data attributes in ${csRandClass}:`,
                      dataAttrMatch
                    );

                    for (const attr of dataAttrMatch) {
                      const valueMatch = attr.match(/="([^"]+)"/);
                      if (valueMatch) {
                        try {
                          const parsed = JSON.parse(valueMatch[1]);
                          console.log(`✅ Parsed data attribute:`, parsed);

                          if (parsed && typeof parsed === "object") {
                            if (Array.isArray(parsed)) {
                              events.push(
                                ...this.parseEventArray(parsed, csRandClass)
                              );
                            } else if (
                              parsed.events ||
                              parsed.calendar ||
                              parsed.eventData
                            ) {
                              events.push(
                                ...this.parseEventObject(parsed, csRandClass)
                              );
                            }
                          }
                        } catch (e) {
                          console.log(
                            `⚠️ Could not parse data attribute as JSON`
                          );
                        }
                      }
                    }
                  }

                  // Also look for text content that might be JSON
                  const textContent = element.replace(/<[^>]*>/g, "").trim();
                  if (
                    textContent &&
                    textContent.startsWith("{") &&
                    textContent.endsWith("}")
                  ) {
                    try {
                      const parsed = JSON.parse(textContent);
                      console.log(
                        `✅ Parsed text content from ${csRandClass}:`,
                        parsed
                      );

                      if (parsed && typeof parsed === "object") {
                        if (Array.isArray(parsed)) {
                          events.push(
                            ...this.parseEventArray(parsed, csRandClass)
                          );
                        } else if (
                          parsed.events ||
                          parsed.calendar ||
                          parsed.eventData
                        ) {
                          events.push(
                            ...this.parseEventObject(parsed, csRandClass)
                          );
                        }
                      }
                    } catch (e) {
                      console.log(`⚠️ Could not parse text content as JSON`);
                    }
                  }
                } catch (e) {
                  console.log(`⚠️ Error processing ${csRandClass} element`);
                }
              }
            }
          }
        }
      }

      // Also look for script tags with event data
      const scriptMatches = html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
      if (scriptMatches) {
        console.log("🔍 Found script tags, searching for event data...");

        for (const script of scriptMatches) {
          const content = script.replace(/<\/?script[^>]*>/gi, "");

          // Look for JavaScript variable assignments that might contain event data
          this.parseJavaScriptVariables(content, events);

          // Look for JSON data embedded in JavaScript
          this.parseEmbeddedJSON(content, events);

          // Look for API calls or data fetching
          this.parseAPICalls(content, events);

          // Look for React/Vue component data

          this.parseComponentData(content, events);
        }
      }

      // Final guard: backfill date if missing
      events = events.map((e) => ({ ...e, date: e.date || startDateISO }));

      console.log(`🎉 Parsed ${events.length} events from Washingtonian`);
      return events;
    } catch (error) {
      console.error("❌ Error crawling Washingtonian:", error);
      throw error;
    } finally {
      // Always close the browser
      if (browser) {
        await browser.close();
        console.log("🔒 Browser closed");
      }
    }
  }

  private parseEventHTML(eventHtml: string): WashingtonianEvent | null {
    try {
      // Extract title from csOneLine span
      const titleMatch = eventHtml.match(
        /<div[^>]*class="[^"]*csOneLine[^"]*"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/i
      );
      const title = titleMatch ? titleMatch[1].trim() : "";

      // Extract venue from cityVenue div
      const venueMatch = eventHtml.match(
        /<div[^>]*class="[^"]*cityVenue[^"]*"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>/i
      );
      const venue = venueMatch ? venueMatch[1].trim() : "";

      // Extract location (city, state) from cityVenue - look for the part after the pipe
      const locationMatch = eventHtml.match(
        /<div[^>]*class="[^"]*cityVenue[^"]*"[^>]*>[\s\S]*?\|[\s\S]*?<span[^>]*>([^<]+)<\/span>/i
      );
      const location = locationMatch ? locationMatch[1].trim() : "";

      // Extract time from clock icon - look for the text after the clock SVG
      const timeMatch = eventHtml.match(
        /<svg[^>]*class="[^"]*csSvgIco[^"]*"[^>]*>[\s\S]*?<\/svg>\s*([^<]+)/i
      );
      const time = timeMatch ? timeMatch[1].trim() : "";

      // Extract distance from location icon - look for "X.X mi" pattern
      const distanceMatch = eventHtml.match(/(\d+\.?\d*)\s*mi/i);
      const distance = distanceMatch ? distanceMatch[1].trim() : "";

      // Build location string
      let fullLocation = "";
      if (venue && location) {
        fullLocation = `${venue}, ${location}`;
      } else if (venue) {
        fullLocation = venue;
      } else if (location) {
        fullLocation = location;
      }

      // Build description
      let description = "";
      if (distance) {
        description = `Distance: ${distance} miles`;
      }

      if (!title) {
        console.log("⚠️ No title found in event HTML");
        return null;
      }

      // Extract URL from an anchor near the event block (if present)
      const urlMatch = eventHtml.match(/<a[^>]*href="([^"]+)"[^>]*>/i);
      const url = urlMatch ? urlMatch[1] : undefined;

      const event: WashingtonianEvent = {
        title,
        date: undefined, // Date not visible in this HTML structure
        time: time || undefined,
        location: fullLocation || undefined,
        description: description || undefined,
        url,
        category: undefined, // Not available in this HTML structure
        price: undefined, // Not available in this HTML structure
      };

      console.log(
        `📋 Parsed event: ${event.title} at ${event.location} at ${event.time}`
      );
      return event;
    } catch (error) {
      console.log("⚠️ Error parsing event HTML:", error);
      return null;
    }
  }

  private parseJavaScriptVariables(
    content: string,
    events: WashingtonianEvent[]
  ): void {
    console.log("🔍 Parsing JavaScript variables...");

    // Look for variable assignments like: var events = [...], let data = {...}, const calendar = {...}
    const variablePatterns = [
      /(?:var|let|const)\s+(\w*events?\w*)\s*=\s*(\[[\s\S]*?\]|\{[\s\S]*?\});/gi,
      /(?:var|let|const)\s+(\w*calendar\w*)\s*=\s*(\[[\s\S]*?\]|\{[\s\S]*?\});/gi,
      /(?:var|let|const)\s+(\w*data\w*)\s*=\s*(\[[\s\S]*?\]|\{[\s\S]*?\});/gi,
      /window\.(\w*events?\w*)\s*=\s*(\[[\s\S]*?\]|\{[\s\S]*?\});/gi,
    ];

    for (const pattern of variablePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        console.log("📊 Found JavaScript variable assignments:", matches);

        for (const match of matches) {
          try {
            // Extract the value part
            const valueMatch = match.match(/=\s*(\[[\s\S]*?\]|\{[\s\S]*?\});/);
            if (valueMatch) {
              const value = valueMatch[1];
              const parsed = JSON.parse(value);
              console.log("✅ Parsed JavaScript variable:", parsed);

              if (parsed && typeof parsed === "object") {
                if (Array.isArray(parsed)) {
                  events.push(...this.parseEventArray(parsed, "js-variable"));
                } else if (
                  parsed.events ||
                  parsed.calendar ||
                  parsed.eventData
                ) {
                  events.push(...this.parseEventObject(parsed, "js-variable"));
                }
              }
            }
          } catch (e) {
            console.log("⚠️ Could not parse JavaScript variable as JSON");
          }
        }
      }
    }
  }

  private parseEmbeddedJSON(
    content: string,
    events: WashingtonianEvent[]
  ): void {
    console.log("🔍 Parsing embedded JSON...");

    // Look for JSON.parse() calls
    const jsonParseMatches = content.match(
      /JSON\.parse\(['"`]([^'"`]+)['"`]\)/gi
    );
    if (jsonParseMatches) {
      console.log("📊 Found JSON.parse calls:", jsonParseMatches);

      for (const match of jsonParseMatches) {
        try {
          const jsonMatch = match.match(/JSON\.parse\(['"`]([^'"`]+)['"`]\)/);
          if (jsonMatch) {
            const jsonString = jsonMatch[1];
            const parsed = JSON.parse(jsonString);
            console.log("✅ Parsed JSON.parse data:", parsed);

            if (parsed && typeof parsed === "object") {
              if (Array.isArray(parsed)) {
                events.push(...this.parseEventArray(parsed, "json-parse"));
              } else if (parsed.events || parsed.calendar || parsed.eventData) {
                events.push(...this.parseEventObject(parsed, "json-parse"));
              }
            }
          }
        } catch (e) {
          console.log("⚠️ Could not parse JSON.parse data");
        }
      }
    }

    // Look for JSON strings in quotes
    const jsonStringMatches = content.match(
      /['"`]\{[\s\S]*?"events"[\s\S]*?\}['"`]/gi
    );
    if (jsonStringMatches) {
      console.log("📊 Found JSON strings:", jsonStringMatches);

      for (const match of jsonStringMatches) {
        try {
          const jsonString = match.replace(/['"`]/g, "");
          const parsed = JSON.parse(jsonString);
          console.log("✅ Parsed JSON string:", parsed);

          if (parsed && typeof parsed === "object") {
            if (Array.isArray(parsed)) {
              events.push(...this.parseEventArray(parsed, "json-string"));
            } else if (parsed.events || parsed.calendar || parsed.eventData) {
              events.push(...this.parseEventObject(parsed, "json-string"));
            }
          }
        } catch (e) {
          console.log("⚠️ Could not parse JSON string");
        }
      }
    }
  }

  private parseAPICalls(content: string, events: WashingtonianEvent[]): void {
    console.log("🔍 Parsing API calls...");

    // Look for fetch, axios, or XMLHttpRequest calls
    const apiPatterns = [
      /fetch\(['"`]([^'"`]+)['"`]\)/gi,
      /axios\.(?:get|post)\(['"`]([^'"`]+)['"`]\)/gi,
      /\.get\(['"`]([^'"`]+)['"`]\)/gi,
    ];

    for (const pattern of apiPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        console.log("📊 Found API calls:", matches);

        for (const match of matches) {
          const urlMatch = match.match(/['"`]([^'"`]+)['"`]/);
          if (urlMatch) {
            const url = urlMatch[1];
            console.log(`🌐 Found API endpoint: ${url}`);

            // Check if it looks like an events API
            if (
              url.includes("event") ||
              url.includes("calendar") ||
              url.includes("api")
            ) {
              console.log(`🎯 Potential events API: ${url}`);
            }
          }
        }
      }
    }
  }

  private parseComponentData(
    content: string,
    events: WashingtonianEvent[]
  ): void {
    console.log("🔍 Parsing component data...");

    // Look for React/Vue component data
    const componentPatterns = [
      /React\.createElement\(['"`](\w+)['"`],\s*\{([^}]+)\}/gi,
      /<(\w+)\s+[^>]*data-[^=]*="([^"]+)"[^>]*>/gi,
    ];

    for (const pattern of componentPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        console.log("📊 Found component data:", matches);

        for (const match of matches) {
          try {
            // Extract data attributes
            const dataMatch = match.match(/data-[^=]*="([^"]+)"/);
            if (dataMatch) {
              const dataString = dataMatch[1];
              const parsed = JSON.parse(dataString);
              console.log("✅ Parsed component data:", parsed);

              if (parsed && typeof parsed === "object") {
                if (Array.isArray(parsed)) {
                  events.push(
                    ...this.parseEventArray(parsed, "component-data")
                  );
                } else if (
                  parsed.events ||
                  parsed.calendar ||
                  parsed.eventData
                ) {
                  events.push(
                    ...this.parseEventObject(parsed, "component-data")
                  );
                }
              }
            }
          } catch (e) {
            console.log("⚠️ Could not parse component data");
          }
        }
      }
    }
  }

  private parseEventArray(data: any[], source: string): WashingtonianEvent[] {
    const events: WashingtonianEvent[] = [];

    for (const item of data) {
      if (item && typeof item === "object") {
        const event = this.parseEventObject(item, source);
        events.push(...event);
      }
    }

    return events;
  }

  private parseEventObject(data: any, source: string): WashingtonianEvent[] {
    const events: WashingtonianEvent[] = [];

    // Handle different possible structures
    if (data.events && Array.isArray(data.events)) {
      // Data has an events array
      for (const event of data.events) {
        events.push(this.mapToWashingtonianEvent(event, source));
      }
    } else if (data.calendar && Array.isArray(data.calendar)) {
      // Data has a calendar array
      for (const event of data.calendar) {
        events.push(this.mapToWashingtonianEvent(event, source));
      }
    } else if (data.eventData && Array.isArray(data.eventData)) {
      // Data has an eventData array
      for (const event of data.eventData) {
        events.push(this.mapToWashingtonianEvent(event, source));
      }
    } else if (data.title || data.name) {
      // Single event object
      events.push(this.mapToWashingtonianEvent(data, source));
    }

    return events;
  }

  private mapToWashingtonianEvent(
    data: any,
    source: string
  ): WashingtonianEvent {
    return {
      title: data.title || data.name || data.eventTitle || "Untitled Event",
      date: data.date || data.eventDate || data.startDate || data.start_date,
      time: data.time || data.eventTime || data.startTime,
      location: data.location || data.venue || data.address || data.place,
      description: data.description || data.summary || data.details,
      url: data.url || data.link || data.eventUrl,
      category: data.category || data.type || data.eventType,
      price: data.price || data.cost || data.ticketPrice || data.fee,
    };
  }

  async saveEvents(events: WashingtonianEvent[]): Promise<void> {
    console.log(`💾 Saving ${events.length} events to DynamoDB...`);

    for (const event of events) {
      try {
        const item: Record<string, any> = {
          pk: { S: `EVENT#WASHINGTONIAN#${Date.now()}` },
          sk: { S: "EVENT_INFO" },
          title: { S: event.title },
          source: { S: "washingtonian" },
          createdAt: { N: Date.now().toString() },
          isPublic: { S: "true" },
        };
        if (event.date) {
          item.eventDate = { S: event.date };
          item.start_date = { S: event.date }; // for calendar compatibility
        }
        if (event.time) {
          item.time = { S: event.time };
          item.start_time = { S: event.time }; // for calendar compatibility
        }
        if (event.location) item.location = { S: event.location };
        if (event.description) item.description = { S: event.description };
        if (event.url) item.url = { S: event.url };
        if (event.category) item.category = { S: event.category };
        if (event.price) item.cost = { S: event.price };

        const command = new PutItemCommand({
          TableName: Resource.Db.name,
          Item: item,
        });

        await this.client.send(command);
        console.log(`✅ Saved event: ${event.title}`);
      } catch (error) {
        console.error(`❌ Error saving event ${event.title}:`, error);
      }
    }
  }

  private buildDedupKey(event: WashingtonianEvent): string {
    // Prefer URL; fallback to title+date
    const base = event.url || `${event.title}::${event.date || "unknown"}`;
    return base.trim().toLowerCase();
  }

  async saveEventsDedup(events: WashingtonianEvent[]): Promise<void> {
    console.log(`💾 Saving ${events.length} events with de-duplication...`);

    for (const event of events) {
      try {
        const dedupKey = this.buildDedupKey(event);
        const pk = `EVENT#WASHINGTONIAN#${dedupKey}`;

        const item: Record<string, any> = {
          pk: { S: pk },
          sk: { S: "EVENT_INFO" },
          title: { S: event.title },
          source: { S: "washingtonian" },
          createdAt: { N: Date.now().toString() },
          isPublic: { S: "true" },
        };
        if (event.date) {
          item.eventDate = { S: event.date };
          item.start_date = { S: event.date }; // for calendar compatibility
        }
        if (event.time) {
          item.time = { S: event.time };
          item.start_time = { S: event.time }; // for calendar compatibility
        }
        if (event.location) item.location = { S: event.location };
        if (event.description) item.description = { S: event.description };
        if (event.url) item.url = { S: event.url };
        if (event.category) item.category = { S: event.category };
        if (event.price) item.cost = { S: event.price };

        const command = new PutItemCommand({
          TableName: Resource.Db.name,
          Item: item,
          ConditionExpression: "attribute_not_exists(pk)",
        });

        await this.client.send(command);
        console.log(`✅ Saved event: ${event.title}`);
      } catch (error: any) {
        // ConditionalCheckFailedException indicates duplicate
        if (error?.name === "ConditionalCheckFailedException") {
          console.log(`↩️ Skipped duplicate: ${event.title}`);
        } else {
          console.error(`❌ Error saving event ${event.title}:`, error);
        }
      }
    }
  }

  async run(): Promise<void> {
    try {
      // Loop next 7 days starting today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const allEvents: WashingtonianEvent[] = [];

      for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const startISO = d.toISOString().split("T")[0];
        console.log(`\n📅 Crawling date: ${startISO}`);

        const dayEvents = await this.crawlEventsForDate(startISO);
        // Take first 5 events for the day
        const firstFive = dayEvents.slice(0, 5);
        console.log(
          `🧮 Keeping first ${firstFive.length} events for ${startISO}`
        );
        allEvents.push(...firstFive);
      }

      console.log(`\n🎯 Found ${allEvents.length} events across next 7 days`);
      console.log("📋 Sample:", JSON.stringify(allEvents.slice(0, 3), null, 2));

      // Save with de-duplication
      await this.saveEventsDedup(allEvents);
      console.log("🎯 Washingtonian crawler completed successfully!");
    } catch (error) {
      console.error("💥 Washingtonian crawler failed:", error);
      throw error;
    }
  }
}

// Run the crawler if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const crawler = new WashingtonianCrawler();
  crawler
    .run()
    .then(() => {
      console.log("✅ Crawler finished");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Crawler failed:", error);
      process.exit(1);
    });
}

export { WashingtonianCrawler };
