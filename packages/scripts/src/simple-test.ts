import {
  crawlerSettings,
  crawlingSchedule,
  dcEventSources,
} from "./dc-event-sources";

// Simple demonstration of the crawler configuration
async function demonstrateCrawler() {
  console.log("🕷️ DC Event Crawler Demonstration");
  console.log("==================================\n");

  try {
    // Show all configured event sources
    console.log("📋 Configured Event Sources:");
    console.log("=============================");

    dcEventSources.forEach((source, index) => {
      console.log(`\n${index + 1}. ${source.name}`);
      console.log(`   Base URL: ${source.baseUrl}`);
      console.log(`   Event URLs: ${source.eventUrls.length}`);
      console.log(
        `   Categories: ${Object.keys(source.categoryMapping || {}).length}`
      );

      // Show some selectors
      const selectors = source.selectors;
      console.log(`   Selectors:`);
      console.log(`     - Event Container: ${selectors.eventContainer}`);
      console.log(`     - Title: ${selectors.title}`);
      console.log(`     - Date: ${selectors.date}`);
      console.log(`     - Location: ${selectors.location}`);
    });

    // Show crawling schedules
    console.log("\n\n📅 Crawling Schedules:");
    console.log("======================");

    console.log(`\n🌅 Daily (6 AM): ${crawlingSchedule.daily.length} sources`);
    crawlingSchedule.daily.forEach((source) => {
      const sourceConfig = dcEventSources.find((s) => s.name === source);
      if (sourceConfig) {
        console.log(`   - ${source} (${sourceConfig.baseUrl})`);
      }
    });

    console.log(
      `\n📅 Weekly (Sunday 2 AM): ${crawlingSchedule.weekly.length} sources`
    );
    crawlingSchedule.weekly.forEach((source) => {
      const sourceConfig = dcEventSources.find((s) => s.name === source);
      if (sourceConfig) {
        console.log(`   - ${source} (${sourceConfig.baseUrl})`);
      }
    });

    console.log(
      `\n📅 Monthly (1st 3 AM): ${crawlingSchedule.monthly.length} sources`
    );
    crawlingSchedule.monthly.forEach((source) => {
      const sourceConfig = dcEventSources.find((s) => s.name === source);
      if (sourceConfig) {
        console.log(`   - ${source} (${sourceConfig.baseUrl})`);
      }
    });

    console.log(
      `\n🔄 Frequent (Every 4 hours): ${crawlingSchedule.frequent.length} sources`
    );
    crawlingSchedule.frequent.forEach((source) => {
      const sourceConfig = dcEventSources.find((s) => s.name === source);
      if (sourceConfig) {
        console.log(`   - ${source} (${sourceConfig.baseUrl})`);
      }
    });

    // Show crawler settings
    console.log("\n\n⚙️ Crawler Settings:");
    console.log("====================");
    console.log(`   Request Delay: ${crawlerSettings.requestDelay}ms`);
    console.log(`   Max Concurrent: ${crawlerSettings.maxConcurrent}`);
    console.log(
      `   Max Pages per Source: ${crawlerSettings.maxPagesPerSource}`
    );
    console.log(`   Page Timeout: ${crawlerSettings.pageTimeout}ms`);
    console.log(`   Max Retries: ${crawlerSettings.maxRetries}`);
    console.log(`   User Agent: ${crawlerSettings.userAgent}`);

    // Show sample event data structure
    console.log("\n\n📊 Sample Event Data Structure:");
    console.log("===============================");

    const sampleEvent = {
      title: "Sample DC Event",
      description: "This is a sample event description",
      location: "Washington, DC",
      date: "2024-03-15T19:00:00.000Z",
      start_date: "2024-03-15",
      category: ["Music", "Entertainment"],
      image_url: "https://example.com/image.jpg",
      cost: {
        type: "fixed",
        currency: "USD",
        amount: 25,
      },
      socials: {
        website: "https://example.com/event",
        facebook: "https://facebook.com/event",
      },
      is_public: true,
    };

    console.log(JSON.stringify(sampleEvent, null, 2));

    console.log("\n\n✅ Demonstration completed successfully!");
    console.log("\n📝 To use the crawler:");
    console.log("1. Ensure SST is running: sst dev");
    console.log("2. Run setup: npm run setup");
    console.log("3. Test crawling: npm run crawl:manual");
    console.log("4. Start scheduled crawling: npm run crawl");
  } catch (error) {
    console.error("❌ Demonstration failed:", error);
  }
}

// Run demonstration
demonstrateCrawler().catch(console.error);
