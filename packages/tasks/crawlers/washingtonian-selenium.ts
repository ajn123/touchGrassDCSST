import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { Builder, By, until, WebDriver, WebElement } from "selenium-webdriver";
import { Options as FirefoxOptions } from "selenium-webdriver/firefox.js";
import { Resource } from "sst";

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
  distance?: string;

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
    distance?: string
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
    this.distance = distance;
  }
}

class WashingtonianSeleniumCrawler {
  private client: DynamoDBClient;
  private driver: WebDriver | null = null;

  constructor() {
    this.client = new DynamoDBClient({
      region: process.env.AWS_REGION || "us-east-1",
    });
  }

  async createDriver(): Promise<WebDriver> {
    console.log("🚀 Creating Selenium WebDriver for Docker with Firefox...");

    const options = new FirefoxOptions();

    // Docker-specific Firefox configuration
    options.addArguments("--headless");
    options.addArguments("--width=1920");
    options.addArguments("--height=1080");

    const driver = await new Builder()
      .forBrowser("firefox")
      .setFirefoxOptions(options)
      .build();

    // Set timeouts for Docker environment
    driver.manage().setTimeouts({
      implicit: 10000,
      pageLoad: 60000,
      script: 30000,
    });

    return driver;
  }

  async crawlEvents(): Promise<WashingtonianEvent[]> {
    console.log("🕷️ Starting Washingtonian event crawl with Selenium...");

    const maxRetries = 2; // Retry limit for Docker environment
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`🔄 Attempt ${attempt}/${maxRetries}`);

      try {
        this.driver = await this.createDriver();

        const url =
          "https://www.washingtonian.com/calendar-2/#/show?start=2025-10-15&distance=15";
        console.log(`🌐 Navigating to: ${url}`);

        await this.driver.get(url);
        console.log("✅ Page loaded successfully");

        // Wait for the page to be ready and JavaScript to execute
        console.log("⏳ Waiting for page to be ready...");
        await this.driver.wait(until.titleContains("Washingtonian"), 30000);

        // Additional wait for JavaScript to fully execute
        console.log("⏳ Waiting for JavaScript to execute...");
        await this.driver.sleep(10000); // Give JS more time to run

        // Wait for any network activity to settle
        console.log("⏳ Waiting for network activity to settle...");
        await this.driver.sleep(5000);

        // Test JavaScript execution
        await this.testJavaScriptExecution();

        // Wait for events to load
        console.log("⏳ Waiting for events to load...");
        try {
          await this.driver.wait(
            until.elementsLocated(By.css('a[href*="#/details/"]')),
            10000
          );
          console.log("✅ Found event links");
        } catch (error) {
          console.log(
            "⚠️ No event links found, trying alternative selectors..."
          );

          // Try to wait for any event-related elements
          try {
            await this.driver.wait(
              until.elementsLocated(By.css(".csEventInfo")),
              5000
            );
            console.log("✅ Found csEventInfo elements");
          } catch (error2) {
            console.log("⚠️ No csEventInfo elements found either...");
          }
        }

        // Extract events using the detailed structure
        const events = await this.extractEventsFromPage();

        console.log(`🎉 Parsed ${events.length} events from Washingtonian`);
        return events;
      } catch (error) {
        console.error(
          `❌ Error crawling Washingtonian (attempt ${attempt}):`,
          error
        );
        lastError = error as Error;

        // Close driver on error
        if (this.driver) {
          try {
            await this.driver.quit();
            this.driver = null;
          } catch (closeError) {
            console.log("⚠️ Error closing driver:", closeError);
          }
        }

        // Wait before retrying
        if (attempt < maxRetries) {
          const waitTime = 2000; // 2 seconds for Docker
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }

    throw (
      lastError || new Error("Failed to crawl Washingtonian after all retries")
    );
  }

  private async testJavaScriptExecution(): Promise<void> {
    if (!this.driver) {
      console.log("Driver not available for JavaScript testing");
      return;
    }

    try {
      console.log("🧪 Testing JavaScript execution...");

      // Execute a simple JavaScript test
      const jsTest = await this.driver.executeScript(
        "return document.readyState;"
      );
      console.log(`📊 Document ready state: ${jsTest}`);

      // Check if jQuery is available (common on many sites)
      const jqueryTest = await this.driver.executeScript(
        "return typeof $ !== 'undefined';"
      );
      console.log(`📊 jQuery available: ${jqueryTest}`);

      // Check for any global variables that might indicate a framework
      const reactTest = await this.driver.executeScript(
        "return typeof React !== 'undefined';"
      );
      console.log(`📊 React available: ${reactTest}`);

      const vueTest = await this.driver.executeScript(
        "return typeof Vue !== 'undefined';"
      );
      console.log(`📊 Vue available: ${vueTest}`);

      // Check for any calendar-related JavaScript
      const calendarTest = await this.driver.executeScript(`
        return document.querySelectorAll('[class*="calendar"], [class*="event"], [class*="cs"]').length;
      `);
      console.log(`📊 Calendar/Event elements found: ${calendarTest}`);
    } catch (error) {
      console.log("Error testing JavaScript execution:", error);
    }
  }

  private async debugPageStructure(): Promise<void> {
    if (!this.driver) {
      console.log("Driver not available for debugging");
      return;
    }

    try {
      console.log("🔍 Debugging page structure...");

      // Get page title
      const title = await this.driver.getTitle();
      console.log(`📄 Page title: ${title}`);

      // Check for any elements with 'cs' in class name
      const csElements = await this.driver.findElements(
        By.css('[class*="cs"]')
      );
      console.log(
        `🔍 Found ${csElements.length} elements with 'cs' in class name`
      );

      // Check for any elements with 'event' in class name
      const eventElements = await this.driver.findElements(
        By.css('[class*="event"]')
      );
      console.log(
        `🔍 Found ${eventElements.length} elements with 'event' in class name`
      );

      // Check for any links
      const allLinks = await this.driver.findElements(By.css("a"));
      console.log(`🔍 Found ${allLinks.length} total links`);

      // Check for any divs
      const allDivs = await this.driver.findElements(By.css("div"));
      console.log(`🔍 Found ${allDivs.length} total divs`);

      // Sample some class names
      if (csElements.length > 0) {
        const sampleClasses = await Promise.all(
          csElements.slice(0, 5).map(async (el) => {
            try {
              return await el.getAttribute("class");
            } catch {
              return "unknown";
            }
          })
        );
        console.log(`🔍 Sample CS class names: ${sampleClasses.join(", ")}`);
      }
    } catch (error) {
      console.log("Error debugging page structure:", error);
    }
  }

  private async extractEventsFromPage(): Promise<WashingtonianEvent[]> {
    if (!this.driver) {
      throw new Error("Driver not initialized");
    }

    const events: WashingtonianEvent[] = [];

    try {
      // Look for .csEventInfo elements on the main page
      console.log("🔍 Looking for .csEventInfo elements...");

      // Wait for .csEventInfo elements to be present
      await this.driver.wait(
        until.elementsLocated(By.css(".csEventInfo")),
        10000
      );

      const eventInfoElements = await this.driver.findElements(
        By.css(".csEventInfo")
      );

      console.log(`Found ${eventInfoElements.length} .csEventInfo elements`);

      for (let i = 0; i < eventInfoElements.length; i++) {
        try {
          const element = eventInfoElements[i];

          // Get the href from the parent link element
          const parentLink = await element.findElement(
            By.xpath("./ancestor::a[@href]")
          );
          const href = await parentLink.getAttribute("href");
          console.log(`🔗 Processing event ${i + 1}: ${href}`);

          if (!href) {
            console.log(`⚠️ No href found for event element ${i + 1}`);
            continue;
          }

          // Extract event ID from href
          const eventId = href.split("#/details/")[1];
          if (!eventId) {
            console.log(`⚠️ Could not extract event ID from: ${href}`);
            continue;
          }

          // Extract title from .csOneLine span
          let title = `Event ${eventId}`;
          try {
            const titleElement = await element.findElement(
              By.css(".csOneLine span")
            );
            title = await titleElement.getText();
            console.log(`📝 Event title: ${title}`);
          } catch {
            console.log(`⚠️ Could not find title for event ${i + 1}`);
          }

          // Extract venue from .cityVenue
          let venue = "TBD";
          try {
            const venueElement = await element.findElement(
              By.css(".cityVenue")
            );
            venue = await venueElement.getText();
            console.log(`📍 Venue: ${venue}`);
          } catch {
            console.log(`⚠️ Could not find venue for event ${i + 1}`);
          }

          // Extract time from the clock icon span
          let time = "TBD";
          try {
            const timeElement = await element.findElement(
              By.css(".csIconRow .csStaticSize span")
            );
            time = await timeElement.getText();
            console.log(`🕐 Time: ${time}`);
          } catch {
            console.log(`⚠️ Could not find time for event ${i + 1}`);
          }

          // Extract date from parent element's data-date attribute
          let date = new Date().toISOString().split("T")[0];
          try {
            const parentDiv = await element.findElement(
              By.xpath("./ancestor::div[@data-date]")
            );
            const dateAttr = await parentDiv.getAttribute("data-date");
            if (dateAttr) {
              const eventDate = new Date(dateAttr);
              date = eventDate.toISOString().split("T")[0];
              console.log(`📅 Date: ${date}`);
            }
          } catch {
            console.log(`⚠️ Could not find date for event ${i + 1}`);
          }

          // Create event object with extracted data
          const event = new WashingtonianEvent(title, date, time);

          events.push(event);
          console.log(
            `✅ Added event: ${event.title} on ${event.date} at ${event.time}`
          );
        } catch (error) {
          console.log(`❌ Error processing event ${i + 1}:`, error);
        }
      }

      return events;
    } catch (error) {
      console.error("❌ Error extracting events:", error);
      return [];
    }
  }

  private async extractEventFromLink(
    link: WebElement
  ): Promise<WashingtonianEvent | null> {
    try {
      // Get the href attribute for the URL
      const href = await link.getAttribute("href");
      let eventUrl = "";
      if (href) {
        eventUrl = href.startsWith("#")
          ? `https://www.washingtonian.com${href}`
          : href;
      }

      // Try to find the csEventInfo element within this link
      let eventInfoElement: WebElement;
      try {
        eventInfoElement = await link.findElement(By.css(".csEventInfo"));
      } catch (error) {
        console.log(
          "No .csEventInfo found in link, trying alternative selectors..."
        );

        // Try alternative selectors
        try {
          eventInfoElement = await link.findElement(
            By.css("[class*='csEventInfo']")
          );
        } catch (error2) {
          try {
            eventInfoElement = await link.findElement(
              By.css("[class*='event']")
            );
          } catch (error3) {
            console.log("No event info element found in link, skipping...");
            return null;
          }
        }
      }

      const eventData = await this.extractEventFromElement(eventInfoElement);

      if (eventData) {
        eventData.url = eventUrl;
      }

      return eventData;
    } catch (error) {
      console.log("Error extracting event from link:", error);
      return null;
    }
  }

  private async extractEventFromElement(
    element: WebElement
  ): Promise<WashingtonianEvent | null> {
    try {
      // Extract title from csOneLine span
      const titleElement = await element.findElement(By.css(".csOneLine span"));
      const title = await titleElement.getText();

      if (!title) {
        return null;
      }

      // Extract venue and location from cityVenue
      const venueSpans = await element.findElements(By.css(".cityVenue span"));
      let venue = "";
      let location = "";

      if (venueSpans.length >= 1) {
        venue = await venueSpans[0].getText();
      }

      if (venueSpans.length >= 3) {
        location = await venueSpans[2].getText();
      }

      // Extract time from csIconRow
      let time = "";
      try {
        const timeElement = await element.findElement(
          By.css(".csIconRow span")
        );
        time = await timeElement.getText();
        // Clean up the time text (remove any SVG-related text)
        time = time.replace(/\s+/g, " ").trim();
      } catch (error) {
        // Time element not found, that's okay
      }

      // Extract distance from csIconInfo
      let distance = "";
      try {
        const distanceElement = await element.findElement(
          By.css(".csIconInfo span")
        );
        distance = await distanceElement.getText();
      } catch (error) {
        // Distance element not found, that's okay
      }

      // Build full location string
      const fullLocation =
        venue && location ? `${venue}, ${location}` : venue || location;

      // Build description with additional details
      let description = "";
      if (distance) {
        description = `Distance: ${distance}`;
      }

      return {
        title,
        date: "2025-10-15", // Use the date from URL
        time: time || undefined,
        location: fullLocation || undefined,
        description: description || undefined,
        url: undefined, // Will be set by extractEventFromLink if called from there
        category: undefined,
        price: undefined,
        venue: venue || undefined,
        distance: distance || undefined,
      };
    } catch (error) {
      console.log("Error extracting event from element:", error);
      return null;
    }
  }

  async saveEvents(events: WashingtonianEvent[]): Promise<void> {
    console.log(`💾 Saving ${events.length} events to DynamoDB...`);

    for (const event of events) {
      try {
        const timestamp = Date.now();
        const eventId = `EVENT-WASHINGTONIAN-${timestamp}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        const item: Record<string, any> = {
          pk: { S: eventId },
          sk: { S: eventId },
          title: { S: event.title },
          source: { S: "washingtonian" },
          createdAt: { N: timestamp.toString() },
          isPublic: { S: "true" },
        };

        if (event.date) {
          item.eventDate = { S: event.date };
          item.start_date = { S: event.date };
        }
        if (event.time) {
          item.time = { S: event.time };
          item.start_time = { S: event.time };
        }
        if (event.location) item.location = { S: event.location };
        if (event.description) item.description = { S: event.description };
        if (event.url) item.url = { S: event.url };
        if (event.category) item.category = { S: event.category };
        if (event.price) item.cost = { S: event.price };
        if (event.venue) item.venue = { S: event.venue };
        if (event.distance) item.distance = { S: event.distance };

        // Add additional metadata
        item.id = { S: eventId };
        item.created_at = { S: new Date(timestamp).toISOString() };
        item.updated_at = { S: new Date(timestamp).toISOString() };

        console.log(`💾 Saving event: ${event.title}`);
        console.log(`   📅 Date: ${event.date}`);
        console.log(`   ⏰ Time: ${event.time || "Not specified"}`);
        console.log(`   📍 Location: ${event.location || "Not specified"}`);
        console.log(`   🔗 URL: ${event.url || "Not specified"}`);
        console.log(
          `   📝 Description: ${event.description || "Not specified"}`
        );

        const command = new PutItemCommand({
          TableName: Resource.Db.name,
          Item: item,
        });

        await this.client.send(command);
        console.log(`✅ Successfully saved event: ${event.title}`);
      } catch (error) {
        console.error(`❌ Error saving event ${event.title}:`, error);
      }
    }
  }

  async run(): Promise<void> {
    try {
      const events = await this.crawlEvents();
      await this.saveEvents(events);
      console.log("🎯 Washingtonian Selenium crawler completed successfully!");
    } catch (error) {
      console.error("💥 Washingtonian Selenium crawler failed:", error);
      throw error;
    } finally {
      // Always close the driver
      if (this.driver) {
        try {
          await this.driver.quit();
          console.log("🔒 WebDriver closed");
        } catch (error) {
          console.log("⚠️ Error closing WebDriver:", error);
        }
      }

      // Clean up temporary Chrome directories
      try {
        const { execSync } = require("child_process");
        execSync("rm -rf /tmp/chrome-*", { stdio: "ignore" });
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
}

// Run the crawler if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const crawler = new WashingtonianSeleniumCrawler();
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

export { WashingtonianSeleniumCrawler };
