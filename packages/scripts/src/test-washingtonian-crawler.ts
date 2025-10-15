#!/usr/bin/env tsx

import { WashingtonianCrawler } from "./washingtonian-crawler";

async function testCrawler() {
  console.log("🧪 Testing Washingtonian Crawler...");

  try {
    const crawler = new WashingtonianCrawler();
    await crawler.run();
    console.log("✅ Test completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

testCrawler();
