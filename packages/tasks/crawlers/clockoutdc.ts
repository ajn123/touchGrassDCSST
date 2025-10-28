import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { PlaywrightCrawler } from "crawlee";
import { Resource } from "sst";

class ClockOutEvent {
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

class ClockOutCrawler {
  private events: ClockOutEvent[] = [];
  private readonly CRAWL_PAGES = 1; // Only need to crawl the main events page

  // Parse date from "FRIDAY, 10/24" format
  private parseDate(dateStr: string): string {
    try {
      // Extract "10/24" from "FRIDAY, 10/24"
      const dateMatch = dateStr.match(/(\d{1,2}\/\d{1,2})/);
      if (!dateMatch) return "";

      const [month, day] = dateMatch[0].split("/");
      const today = new Date();
      const year = today.getFullYear();

      // Create date and check if it's in the past
      let date = new Date(year, parseInt(month) - 1, parseInt(day));

      // If the date is more than 6 months in the past, assume it's next year
      const sixMonthsAgo = new Date(today);
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      if (date < sixMonthsAgo) {
        date.setFullYear(year + 1);
      }

      const yearStr = date.getFullYear();
      const monthStr = String(date.getMonth() + 1).padStart(2, "0");
      const dayStr = String(date.getDate()).padStart(2, "0");
      return `${yearStr}-${monthStr}-${dayStr}`;
    } catch (error) {
      console.error("Error parsing date:", error);
      return "";
    }
  }

  // Parse time from formats like "7-11pm", "4-9:30pm", "2pm", "sunset"
  private parseTime(timeStr: string): string | undefined {
    if (!timeStr) return undefined;

    // Handle keyword times
    if (timeStr.toLowerCase().includes("sunset")) {
      return "sunset";
    }

    const cleaned = timeStr.trim().replace(/\s+/g, " ");

    // Normalize ranges like "7-11pm" => "7pm-11pm" (if only suffix on end)
    const rangeMatch = cleaned.match(
      /^(\d{1,2}(?::\d{2})?)\s*-\s*(\d{1,2}(?::\d{2})?)\s*([ap]m)$/i
    );
    if (rangeMatch) {
      const start = rangeMatch[1];
      const end = `${rangeMatch[2]}${rangeMatch[3].toLowerCase()}`;
      const startWithSuffix = `${start}${rangeMatch[3].toLowerCase()}`;
      return `${startWithSuffix}-${end}`;
    }

    // If already contains am/pm anywhere, return as-is (trimmed)
    if (/(am|pm)/i.test(cleaned)) return cleaned.toLowerCase();

    // Fallback to original cleaned string
    if (cleaned) return cleaned;

    return undefined;
  }

  // Parse price from text like "($80)", "(free)", "($75)"
  private parsePrice(text: string): string | undefined {
    if (!text) return undefined;
    const lower = text.toLowerCase().trim();
    if (/(^|\b)free(\b|$)/.test(lower)) return "free";
    const money = text.match(/\$\s*([0-9]+(?:\.[0-9]{2})?)/);
    if (money) return money[1];
    // bare number like "75" treated as dollars
    const bare = text.match(/\b([0-9]+(?:\.[0-9]{2})?)\b/);
    if (bare) return bare[1];
    return undefined;
  }

  async crawlEvents(): Promise<ClockOutEvent[]> {
    console.log("🕷️ Starting ClockOut DC event crawl with Playwright...");

    this.events = [];

    const crawler = new PlaywrightCrawler({
      maxRequestsPerCrawl: 1,
      maxConcurrency: 1,
      minConcurrency: 1,
      requestHandlerTimeoutSecs: 60,
      requestHandler: async ({ page, request }) => {
        console.log(`🔗 Processing URL: ${request.url}`);

        try {
          await page.goto(request.url, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
          });

          await page.waitForTimeout(2000);

          let events: any[] = [];
          try {
            events = await page.evaluate(() => {
              const extractedEvents: any[] = [];

              const headers = Array.from(
                document.querySelectorAll(".sqs-html-content h4")
              );

              headers.forEach((headerEl) => {
                const dateText = headerEl.textContent?.trim() || "";

                const match = dateText.match(/(\d{1,2}\/\d{1,2})/);
                const today = new Date();
                let yyyy = today.getFullYear();
                let mm = "01";
                let dd = "01";
                if (match) {
                  const [m, d] = match[0].split("/");
                  mm = String(parseInt(m)).padStart(2, "0");
                  dd = String(parseInt(d)).padStart(2, "0");
                }
                const parsedDate = `${yyyy}-${mm}-${dd}`;

                const ul = headerEl.nextElementSibling as HTMLElement | null;
                if (!ul || ul.tagName.toLowerCase() !== "ul") return;

                const items = Array.from(ul.querySelectorAll("li"));
                items.forEach((li) => {
                  const text = li.textContent?.trim() || "";
                  const linkEl = li.querySelector("a");
                  const url = linkEl?.getAttribute("href") || "";

                  const catMatch = text.match(/^([^:]+):/);
                  const category = catMatch ? catMatch[1].trim() : undefined;

                  let title = linkEl?.textContent?.trim() || "";
                  if (!title && catMatch) {
                    const titleStart =
                      text.indexOf(catMatch[0]) + catMatch[0].length;
                    const titleWithParen = text.substring(titleStart);
                    const titleOnly = titleWithParen.match(/^([^(]+)/);
                    title = titleOnly ? titleOnly[1].trim() : "";
                  }

                  // Extract all parentheticals and split by comma to get parts
                  const parenRegex = /\(([^)]+)\)/g;
                  let match;
                  const allParens = [];
                  while ((match = parenRegex.exec(text)) !== null) {
                    allParens.push(match[1]);
                  }

                  // Split each parenthetical by comma and flatten
                  const parts: string[] = [];
                  allParens.forEach((p) => {
                    p.split(",").forEach((part) => {
                      const trimmed = part.trim();
                      if (trimmed) parts.push(trimmed);
                    });
                  });

                  let time: string | undefined = undefined;
                  let price: string | undefined = undefined;
                  let location: string | undefined = undefined;

                  // Classify each part
                  parts.forEach((p) => {
                    // Check if it's a time pattern
                    if (
                      !time &&
                      /(\d\s*-\s*\d|\d{1,2}:?\d{0,2}\s*(am|pm)|sunset)/i.test(p)
                    ) {
                      time = p;
                    }
                    // Check if it's a price pattern
                    else if (
                      !price &&
                      (/\$|free/i.test(p) || /^\$?\s*\d+(?:\.\d{2})?$/.test(p))
                    ) {
                      price = p.replace(/\s+/g, " ");
                    }
                  });

                  // Remaining parts not classified - take the last one as location
                  const leftovers = parts.filter(
                    (p) => p !== time && p !== price
                  );
                  if (leftovers.length > 0) {
                    location = leftovers[leftovers.length - 1];
                  }

                  if (!title) return;

                  extractedEvents.push({
                    title,
                    date: parsedDate,
                    time,
                    location,
                    description: text,
                    url,
                    category,
                    price,
                  });
                });
              });

              return extractedEvents;
            });
          } catch (evaluateError) {
            console.log(`⚠️ Error during page evaluation: ${evaluateError}`);
            events = [];
          }

          for (const e of events) {
            // Normalize time and price
            const normalizedTime = this.parseTime(e.time);
            const normalizedPrice = this.parsePrice(e.price);

            const event = new ClockOutEvent(
              e.title,
              e.date,
              normalizedTime,
              e.location,
              e.description,
              e.url,
              e.category,
              normalizedPrice,
              undefined
            );
            this.events.push(event);
            console.log(`✅ Extracted event #${this.events.length}:`);
            console.log(`   📌 Title: ${event.title}`);
            console.log(`   📅 Date: ${event.date}`);
            if (event.time) console.log(`   ⏰ Time: ${event.time}`);
            if (event.category)
              console.log(`   🏷️  Category: ${event.category}`);
            if (event.price) console.log(`   💰 Price: ${event.price}`);
            if (event.location)
              console.log(`   📍 Location: ${event.location}`);
            if (event.url) console.log(`   🔗 URL: ${event.url}`);
            console.log(
              `   📝 Description: ${event.description?.substring(0, 100)}${
                (event.description || "").length > 100 ? "..." : ""
              }`
            );
            console.log("");
          }

          console.log(`✅ Found ${this.events.length} total events`);
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
      await crawler.run(["https://www.clockoutdc.com/events"]);
      console.log(`🎉 Total events found: ${this.events.length}`);
      return this.events;
    } catch (error) {
      console.error("❌ Crawler failed:", error);
      return [];
    }
  }

  async saveEvents(events: ClockOutEvent[]): Promise<void> {
    console.log(
      `💾 Saving ${events.length} events using Lambda normalization...`
    );

    try {
      const config = {};
      const client = new SFNClient(config);

      // Generate unique execution name with timestamp
      const executionName = `clockoutdc-crawler-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const inputObject = {
        stateMachineArn: Resource.normaizeEventStepFunction.arn,
        input: JSON.stringify({
          events: events,
          source: "clockoutdc",
          eventType: "clockoutdc",
        }),
        name: executionName,
      };

      const command = new StartExecutionCommand(inputObject);
      const response = await client.send(command);

      console.log("🚀 Step Functions execution successful:", response);
      console.log(`✅ Successfully started normalization workflow`);
    } catch (error) {
      console.error(`❌ Error saving events via Lambda:`, error);
      throw error;
    }
  }

  async run(): Promise<void> {
    console.log("🚀 Starting ClockOut DC Crawler...");

    try {
      const events = await this.crawlEvents();

      const config = {}; // type is SFNClientConfig
      const client = new SFNClient(config);

      // Generate unique execution name with timestamp
      const executionName = `clockoutdc-crawler-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const inputObject = {
        // StartExecutionInput
        stateMachineArn: Resource.normaizeEventStepFunction.arn, // corrected resource name
        input: JSON.stringify({
          events: events,
          source: "clockoutdc",
          eventType: "clockoutdc",
        }),
      };

      const command = new StartExecutionCommand(inputObject);
      await client
        .send(command)
        .then((response) => {
          console.log("🚀 Step Functions execution successful:", response);
          console.log(`✅ Successfully started normalization workflow`);
        })
        .catch((error) => {
          console.error(`❌ Error saving events via Lambda:`, error);
          throw error;
        });

      if (events.length > 0) {
        console.log("\n📊 SUMMARY OF PARSED EVENTS:");
        console.log("=".repeat(80));
        console.log(JSON.stringify(events, null, 2));
        console.log("=".repeat(80));
        console.log(
          `\n✅ Successfully parsed ${events.length} events from ClockOut DC`
        );

        await this.saveEvents(events);
        console.log("✅ ClockOut DC crawler completed successfully!");
      } else {
        console.log("⚠️ No events found to save");
      }
    } catch (error) {
      console.error("❌ ClockOut DC crawler failed:", error);
      throw error;
    }
  }
}

// Main execution
async function main() {
  console.log("🎬 Starting ClockOut DC Crawler...");

  const crawler = new ClockOutCrawler();

  try {
    await crawler.run();
    console.log("🎉 ClockOut DC Crawler completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("💥 ClockOut DC Crawler failed:", error);
    process.exit(1);
  }
}

// Run the crawler
main();
