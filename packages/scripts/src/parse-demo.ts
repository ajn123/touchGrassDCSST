// Demo script showing event parsing logic
async function demonstrateEventParsing() {
  console.log("🧪 Event Parsing Demonstration");
  console.log("==============================\n");

  try {
    // Sample event data that might be extracted from websites
    const sampleRawEvents = [
      {
        title: "DC Jazz Festival",
        rawDate: "June 15, 2024 at 7:00 PM",
        rawLocation: "Kennedy Center, Washington, DC",
        rawCategory: "jazz concert",
        rawCost: "$45",
        rawDescription:
          "Annual jazz festival featuring local and national artists",
      },
      {
        title: "Smithsonian Museum Day",
        rawDate: "September 21, 2024",
        rawLocation: "Various Smithsonian Museums, DC",
        rawCategory: "museum",
        rawCost: "Free",
        rawDescription: "Free admission to all Smithsonian museums",
      },
      {
        title: "Capital Pride Parade",
        rawDate: "2024-06-08",
        rawLocation: "Pennsylvania Avenue, Washington, DC",
        rawCategory: "festival parade",
        rawCost: "No cost",
        rawDescription: "Annual pride celebration and parade",
      },
      {
        title: "DC United vs NY Red Bulls",
        rawDate: "March 23, 2024 at 3:00 PM",
        rawLocation: "Audi Field, Washington, DC",
        rawCategory: "soccer sports",
        rawCost: "$25-150",
        rawDescription: "MLS soccer match between DC United and NY Red Bulls",
      },
    ];

    console.log("📝 Sample Raw Event Data:");
    console.log("==========================");
    sampleRawEvents.forEach((rawEvent, index) => {
      console.log(`\n${index + 1}. ${rawEvent.title}`);
      console.log(`   Raw Date: ${rawEvent.rawDate}`);
      console.log(`   Raw Location: ${rawEvent.rawLocation}`);
      console.log(`   Raw Category: ${rawEvent.rawCategory}`);
      console.log(`   Raw Cost: ${rawEvent.rawCost}`);
      console.log(`   Raw Description: ${rawEvent.rawDescription}`);
    });

    console.log("\n\n🔧 Parsing Results:");
    console.log("===================");

    sampleRawEvents.forEach((rawEvent, index) => {
      console.log(`\n${index + 1}. ${rawEvent.title}`);

      // Parse the date
      const parsedDate = parseDate(rawEvent.rawDate);
      console.log(`   📅 Parsed Date: ${parsedDate || "Could not parse"}`);

      // Parse the category
      const parsedCategory = mapCategory(rawEvent.rawCategory);
      console.log(
        `   🏷️ Parsed Category: ${
          Array.isArray(parsedCategory)
            ? parsedCategory.join(", ")
            : parsedCategory
        }`
      );

      // Parse the cost
      const parsedCost = parseCost(rawEvent.rawCost);
      console.log(`   💰 Parsed Cost: ${JSON.stringify(parsedCost)}`);

      // Show the final parsed event structure
      const parsedEvent = {
        title: rawEvent.title,
        description: rawEvent.rawDescription,
        location: rawEvent.rawLocation,
        date: parsedDate,
        start_date: parsedDate ? parsedDate.split("T")[0] : undefined,
        category: parsedCategory,
        cost: parsedCost,
        is_public: true,
      };

      console.log(`   📊 Final Parsed Event:`);
      console.log(JSON.stringify(parsedEvent, null, 6));
    });

    console.log("\n\n✅ Parsing demonstration completed!");
    console.log(
      "\n📝 This shows how the crawler will process real event data from websites."
    );
  } catch (error) {
    console.error("❌ Demonstration failed:", error);
  }
}

// Parsing functions (same as in the main crawler)
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
    jazz: "Music",
    festival: "Festival",
    parade: "Festival",
    food: "Food & Drink",
    drink: "Food & Drink",
    sports: "Sports",
    soccer: "Sports",
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

// Run demonstration
demonstrateEventParsing().catch(console.error);
