import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { PlaywrightCrawler } from "crawlee";
import { Resource } from "sst";

class ComedyLoftEvent {
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

class ComedyLoftCrawler {
  private events: ComedyLoftEvent[] = [];
  private skippedEventsCount: number = 0;

  // Convert a UTC ISO 8601 date string to Eastern time date + time strings.
  // e.g. "2026-03-05T00:00:00Z" → { date: "2026-03-04", time: "7:00 pm" }
  private parseISODateToEastern(isoDate: string): { date: string; time: string } | null {
    try {
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return null;

      // Date in Eastern (handles EST/EDT automatically)
      const dateStr = d.toLocaleDateString("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }); // "03/04/2026"

      const timeStr = d.toLocaleTimeString("en-US", {
        timeZone: "America/New_York",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }); // "7:00 PM"

      // "03/04/2026" → "2026-03-04"
      const [month, day, year] = dateStr.split("/");
      const date = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;

      return { date, time: timeStr.toLowerCase() };
    } catch {
      return null;
    }
  }

  // Parse price from text
  private parsePrice(text: string): string | undefined {
    if (!text) return undefined;
    const lower = text.toLowerCase().trim();
    if (/(^|\b)free(\b|$)/.test(lower)) return "free";
    const money = text.match(/\$\s*([0-9]+(?:\.[0-9]{2})?)/);
    if (money) return money[1];
    return undefined;
  }

  // Single pass: extract all events from the JSON-LD schema on the events listing page.
  // Each JSON-LD Event entry has name, startDate (UTC ISO), description, image, and
  // url pointing to https://www.dccomedyloft.com/shows/[id] — exactly what we need.
  async crawlEvents(): Promise<ComedyLoftEvent[]> {
    console.log("🕷️ Starting Comedy Loft DC crawl via JSON-LD...");

    this.events = [];

    const crawler = new PlaywrightCrawler({
      maxRequestsPerCrawl: 1,
      maxConcurrency: 1,
      minConcurrency: 1,
      requestHandlerTimeoutSecs: 60,
      requestHandler: async ({ page, request }) => {
        console.log(`🔗 Processing events page: ${request.url}`);

        await page.goto(request.url, {
          waitUntil: "networkidle",
          timeout: 30000,
        });

        // Extract all Event entries from JSON-LD <script> tags
        const extracted = await page.evaluate(() => {
          const results: Array<{
            title: string;
            startDate: string;
            description: string;
            imageUrl: string;
            url: string;
          }> = [];

          const scripts = Array.from(
            document.querySelectorAll('script[type="application/ld+json"]')
          );

          for (const script of scripts) {
            let parsed: any;
            try {
              parsed = JSON.parse(script.textContent || "");
            } catch {
              continue;
            }

            // Handle array, @graph wrapper, Place.Events wrapper (dccomedyloft.com), or bare object
            const items: any[] = Array.isArray(parsed)
              ? parsed
              : parsed["Events"]   // dccomedyloft.com uses Place { "Events": [...] }
              ? parsed["Events"]
              : parsed["@graph"]
              ? parsed["@graph"]
              : [parsed];

            for (const item of items) {
              if (item["@type"] !== "Event") continue;

              // Strip HTML tags from description
              let description = "";
              if (item.description) {
                const div = document.createElement("div");
                div.innerHTML = item.description;
                description = (div.textContent || div.innerText || "").trim();
              }

              // Normalise image field (string or object with .url)
              let imageUrl = "";
              if (typeof item.image === "string") {
                imageUrl = item.image;
              } else if (item.image?.url) {
                imageUrl = item.image.url;
              }

              results.push({
                title: (item.name || "").trim(),
                startDate: item.startDate || "",
                description,
                imageUrl,
                url: item.url || "",
              });
            }
          }

          return results;
        });

        console.log(`📋 Extracted ${extracted.length} events from JSON-LD`);

        for (const ev of extracted) {
          if (!ev.title || !ev.startDate) {
            this.skippedEventsCount++;
            continue;
          }

          // Ensure the URL is an absolute dccomedyloft.com show page
          const url = ev.url.startsWith("http")
            ? ev.url
            : `https://www.dccomedyloft.com${ev.url}`;

          if (!url.includes("dccomedyloft.com")) {
            console.log(`⚠️ Skipping event with unexpected URL: ${url}`);
            this.skippedEventsCount++;
            continue;
          }

          // Convert UTC ISO → Eastern date + time
          const eastern = this.parseISODateToEastern(ev.startDate);
          if (!eastern) {
            console.log(`⚠️ Could not parse date "${ev.startDate}" for "${ev.title}"`);
            this.skippedEventsCount++;
            continue;
          }

          const event = new ComedyLoftEvent(
            ev.title,
            eastern.date,
            eastern.time,
            "1523 22nd St NW, Washington DC 20037",
            ev.description || undefined,
            url, // https://www.dccomedyloft.com/shows/[id]
            "comedy",
            undefined, // price not available in JSON-LD
            "The Comedy Loft of DC"
          );
          this.events.push(event);
          console.log(`✅ ${ev.title} — ${eastern.date} ${eastern.time} → ${url}`);
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
      await crawler.run(["https://www.dccomedyloft.com/events"]);
      console.log(`🎉 Total events found: ${this.events.length}`);
      if (this.skippedEventsCount > 0) {
        console.log(`⚠️ Skipped ${this.skippedEventsCount} events`);
      }
      return this.events;
    } catch (error) {
      console.error("❌ Crawler failed:", error);
      return [];
    }
  }

  async saveEvents(events: ComedyLoftEvent[]): Promise<void> {
    console.log(
      `💾 Saving ${events.length} events using Lambda normalization...`
    );

    try {
      const config = {};
      const client = new SFNClient(config);

      // Generate unique execution name with timestamp
      const executionName = `dccomedyloft-crawler-${Date.now()}-${Math.random()
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
        source: "dccomedyloft",
        eventType: "dccomedyloft",
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
      const MAX_PAYLOAD_SIZE = 260000; // Leave small buffer
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

        const avgEventSize = payloadSizeBytes / sanitizedEvents.length;
        const BATCH_SIZE = Math.max(1, Math.floor((MAX_PAYLOAD_SIZE * 0.8) / avgEventSize));

        console.log(`📦 Average event size: ${Math.round(avgEventSize)} bytes, Batch size: ${BATCH_SIZE} events`);

        let subBatchCounter = 0;
        const sendBatch = async (batch: any[], batchNumber: number, depth: number = 0): Promise<void> => {
          const batchPayload = {
            events: batch,
            source: "dccomedyloft",
            eventType: "dccomedyloft",
          };

          const batchStringified = JSON.stringify(batchPayload);
          const batchSizeBytes = Buffer.from(batchStringified, 'utf8').length;

          if (batchSizeBytes > AWS_LIMIT) {
            console.error(`❌ Batch still too large (${batchSizeBytes} bytes). Splitting further...`);
            if (batch.length === 1) {
              throw new Error(`Single event is too large (${batchSizeBytes} bytes). Cannot split further.`);
            }
            const mid = Math.floor(batch.length / 2);
            await sendBatch(batch.slice(0, mid), batchNumber, depth + 1);
            await sendBatch(batch.slice(mid), batchNumber, depth + 1);
            return;
          }

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

          if (batchSizeBytes > 262144) {
            throw new Error(`Batch ${batchExecutionName} is still too large (${batchSizeBytes} bytes).`);
          }

          const batchCommand = new StartExecutionCommand(batchInputObject);
          const batchResponse = await client.send(batchCommand);
          console.log(`🚀 Step Functions execution ${batchExecutionName} started (${batchSizeBytes} bytes):`, batchResponse.executionArn);
        };

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
    console.log("🚀 Starting Comedy Loft DC Crawler...");

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
          `\n✅ Successfully parsed ${limitedEvents.length} events from Comedy Loft DC`
        );

        await this.saveEvents(limitedEvents);
        console.log("✅ Comedy Loft DC crawler completed successfully!");
      } else {
        console.log("⚠️ No events found to save");
      }
    } catch (error) {
      console.error("❌ Comedy Loft DC crawler failed:", error);
      throw error;
    }
  }
}

// Main execution
async function main() {
  console.log("🎬 Starting Comedy Loft DC Crawler...");

  const crawler = new ComedyLoftCrawler();

  try {
    await crawler.run();
    console.log("🎉 Comedy Loft DC Crawler completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("💥 Comedy Loft DC Crawler failed:", error);
    process.exit(1);
  }
}

// Run the crawler
main();
