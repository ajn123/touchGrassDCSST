import {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import * as cron from "node-cron";
import { Resource } from "sst";
import {
  crawlerSettings,
  crawlingSchedule,
  dcEventSources,
} from "./dc-event-sources";
import { EventCrawler } from "./event-crawler";

interface CrawlJob {
  id: string;
  sourceName: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt?: number;
  completedAt?: number;
  eventsFound: number;
  eventsSaved: number;
  error?: string;
}

interface CrawlSchedule {
  id: string;
  cronExpression: string;
  sources: string[];
  lastRun?: number;
  nextRun?: number;
  enabled: boolean;
}

class ScheduledEventCrawler {
  private crawler: EventCrawler;
  private dynamoClient: DynamoDBClient;
  private isRunning: boolean = false;

  constructor() {
    this.crawler = new EventCrawler();
    this.dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION || "us-east-1",
    });
  }

  async init() {
    await this.crawler.init();
    console.log("🚀 Scheduled crawler initialized");
  }

  async close() {
    await this.crawler.close();
    console.log("🔒 Scheduled crawler closed");
  }

  // Start all scheduled crawling jobs
  startScheduledCrawling() {
    console.log("📅 Starting scheduled crawling...");

    // Daily crawling at 6 AM
    cron.schedule(
      "0 6 * * *",
      async () => {
        console.log("🌅 Starting daily crawl...");
        await this.runScheduledCrawl("daily", crawlingSchedule.daily);
      },
      {
        scheduled: true,
        timezone: "America/New_York",
      }
    );

    // Weekly crawling on Sundays at 2 AM
    cron.schedule(
      "0 2 * * 0",
      async () => {
        console.log("📅 Starting weekly crawl...");
        await this.runScheduledCrawl("weekly", crawlingSchedule.weekly);
      },
      {
        scheduled: true,
        timezone: "America/New_York",
      }
    );

    // Monthly crawling on the 1st at 3 AM
    cron.schedule(
      "0 3 1 * *",
      async () => {
        console.log("📅 Starting monthly crawl...");
        await this.runScheduledCrawl("monthly", crawlingSchedule.monthly);
      },
      {
        scheduled: true,
        timezone: "America/New_York",
      }
    );

    // Frequent crawling every 4 hours
    cron.schedule(
      "0 */4 * * *",
      async () => {
        console.log("🔄 Starting frequent crawl...");
        await this.runScheduledCrawl("frequent", crawlingSchedule.frequent);
      },
      {
        scheduled: true,
        timezone: "America/New_York",
      }
    );

    console.log("✅ All scheduled jobs started");
  }

  private async runScheduledCrawl(scheduleType: string, sourceNames: string[]) {
    if (this.isRunning) {
      console.log("⚠️ Crawler already running, skipping this schedule");
      return;
    }

    this.isRunning = true;
    const jobId = `crawl-${scheduleType}-${Date.now()}`;

    try {
      console.log(
        `🕷️ Starting ${scheduleType} crawl for sources: ${sourceNames.join(
          ", "
        )}`
      );

      // Create crawl job record
      await this.createCrawlJob(jobId, scheduleType, sourceNames);

      const totalEvents: any[] = [];

      for (const sourceName of sourceNames) {
        const source = dcEventSources.find((s) => s.name === sourceName);
        if (!source) {
          console.warn(`⚠️ Source not found: ${sourceName}`);
          continue;
        }

        try {
          console.log(`🕷️ Crawling ${source.name}...`);
          const events = await this.crawler.crawlWebsite(source);

          if (events.length > 0) {
            console.log(`📊 Found ${events.length} events from ${source.name}`);

            // Print a summary of events found
            console.log("\n📋 Events Summary:");
            events.forEach((event, index) => {
              console.log(`  ${index + 1}. ${event.title || "Untitled"}`);
              console.log(
                `     Date: ${event.date || event.start_date || "No date"}`
              );
              console.log(`     Location: ${event.location || "No location"}`);
              console.log(
                `     Category: ${
                  Array.isArray(event.category)
                    ? event.category.join(", ")
                    : event.category || "No category"
                }`
              );
              console.log(
                `     Cost: ${
                  event.cost
                    ? `${event.cost.type} - ${event.cost.amount}`
                    : "Not specified"
                }`
              );
              console.log(""); // Empty line for readability
            });

            totalEvents.push(...events);
          }

          // Update job progress
          await this.updateCrawlJobProgress(jobId, sourceName, events.length);

          // Be respectful - delay between sources
          await this.delay(crawlerSettings.requestDelay);
        } catch (error) {
          console.error(`❌ Error crawling ${source.name}:`, error);
          await this.updateCrawlJobError(jobId, sourceName, error as Error);
        }
      }

      // Save all events to DynamoDB
      if (totalEvents.length > 0) {
        console.log(
          `💾 Saving ${totalEvents.length} total events to DynamoDB...`
        );
        await this.crawler.saveEventsToDynamo(totalEvents);

        // Update final job status
        await this.completeCrawlJob(jobId, totalEvents.length);
      }

      console.log(`✅ ${scheduleType} crawl completed successfully`);
    } catch (error) {
      console.error(`❌ Error during ${scheduleType} crawl:`, error);
      await this.failCrawlJob(jobId, error as Error);
    } finally {
      this.isRunning = false;
    }
  }

  // Manual crawl trigger
  async runManualCrawl(sourceNames?: string[]) {
    const sources = sourceNames || dcEventSources.map((s) => s.name);
    console.log(`🕷️ Starting manual crawl for sources: ${sources.join(", ")}`);

    await this.runScheduledCrawl("manual", sources);
  }

  // Crawl specific sources
  async crawlSources(sourceNames: string[]) {
    console.log(`🎯 Crawling specific sources: ${sourceNames.join(", ")}`);

    const sources = dcEventSources.filter((s) => sourceNames.includes(s.name));
    if (sources.length === 0) {
      throw new Error("No valid sources found");
    }

    const totalEvents: any[] = [];

    for (const source of sources) {
      try {
        console.log(`🕷️ Crawling ${source.name}...`);
        const events = await this.crawler.crawlWebsite(source);

        if (events.length > 0) {
          console.log(`📊 Found ${events.length} events from ${source.name}`);
          totalEvents.push(...events);
        }

        await this.delay(crawlerSettings.requestDelay);
      } catch (error) {
        console.error(`❌ Error crawling ${source.name}:`, error);
      }
    }

    if (totalEvents.length > 0) {
      console.log(
        `💾 Saving ${totalEvents.length} total events to DynamoDB...`
      );
      await this.crawler.saveEventsToDynamo(totalEvents);
    }

    return totalEvents;
  }

  // Check for duplicate events before saving
  async checkForDuplicates(events: any[]): Promise<any[]> {
    console.log("🔍 Checking for duplicate events...");

    const uniqueEvents: any[] = [];
    const seenTitles = new Set<string>();

    for (const event of events) {
      if (!event.title) continue;

      const normalizedTitle = event.title.toLowerCase().trim();

      if (!seenTitles.has(normalizedTitle)) {
        seenTitles.add(normalizedTitle);
        uniqueEvents.push(event);
      } else {
        console.log(`⚠️ Skipping duplicate: ${event.title}`);
      }
    }

    console.log(
      `✅ Filtered ${events.length - uniqueEvents.length} duplicate events`
    );
    return uniqueEvents;
  }

  // Get crawl job history
  async getCrawlHistory(limit: number = 50): Promise<CrawlJob[]> {
    try {
      const command = new QueryCommand({
        TableName: Resource.Db.name,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: {
          ":pk": { S: "CRAWL_JOB" },
        },
        ScanIndexForward: false,
        Limit: limit,
      });

      const result = await this.dynamoClient.send(command);
      return result.Items?.map((item) => unmarshall(item)) || [];
    } catch (error) {
      console.error("Error fetching crawl history:", error);
      return [];
    }
  }

  // Create a new crawl job record
  private async createCrawlJob(
    jobId: string,
    scheduleType: string,
    sourceNames: string[]
  ) {
    try {
      const job: CrawlJob = {
        id: jobId,
        sourceName: sourceNames.join(", "),
        status: "running",
        startedAt: Date.now(),
        eventsFound: 0,
        eventsSaved: 0,
      };

      const command = new PutItemCommand({
        TableName: Resource.Db.name,
        Item: marshall({
          pk: "CRAWL_JOB",
          sk: jobId,
          ...job,
        }),
      });

      await this.dynamoClient.send(command);
      console.log(`📝 Created crawl job: ${jobId}`);
    } catch (error) {
      console.error("Error creating crawl job:", error);
    }
  }

  // Update crawl job progress
  private async updateCrawlJobProgress(
    jobId: string,
    sourceName: string,
    eventsFound: number
  ) {
    try {
      const command = new PutItemCommand({
        TableName: Resource.Db.name,
        Item: marshall({
          pk: "CRAWL_JOB",
          sk: jobId,
          sourceName,
          status: "running",
          eventsFound,
          updatedAt: Date.now(),
        }),
      });

      await this.dynamoClient.send(command);
    } catch (error) {
      console.error("Error updating crawl job progress:", error);
    }
  }

  // Update crawl job with error
  private async updateCrawlJobError(
    jobId: string,
    sourceName: string,
    error: Error
  ) {
    try {
      const command = new PutItemCommand({
        TableName: Resource.Db.name,
        Item: marshall({
          pk: "CRAWL_JOB",
          sk: jobId,
          sourceName,
          status: "failed",
          error: error.message,
          updatedAt: Date.now(),
        }),
      });

      await this.dynamoClient.send(command);
    } catch (error) {
      console.error("Error updating crawl job error:", error);
    }
  }

  // Complete crawl job
  private async completeCrawlJob(jobId: string, eventsSaved: number) {
    try {
      const command = new PutItemCommand({
        TableName: Resource.Db.name,
        Item: marshall({
          pk: "CRAWL_JOB",
          sk: jobId,
          status: "completed",
          eventsSaved,
          completedAt: Date.now(),
          updatedAt: Date.now(),
        }),
      });

      await this.dynamoClient.send(command);
      console.log(`✅ Completed crawl job: ${jobId}`);
    } catch (error) {
      console.error("Error completing crawl job:", error);
    }
  }

  // Fail crawl job
  private async failCrawlJob(jobId: string, error: Error) {
    try {
      const command = new PutItemCommand({
        TableName: Resource.Db.name,
        Item: marshall({
          pk: "CRAWL_JOB",
          sk: jobId,
          status: "failed",
          error: error.message,
          completedAt: Date.now(),
          updatedAt: Date.now(),
        }),
      });

      await this.dynamoClient.send(command);
      console.log(`❌ Failed crawl job: ${jobId}`);
    } catch (error) {
      console.error("Error failing crawl job:", error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// CLI interface for manual crawling
async function main() {
  const args = process.argv.slice(2);
  const crawler = new ScheduledEventCrawler();

  try {
    await crawler.init();

    if (args.length === 0) {
      // Start scheduled crawling
      console.log("🚀 Starting scheduled crawling...");
      crawler.startScheduledCrawling();

      // Keep the process running
      process.on("SIGINT", async () => {
        console.log("\n🛑 Shutting down...");
        await crawler.close();
        process.exit(0);
      });

      console.log("⏰ Crawler running on schedule. Press Ctrl+C to stop.");
    } else if (args[0] === "manual") {
      // Manual crawl
      const sources = args.slice(1);
      if (sources.length === 0) {
        console.log("📝 Usage: npm run crawl:manual [source1] [source2] ...");
        console.log(
          "📝 Available sources:",
          dcEventSources.map((s) => s.name).join(", ")
        );
        return;
      }

      await crawler.runManualCrawl(sources);
    } else if (args[0] === "sources") {
      // Crawl specific sources
      const sources = args.slice(1);
      if (sources.length === 0) {
        console.log("📝 Usage: npm run crawl:sources [source1] [source2] ...");
        console.log(
          "📝 Available sources:",
          dcEventSources.map((s) => s.name).join(", ")
        );
        return;
      }

      await crawler.crawlSources(sources);
    } else if (args[0] === "history") {
      // Show crawl history
      const limit = parseInt(args[1]) || 10;
      const history = await crawler.getCrawlHistory(limit);

      console.log(`📊 Crawl History (last ${history.length} jobs):`);
      history.forEach((job) => {
        console.log(
          `  ${job.id}: ${job.status} - ${job.eventsFound} found, ${job.eventsSaved} saved`
        );
        if (job.error) {
          console.log(`    Error: ${job.error}`);
        }
      });
    } else {
      console.log("📝 Usage:");
      console.log(
        "  npm run crawl                    - Start scheduled crawling"
      );
      console.log(
        "  npm run crawl:manual [sources]   - Manual crawl of all or specific sources"
      );
      console.log(
        "  npm run crawl:sources [sources]  - Crawl specific sources"
      );
      console.log("  npm run crawl:history [limit]    - Show crawl history");
      console.log("");
      console.log(
        "📝 Available sources:",
        dcEventSources.map((s) => s.name).join(", ")
      );
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await crawler.close();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { ScheduledEventCrawler };
