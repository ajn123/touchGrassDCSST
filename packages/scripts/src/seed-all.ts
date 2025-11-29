#!/usr/bin/env tsx
/**
 * Master script to seed all data types (groups, events, venues)
 * Usage: npm run shell tsx src/seed-all.ts
 */

import { seedGroups } from "./seed-groups.js";
import { seedVenues } from "./seed-venues.js";

// Import seed-data's main function
// Note: seed-data.ts exports main() which we'll call directly
async function seedEvents() {
  const { main } = await import("./seed-data.js");
  return main();
}

async function seedAll() {
  console.log("🌱 Starting complete database seeding...\n");
  console.log("=" .repeat(80));

  const results = {
    groups: { success: false, error: null as Error | null },
    events: { success: false, error: null as Error | null },
    venues: { success: false, error: null as Error | null },
  };

  // Seed Groups
  console.log("\n📋 Step 1/3: Seeding Groups");
  console.log("-".repeat(80));
  try {
    await seedGroups();
    results.groups.success = true;
    console.log("✅ Groups seeded successfully\n");
  } catch (error) {
    results.groups.error = error as Error;
    console.error("❌ Groups seeding failed:", error);
    console.log("⚠️  Continuing with other seeds...\n");
  }

  // Seed Events
  console.log("\n📅 Step 2/3: Seeding Events");
  console.log("-".repeat(80));
  try {
    await seedEvents();
    results.events.success = true;
    console.log("✅ Events seeded successfully\n");
  } catch (error) {
    results.events.error = error as Error;
    console.error("❌ Events seeding failed:", error);
    console.log("⚠️  Continuing with other seeds...\n");
  }

  // Seed Venues
  console.log("\n🏢 Step 3/3: Seeding Venues");
  console.log("-".repeat(80));
  try {
    await seedVenues();
    results.venues.success = true;
    console.log("✅ Venues seeded successfully\n");
  } catch (error) {
    results.venues.error = error as Error;
    console.error("❌ Venues seeding failed:", error);
  }

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("📊 Seeding Summary:");
  console.log("=".repeat(80));
  console.log(`Groups:   ${results.groups.success ? "✅ Success" : "❌ Failed"}`);
  if (results.groups.error) {
    console.log(`          Error: ${results.groups.error.message}`);
  }
  console.log(`Events:   ${results.events.success ? "✅ Success" : "❌ Failed"}`);
  if (results.events.error) {
    console.log(`          Error: ${results.events.error.message}`);
  }
  console.log(`Venues:   ${results.venues.success ? "✅ Success" : "❌ Failed"}`);
  if (results.venues.error) {
    console.log(`          Error: ${results.venues.error.message}`);
  }

  const allSuccess = results.groups.success && results.events.success && results.venues.success;
  const anySuccess = results.groups.success || results.events.success || results.venues.success;

  console.log("\n" + "=".repeat(80));
  if (allSuccess) {
    console.log("🎉 All seeding completed successfully!");
    process.exit(0);
  } else if (anySuccess) {
    console.log("⚠️  Some seeding completed, but there were errors. Check the logs above.");
    process.exit(1);
  } else {
    console.log("❌ All seeding failed. Check the errors above.");
    process.exit(1);
  }
}

// Run the seeding
seedAll().catch((error) => {
  console.error("Fatal error during seeding:", error);
  process.exit(1);
});

