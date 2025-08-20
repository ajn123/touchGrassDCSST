import axios from "axios";

interface DemoEventData {
  title: string;
  description?: string;
  location?: string;
  date?: string;
  start_date?: string;
  end_date?: string;
  category?: string | string[];
  image_url?: string;
  cost?: {
    type: string;
    currency: string;
    amount: string | number;
  };
  socials?: {
    website?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  venue?: string;
  is_public?: boolean;
  confidence?: number;
  source_url?: string;
}

class DemoLiveAIParser {
  /**
   * Parse events from a live website URL and show what AI would extract
   */
  async parseLiveWebsite(
    url: string,
    sourceName: string = "Live Website",
    showRawContent: boolean = false
  ) {
    console.log(`🌐 Demo Live AI Parser - Processing: ${url}`);
    console.log("=".repeat(80));

    try {
      // Step 1: Fetch website content with axios
      console.log("\n1. 📥 Fetching website content...");

      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      });

      const htmlContent = response.data;

      console.log(`   ✅ Page loaded successfully`);
      console.log(
        `   📊 HTML content length: ${htmlContent.length} characters`
      );
      console.log(`   🔗 Response status: ${response.status}`);

      // Step 2: Show raw content if requested
      if (showRawContent) {
        console.log("\n2. 📝 Raw HTML Content (first 1000 chars):");
        console.log("-".repeat(60));
        console.log(htmlContent.substring(0, 1000) + "...");
        console.log("-".repeat(60));
      }

      // Step 3: Simulate AI Agent Processing
      console.log("\n3. 🤖 AI Agent Processing (Simulated)...");
      console.log(`   Source: ${sourceName}`);
      console.log(`   Simulating AWS Bedrock response...`);

      // Simulate AI processing time
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 4: Show Simulated AI Results
      console.log("\n4. 📊 AI Agent Results (Simulated):");
      console.log("=".repeat(60));

      // Extract some basic info from the HTML to make it realistic
      const extractedInfo = this.extractBasicInfo(htmlContent, url);

      if (extractedInfo.events.length === 0) {
        console.log("❌ No events found by AI agent");
        console.log("   This could mean:");
        console.log("   • No events on this page");
        console.log("   • Content format not recognized");
        console.log("   • Page structure is complex");
      } else {
        console.log(`✅ AI Agent found ${extractedInfo.events.length} events!`);
        console.log(
          `   Overall Confidence: ${extractedInfo.metadata.parsingConfidence.toFixed(
            2
          )}`
        );
        console.log(
          `   Processing Time: ${extractedInfo.metadata.processingTime}ms`
        );
        console.log(`   Method: AI Agent (Bedrock) - Simulated`);

        // Show each event
        extractedInfo.events.forEach((event, index) => {
          console.log(`\n${index + 1}. ${event.title}`);
          console.log(
            `   📅 Date: ${event.date || event.start_date || "No date"}`
          );
          console.log(`   📍 Location: ${event.location || "No location"}`);
          console.log(`   🏢 Venue: ${event.venue || "No venue"}`);
          console.log(
            `   🏷️ Category: ${
              Array.isArray(event.category)
                ? event.category.join(", ")
                : event.category || "No category"
            }`
          );
          console.log(
            `   💰 Cost: ${
              event.cost
                ? `${event.cost.type} - ${event.cost.amount}`
                : "Not specified"
            }`
          );
          console.log(
            `   🎯 Confidence: ${event.confidence?.toFixed(2) || "N/A"}`
          );

          if (event.description) {
            const desc =
              event.description.length > 100
                ? event.description.substring(0, 100) + "..."
                : event.description;
            console.log(`   📝 Description: ${desc}`);
          }

          if (event.socials?.website) {
            console.log(`   🌐 Website: ${event.socials.website}`);
          }
        });
      }

      // Step 5: Show metadata
      console.log("\n5. 📈 Processing Metadata:");
      console.log("-".repeat(40));
      console.log(`   Total Events: ${extractedInfo.metadata.totalEvents}`);
      console.log(
        `   Parsing Confidence: ${extractedInfo.metadata.parsingConfidence.toFixed(
          2
        )}`
      );
      console.log(`   Extraction Method: AI Agent (Bedrock) - Simulated`);
      console.log(
        `   Processing Time: ${extractedInfo.metadata.processingTime}ms`
      );
      console.log(`   Source URL: ${url}`);

      // Step 6: Show what would happen with real Bedrock
      console.log("\n6. 🔮 What Would Happen with Real AWS Bedrock:");
      console.log("-".repeat(50));
      console.log("   💾 Events would be saved to DynamoDB");
      console.log("   📊 Real confidence scores would be calculated");
      console.log("   🎯 Intelligent categorization would be applied");
      console.log("   📅 Dates would be normalized to ISO format");
      console.log("   🏷️ Categories would be intelligently mapped");
      console.log("   💰 Cost information would be structured");

      return extractedInfo;
    } catch (error: any) {
      console.error("\n❌ Error processing website:", error.message);

      if (error.code === "ECONNREFUSED") {
        console.log("   💡 This might be due to:");
        console.log("   • Website blocking automated requests");
        console.log("   • Network connectivity issues");
        console.log("   • Website requiring JavaScript");
      } else if (error.response?.status === 403) {
        console.log("   💡 This might be due to:");
        console.log("   • Website blocking automated requests");
        console.log("   • Need for different User-Agent");
        console.log("   • Website requiring authentication");
      }

      return null;
    }
  }

  /**
   * Extract basic information from HTML content (simulated AI parsing)
   */
  private extractBasicInfo(htmlContent: string, url: string) {
    const events: DemoEventData[] = [];
    const startTime = Date.now();

    try {
      // Look for common event patterns in the HTML
      const eventPatterns = [
        // Look for event titles
        /<h[1-6][^>]*>([^<]*event[^<]*)<\/h[1-6]>/gi,
        /<h[1-6][^>]*>([^<]*festival[^<]*)<\/h[1-6]>/gi,
        /<h[1-6][^>]*>([^<]*concert[^<]*)<\/h[1-6]>/gi,
        /<h[1-6][^>]*>([^<]*show[^<]*)<\/h[1-6]>/gi,
        /<h[1-6][^>]*>([^<]*performance[^<]*)<\/h[1-6]>/gi,
        /<h[1-6][^>]*>([^<]*exhibition[^<]*)<\/h[1-6]>/gi,
        /<h[1-6][^>]*>([^<]*workshop[^<]*)<\/h[1-6]>/gi,
        /<h[1-6][^>]*>([^<]*class[^<]*)<\/h[1-6]>/gi,
        /<h[1-6][^>]*>([^<]*meeting[^<]*)<\/h[1-6]>/gi,
        /<h[1-6][^>]*>([^<]*conference[^<]*)<\/h[1-6]>/gi,
      ];

      const foundTitles = new Set<string>();

      eventPatterns.forEach((pattern) => {
        const matches = htmlContent.match(pattern);
        if (matches) {
          matches.forEach((match) => {
            const title = match.replace(/<[^>]*>/g, "").trim();
            if (title && title.length > 5 && title.length < 100) {
              foundTitles.add(title);
            }
          });
        }
      });

      // Convert found titles to events
      let eventIndex = 0;
      foundTitles.forEach((title) => {
        if (eventIndex >= 5) return; // Limit to 5 events for demo

        const event: DemoEventData = {
          title: title,
          description: `Event description for ${title} would be extracted by AI agent`,
          location: "Location would be extracted by AI agent",
          date: new Date(
            Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
          start_date: new Date(
            Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000
          )
            .toISOString()
            .split("T")[0],
          category: this.guessCategory(title),
          cost: {
            type: "variable",
            currency: "USD",
            amount: "Cost would be extracted by AI agent",
          },
          venue: "Venue would be extracted by AI agent",
          confidence: 0.7 + Math.random() * 0.25, // Random confidence between 0.7-0.95
          source_url: url,
          is_public: true,
        };

        events.push(event);
        eventIndex++;
      });

      // If no events found, create a demo event
      if (events.length === 0) {
        events.push({
          title: "Sample Event (AI would find real events)",
          description:
            "This is a demonstration of what the AI agent would extract from this website. With real AWS Bedrock access, it would intelligently parse the actual content and find real events.",
          location: "Location would be extracted by AI agent",
          date: new Date().toISOString(),
          start_date: new Date().toISOString().split("T")[0],
          category: ["Demo", "AI Agent"],
          cost: {
            type: "variable",
            currency: "USD",
            amount: "Cost would be extracted by AI agent",
          },
          venue: "Venue would be extracted by AI agent",
          confidence: 0.85,
          source_url: url,
          is_public: true,
        });
      }
    } catch (error) {
      console.warn("Error extracting basic info:", error);
    }

    const processingTime = Date.now() - startTime;
    const avgConfidence =
      events.length > 0
        ? events.reduce((sum, e) => sum + (e.confidence || 0), 0) /
          events.length
        : 0;

    return {
      events,
      metadata: {
        totalEvents: events.length,
        parsingConfidence: avgConfidence,
        extractionMethod: "AI Agent (Bedrock) - Simulated",
        processingTime,
      },
    };
  }

  /**
   * Guess category based on title
   */
  private guessCategory(title: string): string[] {
    const lowerTitle = title.toLowerCase();

    if (
      lowerTitle.includes("concert") ||
      lowerTitle.includes("music") ||
      lowerTitle.includes("band")
    ) {
      return ["Music", "Entertainment"];
    } else if (
      lowerTitle.includes("festival") ||
      lowerTitle.includes("celebration")
    ) {
      return ["Festival", "Entertainment"];
    } else if (
      lowerTitle.includes("workshop") ||
      lowerTitle.includes("class")
    ) {
      return ["Education", "Workshop"];
    } else if (
      lowerTitle.includes("conference") ||
      lowerTitle.includes("meeting")
    ) {
      return ["Business", "Conference"];
    } else if (
      lowerTitle.includes("exhibition") ||
      lowerTitle.includes("art")
    ) {
      return ["Art", "Exhibition"];
    } else if (
      lowerTitle.includes("dance") ||
      lowerTitle.includes("performance")
    ) {
      return ["Dance", "Performance"];
    } else {
      return ["Event", "General"];
    }
  }
}

// Main execution function
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("🚀 Demo Live AI Parser - See What AI Would Extract");
    console.log("=".repeat(60));
    console.log("\nUsage:");
    console.log("  npm run demo:parse <URL> [source-name] [--show-raw]");
    console.log("\nExamples:");
    console.log("  npm run demo:parse https://example.com/events");
    console.log(
      "  npm run demo:parse https://kennedy-center.org/events 'Kennedy Center'"
    );
    console.log("  npm run demo:parse https://example.com/events --show-raw");
    console.log("\nOptions:");
    console.log("  --show-raw     Show raw HTML content");
    console.log("\nSample URLs:");
    console.log(
      "  https://www.eventbrite.com/d/united-states--washington-dc/events/"
    );
    console.log(
      "  https://www.kennedy-center.org/whats-on/explore-by-genre/dance/2025-2026/national-dance-day/"
    );
    console.log(
      "\nNote: This is a demo that simulates AI parsing. For real AI parsing, set up AWS Bedrock."
    );
    return;
  }

  const url = args[0];
  const sourceName = args[1] || "Live Website";
  const showRawContent = args.includes("--show-raw");

  console.log("🚀 Demo Live AI Parser Starting...");
  console.log(`   URL: ${url}`);
  console.log(`   Source: ${sourceName}`);
  console.log(`   Show Raw: ${showRawContent}`);
  console.log(`   Mode: Demo (simulated AI parsing)`);

  const parser = new DemoLiveAIParser();

  try {
    const result = await parser.parseLiveWebsite(
      url,
      sourceName,
      showRawContent
    );

    if (result) {
      console.log("\n🎉 Demo Live AI Parsing Completed Successfully!");
      console.log(`   Found ${result.events.length} events`);
      console.log(
        `   Confidence: ${result.metadata.parsingConfidence.toFixed(2)}`
      );
      console.log("\n💡 To see real AI parsing:");
      console.log("   1. Set up AWS Bedrock credentials");
      console.log("   2. Run: npm run simple:parse <URL>");
      console.log("   3. Watch real AI agent in action!");
    } else {
      console.log("\n⚠️ Demo Live AI Parsing Completed with Issues");
      console.log("   Check the error messages above for details");
    }
  } catch (error) {
    console.error("❌ Demo Live AI Parser failed:", error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { DemoLiveAIParser };
