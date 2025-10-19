#!/usr/bin/env tsx

import { WashingtonianSeleniumCrawler } from "./washingtonian-selenium";

async function testSeleniumCrawler() {
  console.log("🧪 Testing Washingtonian Selenium Crawler...");
  console.log("=".repeat(60));

  try {
    const crawler = new WashingtonianSeleniumCrawler();

    console.log("🚀 Starting Selenium crawler...");
    await crawler.run();

    console.log("\n✅ Selenium crawler test completed successfully!");
    console.log(
      "📊 Check the logs above for detailed event extraction information"
    );
  } catch (error) {
    console.error("❌ Selenium crawler test failed:", error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testSeleniumCrawler();
}
