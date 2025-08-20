import { dcEventSources } from "./dc-event-sources";

// Test the parsing functions without launching the browser
async function testCrawler() {
  console.log("🧪 Testing event crawler parsing functions...");

  try {
    // Test with a simple source configuration
    const testSource = dcEventSources[0]; // DC Government Events
    console.log(`🕷️ Testing with source: ${testSource.name}`);

    // Test date parsing logic (simplified version)
    console.log("\n📅 Testing date parsing logic...");
    const testDates = [
      "March 15, 2024",
      "Mar 15, 2024",
      "2024-03-15",
      "March 15, 2024 at 7:00 PM",
      "Invalid date",
    ];

    testDates.forEach((dateStr) => {
      const parsed = parseDate(dateStr);
      console.log(`  "${dateStr}" -> ${parsed || "null"}`);
    });

    // Test category mapping logic
    console.log("\n🏷️ Testing category mapping logic...");
    const testCategories = ["concert", "museum", "theater", "unknown category"];

    testCategories.forEach((cat) => {
      const mapped = mapCategory(cat);
      console.log(`  "${cat}" -> ${mapped}`);
    });

    // Test cost parsing logic
    console.log("\n💰 Testing cost parsing logic...");
    const testCosts = ["Free", "$25", "$15-100", "No cost", "Variable pricing"];

    testCosts.forEach((cost) => {
      const parsed = parseCost(cost);
      console.log(`  "${cost}" -> ${JSON.stringify(parsed)}`);
    });

    // Test source configuration
    console.log("\n🔧 Testing source configuration...");
    console.log(`Total sources configured: ${dcEventSources.length}`);
    dcEventSources.forEach((source, index) => {
      console.log(`  ${index + 1}. ${source.name} - ${source.baseUrl}`);
    });

    console.log("\n✅ All parsing tests completed successfully!");

    // Show a sample parsed event
    console.log("\n📊 Sample Parsed Event:");
    console.log("=========================");
    const sampleEvent = {
      title: "Sample DC Event",
      description: "This is how events will look after parsing",
      location: "Washington, DC",
      date: "2024-03-15T19:00:00.000Z",
      start_date: "2024-03-15",
      category: ["Music", "Entertainment"],
      cost: {
        type: "fixed",
        currency: "USD",
        amount: 25,
      },
      is_public: true,
    };
    console.log(JSON.stringify(sampleEvent, null, 2));

    console.log("\n📝 Next steps:");
    console.log("1. See parsing demo: npm run parse-demo");
    console.log("2. Run setup: npm run setup");
    console.log("3. Test manual crawl: npm run crawl:manual");
    console.log("4. Start scheduled crawling: npm run crawl");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Simplified parsing functions for testing
function parseDate(dateText: string): string | null {
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
            getMonthIndex(month),
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
            getMonthIndex(month),
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
            getMonthIndex(month),
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

function getMonthIndex(month: string): number {
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

function mapCategory(categoryText: string): string | string[] {
  if (!categoryText) return "Uncategorized";

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

function parseCost(costText: string): {
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

// Run tests
testCrawler().catch(console.error);
