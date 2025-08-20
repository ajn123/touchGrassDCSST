import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import puppeteer from "puppeteer";
import { Resource } from "sst";

interface EventData {
  title: string;
  description?: string;
  location?: string;
  date?: string;
  start_date?: string;
  end_date?: string;
  category?: string | string[];
  image_url?: string;
  cost?: {
    type: string;
    currency: string;
    amount: string | number;
  };
  socials?: {
    website?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  venue?: string;
  is_public?: boolean;
}

interface CrawlerConfig {
  name: string;
  baseUrl: string;
  eventUrls: string[];
  selectors: {
    eventContainer: string;
    title: string;
    description?: string;
    location?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    category?: string;
    image?: string;
    cost?: string;
    website?: string;
  };
  dateFormats?: string[];
  categoryMapping?: Record<string, string>;
}

class EventCrawler {
  private browser: puppeteer.Browser | null = null;
  private dynamoClient: DynamoDBClient;

  constructor() {
    this.dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION || "us-east-1",
    });
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
      ],
      ignoreDefaultArgs: ["--disable-extensions"],
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async crawlWebsite(config: CrawlerConfig): Promise<EventData[]> {
    if (!this.browser) {
      throw new Error("Browser not initialized. Call init() first.");
    }

    const events: EventData[] = [];
    const page = await this.browser.newPage();

    try {
      for (const eventUrl of config.eventUrls) {
        console.log(`🕷️ Crawling: ${eventUrl}`);

        try {
          await page.goto(eventUrl, {
            waitUntil: "networkidle2",
            timeout: 30000,
          });

          // Wait for content to load
          await page.waitForSelector(config.selectors.eventContainer, {
            timeout: 10000,
          });

          const pageEvents = await this.extractEventsFromPage(page, config);
          events.push(...pageEvents);

          console.log(`✅ Found ${pageEvents.length} events on ${eventUrl}`);

          // Print summary of all events found on this page
          if (pageEvents.length > 0) {
            console.log("\n📊 Summary of Events Found:");
            pageEvents.forEach((event, index) => {
              console.log(
                `  ${index + 1}. ${event.title || "Untitled"} - ${
                  event.date || "No date"
                } - ${event.location || "No location"}`
              );
            });
            console.log(""); // Empty line for readability
          }

          // Be respectful - add delay between requests
          await this.delay(1000);
        } catch (error) {
          console.error(`❌ Error crawling ${eventUrl}:`, error);
        }
      }
    } finally {
      await page.close();
    }

    return events;
  }

  private async extractEventsFromPage(
    page: puppeteer.Page,
    config: CrawlerConfig
  ): Promise<EventData[]> {
    const events: EventData[] = [];

    try {
      const eventElements = await page.$$(config.selectors.eventContainer);

      for (const element of eventElements) {
        try {
          const event = await this.extractEventFromElement(element, config);
          if (event.title) {
            events.push(event);
          }
        } catch (error) {
          console.error("Error extracting event from element:", error);
        }
      }
    } catch (error) {
      console.error("Error extracting events from page:", error);
    }

    return events;
  }

  private async extractEventFromElement(
    element: puppeteer.ElementHandle,
    config: CrawlerConfig
  ): Promise<EventData> {
    const event: EventData = {};

    try {
      // Extract title
      if (config.selectors.title) {
        const titleElement = await element.$(config.selectors.title);
        if (titleElement) {
          event.title = await this.getTextContent(titleElement);
        }
      }

      // Extract description
      if (config.selectors.description) {
        const descElement = await element.$(config.selectors.description);
        if (descElement) {
          event.description = await this.getTextContent(descElement);
        }
      }

      // Extract location
      if (config.selectors.location) {
        const locationElement = await element.$(config.selectors.location);
        if (locationElement) {
          event.location = await this.getTextContent(locationElement);
        }
      }

      // Extract dates
      if (config.selectors.date) {
        const dateElement = await element.$(config.selectors.date);
        if (dateElement) {
          const dateText = await this.getTextContent(dateElement);
          const parsedDate = this.parseDate(dateText, config.dateFormats);
          if (parsedDate) {
            event.date = parsedDate;
            event.start_date = parsedDate.split("T")[0]; // Extract just the date part
          }
        }
      }

      // Extract start and end dates separately if available
      if (config.selectors.startDate) {
        const startDateElement = await element.$(config.selectors.startDate);
        if (startDateElement) {
          const startDateText = await this.getTextContent(startDateElement);
          const parsedStartDate = this.parseDate(
            startDateText,
            config.dateFormats
          );
          if (parsedStartDate) {
            event.start_date = parsedStartDate.split("T")[0];
          }
        }
      }

      if (config.selectors.endDate) {
        const endDateElement = await element.$(config.selectors.endDate);
        if (endDateElement) {
          const endDateText = await this.getTextContent(endDateElement);
          const parsedEndDate = this.parseDate(endDateText, config.dateFormats);
          if (parsedEndDate) {
            event.end_date = parsedEndDate.split("T")[0];
          }
        }
      }

      // Extract category
      if (config.selectors.category) {
        const categoryElement = await element.$(config.selectors.category);
        if (categoryElement) {
          const categoryText = await this.getTextContent(categoryElement);
          event.category = this.mapCategory(
            categoryText,
            config.categoryMapping
          );
        }
      }

      // Extract image
      if (config.selectors.image) {
        const imageElement = await element.$(config.selectors.image);
        if (imageElement) {
          event.image_url = await this.getAttribute(imageElement, "src");
        }
      }

      // Extract cost
      if (config.selectors.cost) {
        const costElement = await element.$(config.selectors.cost);
        if (costElement) {
          const costText = await this.getTextContent(costElement);
          event.cost = this.parseCost(costText);
        }
      }

      // Extract website
      if (config.selectors.website) {
        const websiteElement = await element.$(config.selectors.website);
        if (websiteElement) {
          const websiteUrl = await this.getAttribute(websiteElement, "href");
          if (websiteUrl) {
            event.socials = {
              website: this.resolveUrl(websiteUrl, config.baseUrl),
            };
          }
        }
      }

      // Set defaults
      event.is_public = true;

      // Print the parsed event for debugging
      if (event.title) {
        console.log("\n📅 Parsed Event:");
        console.log("=================");
        console.log(JSON.stringify(event, null, 2));
        console.log("=================");
      }
    } catch (error) {
      console.error("Error extracting event data:", error);
    }

    return event;
  }

  private async getTextContent(
    element: puppeteer.ElementHandle
  ): Promise<string> {
    try {
      return await element.evaluate((el) => el.textContent?.trim() || "");
    } catch {
      return "";
    }
  }

  private async getAttribute(
    element: puppeteer.ElementHandle,
    attribute: string
  ): Promise<string> {
    try {
      return await element.evaluate(
        (el, attr) => el.getAttribute(attr) || "",
        attribute
      );
    } catch {
      return "";
    }
  }

  private parseDate(dateText: string, dateFormats?: string[]): string | null {
    if (!dateText) return null;

    // Common date patterns
    const patterns = [
      // ISO format: 2024-03-15
      /(\d{4}-\d{2}-\d{2})/,
      // US format: March 15, 2024
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i,
      // Short format: Mar 15, 2024
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})/i,
      // Date with time: March 15, 2024 at 7:00 PM
      /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\s+at\s+(\d{1,2}):(\d{2})\s+(AM|PM)/i,
    ];

    for (const pattern of patterns) {
      const match = dateText.match(pattern);
      if (match) {
        try {
          if (pattern.source.includes("at")) {
            // Handle date with time
            const month = match[1];
            const day = match[2];
            const year = match[3];
            const hour = parseInt(match[4]);
            const minute = match[5];
            const ampm = match[6];

            let hour24 = hour;
            if (ampm.toLowerCase() === "pm" && hour !== 12) hour24 += 12;
            if (ampm.toLowerCase() === "am" && hour === 12) hour24 = 0;

            const date = new Date(
              parseInt(year),
              this.getMonthIndex(month),
              parseInt(day),
              hour24,
              parseInt(minute)
            );
            return date.toISOString();
          } else if (pattern.source.includes("January|February|March")) {
            // Handle full month names
            const month = match[1];
            const day = match[2];
            const year = match[3];
            const date = new Date(
              parseInt(year),
              this.getMonthIndex(month),
              parseInt(day)
            );
            return date.toISOString();
          } else if (pattern.source.includes("Jan|Feb|Mar")) {
            // Handle short month names
            const month = match[1];
            const day = match[2];
            const year = match[3];
            const date = new Date(
              parseInt(year),
              this.getMonthIndex(month),
              parseInt(day)
            );
            return date.toISOString();
          } else {
            // ISO format
            return new Date(match[1]).toISOString();
          }
        } catch (error) {
          console.error("Error parsing date:", error);
        }
      }
    }

    return null;
  }

  private getMonthIndex(month: string): number {
    const months = {
      january: 0,
      jan: 0,
      february: 1,
      feb: 1,
      march: 2,
      mar: 2,
      april: 3,
      apr: 3,
      may: 4,
      june: 5,
      jun: 5,
      july: 6,
      jul: 6,
      august: 7,
      aug: 7,
      september: 8,
      sep: 8,
      october: 9,
      oct: 9,
      november: 10,
      nov: 10,
      december: 11,
      dec: 11,
    };
    return months[month.toLowerCase()] || 0;
  }

  private mapCategory(
    categoryText: string,
    categoryMapping?: Record<string, string>
  ): string | string[] {
    if (!categoryText) return "Uncategorized";

    if (categoryMapping) {
      const mapped = categoryMapping[categoryText.toLowerCase()];
      if (mapped) return mapped;
    }

    // Default category mapping
    const defaultMapping: Record<string, string> = {
      concert: "Music",
      music: "Music",
      festival: "Festival",
      food: "Food & Drink",
      drink: "Food & Drink",
      sports: "Sports",
      museum: "Museum",
      art: "Art",
      theater: "Theater",
      comedy: "Comedy",
      trivia: "Trivia",
      "book club": "Book Club",
      workshop: "Workshop",
      conference: "Conference",
      networking: "Networking",
      landmark: "Landmark",
      history: "History",
    };

    const lowerCategory = categoryText.toLowerCase();
    for (const [key, value] of Object.entries(defaultMapping)) {
      if (lowerCategory.includes(key)) {
        return value;
      }
    }

    return categoryText;
  }

  private parseCost(costText: string): {
    type: string;
    currency: string;
    amount: string | number;
  } {
    if (!costText) {
      return { type: "free", currency: "USD", amount: 0 };
    }

    const lowerCost = costText.toLowerCase();

    if (lowerCost.includes("free") || lowerCost.includes("no cost")) {
      return { type: "free", currency: "USD", amount: 0 };
    }

    // Extract dollar amounts
    const dollarMatch = costText.match(/\$(\d+(?:\.\d{2})?)/);
    if (dollarMatch) {
      const amount = parseFloat(dollarMatch[1]);
      return { type: "fixed", currency: "USD", amount };
    }

    // Extract price ranges
    const rangeMatch = costText.match(/\$(\d+)-(\d+)/);
    if (rangeMatch) {
      const min = rangeMatch[1];
      const max = rangeMatch[2];
      return { type: "variable", currency: "USD", amount: `${min}-${max}` };
    }

    return { type: "variable", currency: "USD", amount: costText };
  }

  private resolveUrl(url: string, baseUrl: string): string {
    if (url.startsWith("http")) {
      return url;
    }
    if (url.startsWith("/")) {
      return new URL(url, baseUrl).href;
    }
    return new URL(url, baseUrl).href;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async saveEventsToDynamo(events: EventData[]): Promise<void> {
    console.log(`💾 Saving ${events.length} events to DynamoDB...`);

    for (const event of events) {
      try {
        if (!event.title) continue;

        const eventId = `EVENT#${event.title
          .replace(/\s+/g, "-")
          .toLowerCase()}-${Date.now()}`;
        const timestamp = Date.now();

        const item = {
          pk: eventId,
          sk: eventId,
          ...event,
          createdAt: timestamp,
          updatedAt: timestamp,
          is_public: event.is_public ?? true,
        };

        // Add titlePrefix for efficient searches
        if (event.title) {
          const titlePrefix = event.title.trim().toLowerCase().substring(0, 3);
          if (titlePrefix.length > 0) {
            item.titlePrefix = titlePrefix;
          }
        }

        const command = new PutItemCommand({
          TableName: Resource.Db.name,
          Item: marshall(item),
        });

        await this.dynamoClient.send(command);
        console.log(`✅ Saved event: ${event.title}`);

        // Print the saved event details
        console.log("💾 Event saved to DynamoDB:");
        console.log(`   Title: ${event.title}`);
        console.log(`   Date: ${event.date || event.start_date || "No date"}`);
        console.log(`   Location: ${event.location || "No location"}`);
        console.log(
          `   Category: ${
            Array.isArray(event.category)
              ? event.category.join(", ")
              : event.category || "No category"
          }`
        );
        console.log(
          `   Cost: ${
            event.cost
              ? `${event.cost.type} - ${event.cost.amount}`
              : "Not specified"
          }`
        );
        console.log(""); // Empty line for readability

        // Add delay between saves to avoid throttling
        await this.delay(100);
      } catch (error) {
        console.error(`❌ Error saving event ${event.title}:`, error);
      }
    }
  }
}

// Predefined crawler configurations for popular DC event websites
const crawlerConfigs: CrawlerConfig[] = [
  {
    name: "Eventbrite DC",
    baseUrl: "https://www.eventbrite.com",
    eventUrls: [
      "https://www.eventbrite.com/d/united-states--washington-dc/events/",
      "https://www.eventbrite.com/d/united-states--washington-dc/free-events/",
    ],
    selectors: {
      eventContainer: '[data-testid="event-card"]',
      title: '[data-testid="event-card-title"]',
      description: '[data-testid="event-card-description"]',
      location: '[data-testid="event-card-location"]',
      date: '[data-testid="event-card-date"]',
      category: '[data-testid="event-card-category"]',
      image: "img",
      cost: '[data-testid="event-card-price"]',
      website: 'a[href*="/e/"]',
    },
    dateFormats: ["MMM DD, YYYY", "MMM DD", "YYYY-MM-DD"],
  },
  {
    name: "Meetup DC",
    baseUrl: "https://www.meetup.com",
    eventUrls: [
      "https://www.meetup.com/find/?location=us--dc--washington&source=EVENTS",
    ],
    selectors: {
      eventContainer: '[data-testid="event-card"]',
      title: "h3",
      description: '[data-testid="event-card-description"]',
      location: '[data-testid="event-card-location"]',
      date: "time",
      category: '[data-testid="event-card-category"]',
      image: "img",
      website: 'a[href*="/events/"]',
    },
    dateFormats: ["MMM DD, YYYY", "MMM DD"],
  },
  {
    name: "DCist Events",
    baseUrl: "https://dcist.com",
    eventUrls: ["https://dcist.com/events/"],
    selectors: {
      eventContainer: ".event-item",
      title: "h2",
      description: ".event-description",
      location: ".event-location",
      date: ".event-date",
      category: ".event-category",
      image: "img",
      website: "a",
    },
    dateFormats: ["MMM DD, YYYY", "MMM DD"],
  },
];

async function main() {
  const crawler = new EventCrawler();

  try {
    console.log("🚀 Starting event crawler...");
    await crawler.init();

    for (const config of crawlerConfigs) {
      console.log(`\n🕷️ Crawling ${config.name}...`);
      const events = await crawler.crawlWebsite(config);

      if (events.length > 0) {
        console.log(`📊 Found ${events.length} events from ${config.name}`);
        await crawler.saveEventsToDynamo(events);
      }
    }

    console.log("\n✅ Event crawling completed!");
  } catch (error) {
    console.error("❌ Error during crawling:", error);
  } finally {
    await crawler.close();
  }
}

// Run the crawler if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { CrawlerConfig, EventCrawler, EventData };
