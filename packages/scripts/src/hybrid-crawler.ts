import puppeteer from "puppeteer";
import { AIEventParser } from "./ai-event-parser";
import { EventCrawler } from "./event-crawler";
import { CrawlerConfig } from "./event-crawler";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

interface HybridCrawlerOptions {
  useAI: boolean;
  useTraditional: boolean;
  aiFallback: boolean; // Use AI if traditional fails
  confidenceThreshold: number; // Minimum confidence for AI events
  maxRetries: number;
}

class HybridEventCrawler {
  private browser: puppeteer.Browser | null = null;
  private aiParser: AIEventParser;
  private traditionalCrawler: EventCrawler;
  private options: HybridCrawlerOptions;

  constructor(options: Partial<HybridCrawlerOptions> = {}) {
    this.options = {
      useAI: true,
      useTraditional: true,
      aiFallback: true,
      confidenceThreshold: 0.7,
      maxRetries: 3,
      ...options,
    };

    this.aiParser = new AIEventParser();
    this.traditionalCrawler = new EventCrawler();
  }

  async init() {
    this.browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
      ],
      ignoreDefaultArgs: ["--disable-extensions"],
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  /**
   * Crawl a website using hybrid approach
   */
  async crawlWebsite(config: CrawlerConfig): Promise<any[]> {
    if (!this.browser) {
      throw new Error("Browser not initialized. Call init() first.");
    }

    const allEvents: any[] = [];
    const page = await this.browser.newPage();

    try {
      for (const eventUrl of config.eventUrls) {
        console.log(`🕷️ Hybrid crawler processing: ${eventUrl}`);
        
        try {
          await page.goto(eventUrl, {
            waitUntil: "networkidle2",
            timeout: 30000,
          });

          // Get page content
          const htmlContent = await page.content();
          
          // Try different crawling methods
          const events = await this.crawlWithHybridApproach(
            htmlContent,
            eventUrl,
            config
          );

          if (events.length > 0) {
            console.log(`✅ Hybrid crawler found ${events.length} events on ${eventUrl}`);
            allEvents.push(...events);
            
            // Print event details
            this.printEventSummary(events, eventUrl);
          }

          // Be respectful - add delay between requests
          await this.delay(2000);
          
        } catch (error) {
          console.error(`❌ Error crawling ${eventUrl}:`, error);
        }
      }
    } finally {
      await page.close();
    }

    return allEvents;
  }

  /**
   * Use hybrid approach to extract events
   */
  private async crawlWithHybridApproach(
    htmlContent: string,
    url: string,
    config: CrawlerConfig
  ): Promise<any[]> {
    const events: any[] = [];
    let methodUsed = "";

    try {
      // Method 1: Try AI parsing first if enabled
      if (this.options.useAI) {
        try {
          console.log(`🤖 Attempting AI parsing for ${config.name}...`);
          
          const aiResult = await this.aiParser.parseWebsiteContent(
            htmlContent,
            url,
            config.name
          );

          if (aiResult.events.length > 0 && aiResult.metadata.parsingConfidence >= this.options.confidenceThreshold) {
            console.log(`✅ AI parsing successful: ${aiResult.events.length} events (confidence: ${aiResult.metadata.parsingConfidence.toFixed(2)})`);
            events.push(...aiResult.events);
            methodUsed = "AI Agent (Bedrock)";
            
            // Print AI-extracted events
            this.printAIEvents(aiResult.events, aiResult.metadata);
            
            return events;
          } else {
            console.log(`⚠️ AI parsing confidence too low: ${aiResult.metadata.parsingConfidence.toFixed(2)} (threshold: ${this.options.confidenceThreshold})`);
          }
        } catch (error) {
          console.warn(`⚠️ AI parsing failed, falling back to traditional method:`, error);
        }
      }

      // Method 2: Try traditional CSS selector parsing
      if (this.options.useTraditional) {
        try {
          console.log(`🔧 Attempting traditional CSS selector parsing for ${config.name}...`);
          
          const traditionalEvents = await this.traditionalCrawler.extractEventsFromPage(
            await this.browser!.newPage(),
            config
          );

          if (traditionalEvents.length > 0) {
            console.log(`✅ Traditional parsing successful: ${traditionalEvents.length} events`);
            events.push(...traditionalEvents);
            methodUsed = "CSS Selectors";
            
            // Print traditional-extracted events
            this.printTraditionalEvents(traditionalEvents);
            
            return events;
          }
        } catch (error) {
          console.warn(`⚠️ Traditional parsing failed:`, error);
        }
      }

      // Method 3: AI fallback if traditional failed and fallback is enabled
      if (this.options.aiFallback && this.options.useAI && events.length === 0) {
        try {
          console.log(`🔄 Attempting AI fallback parsing for ${config.name}...`);
          
          const aiResult = await this.aiParser.parseWebsiteContent(
            htmlContent,
            url,
            config.name
          );

          if (aiResult.events.length > 0) {
            console.log(`✅ AI fallback successful: ${aiResult.events.length} events (confidence: ${aiResult.metadata.parsingConfidence.toFixed(2)})`);
            events.push(...aiResult.events);
            methodUsed = "AI Agent (Fallback)";
            
            // Print AI fallback events
            this.printAIEvents(aiResult.events, aiResult.metadata);
          }
        } catch (error) {
          console.error(`❌ AI fallback also failed:`, error);
        }
      }

      // Add method information to events
      events.forEach(event => {
        event.extractionMethod = methodUsed;
        event.source_url = url;
      });

    } catch (error) {
      console.error(`❌ Hybrid crawling failed for ${config.name}:`, error);
    }

    return events;
  }

  /**
   * Print summary of all events found
   */
  private printEventSummary(events: any[], url: string) {
    if (events.length === 0) return;

    console.log(`\n📊 Hybrid Crawler Summary for ${url}:`);
    console.log("=" .repeat(60));
    
    events.forEach((event, index) => {
      console.log(`\n${index + 1}. ${event.title || "Untitled"}`);
      console.log(`   Method: ${event.extractionMethod || "Unknown"}`);
      console.log(`   Date: ${event.date || event.start_date || "No date"}`);
      console.log(`   Location: ${event.location || "No location"}`);
      console.log(`   Category: ${Array.isArray(event.category) ? event.category.join(", ") : event.category || "No category"}`);
      console.log(`   Cost: ${event.cost ? `${event.cost.type} - ${event.cost.amount}` : "Not specified"}`);
      
      if (event.confidence) {
        console.log(`   Confidence: ${event.confidence.toFixed(2)}`);
      }
    });
    
    console.log("=" .repeat(60));
  }

  /**
   * Print AI-extracted events with confidence scores
   */
  private printAIEvents(events: any[], metadata: any) {
    console.log(`\n🤖 AI Agent Results:`);
    console.log(`   Total Events: ${metadata.totalEvents}`);
    console.log(`   Overall Confidence: ${metadata.parsingConfidence.toFixed(2)}`);
    console.log(`   Processing Time: ${metadata.processingTime}ms`);
    
    events.forEach((event, index) => {
      console.log(`\n   ${index + 1}. ${event.title}`);
      console.log(`      Confidence: ${event.confidence?.toFixed(2) || "N/A"}`);
      console.log(`      Date: ${event.date || event.start_date || "No date"}`);
      console.log(`      Location: ${event.location || "No location"}`);
    });
  }

  /**
   * Print traditional CSS selector events
   */
  private printTraditionalEvents(events: any[]) {
    console.log(`\n🔧 Traditional CSS Selector Results:`);
    console.log(`   Total Events: ${events.length}`);
    
    events.forEach((event, index) => {
      console.log(`\n   ${index + 1}. ${event.title}`);
      console.log(`      Date: ${event.date || event.start_date || "No date"}`);
      console.log(`      Location: ${event.location || "No location"}`);
    });
  }

  /**
   * Save events using the appropriate method
   */
  async saveEvents(events: any[]): Promise<void> {
    if (events.length === 0) {
      console.log("No events to save");
      return;
    }

    // Group events by extraction method
    const aiEvents = events.filter(e => e.extractionMethod?.includes("AI"));
    const traditionalEvents = events.filter(e => e.extractionMethod?.includes("CSS") || e.extractionMethod?.includes("Traditional"));

    // Save AI events using AI parser
    if (aiEvents.length > 0) {
      console.log(`💾 Saving ${aiEvents.length} AI-extracted events...`);
      await this.aiParser.saveEventsToDynamo(aiEvents);
    }

    // Save traditional events using traditional crawler
    if (traditionalEvents.length > 0) {
      console.log(`💾 Saving ${traditionalEvents.length} traditional-extracted events...`);
      await this.traditionalCrawler.saveEventsToDynamo(traditionalEvents);
    }

    console.log(`✅ All ${events.length} events saved successfully!`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export the hybrid crawler
export { HybridEventCrawler, HybridCrawlerOptions };
