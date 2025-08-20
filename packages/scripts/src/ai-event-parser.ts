import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { Resource } from "sst";

interface EventData {
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

interface ParsedContent {
  events: EventData[];
  metadata: {
    totalEvents: number;
    parsingConfidence: number;
    extractionMethod: string;
    processingTime: number;
  };
}

class AIEventParser {
  private bedrockClient: BedrockRuntimeClient;
  private dynamoClient: DynamoDBClient;
  private modelId: string;

  constructor() {
    this.bedrockClient = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || "us-east-1",
    });

    this.dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION || "us-east-1",
    });

    // Use Claude 3 Sonnet for best performance
    this.modelId = "anthropic.claude-3-sonnet-20240229-v1:0";
  }

  /**
   * Parse website content using AI to extract events
   */
  async parseWebsiteContent(
    htmlContent: string,
    url: string,
    sourceName: string
  ): Promise<ParsedContent> {
    const startTime = Date.now();

    try {
      console.log(`🤖 AI Agent parsing content from ${sourceName}...`);

      // Extract relevant text content from HTML
      const textContent = this.extractTextContent(htmlContent);

      // Create AI prompt for event extraction
      const prompt = this.createEventExtractionPrompt(textContent, sourceName);

      // Call Bedrock AI model
      const aiResponse = await this.callBedrockAI(prompt);

      // Parse AI response into structured events
      const events = this.parseAIResponse(aiResponse, url);

      // Validate and enhance events
      const validatedEvents = await this.validateAndEnhanceEvents(events);

      const processingTime = Date.now() - startTime;

      console.log(
        `✅ AI Agent extracted ${validatedEvents.length} events in ${processingTime}ms`
      );

      return {
        events: validatedEvents,
        metadata: {
          totalEvents: validatedEvents.length,
          parsingConfidence: this.calculateConfidence(validatedEvents),
          extractionMethod: "AI Agent (Bedrock)",
          processingTime,
        },
      };
    } catch (error) {
      console.error("❌ AI parsing failed:", error);
      return {
        events: [],
        metadata: {
          totalEvents: 0,
          parsingConfidence: 0,
          extractionMethod: "AI Agent (Failed)",
          processingTime: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Extract clean text content from HTML
   */
  private extractTextContent(html: string): string {
    // Remove script and style tags
    let text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ") // Remove HTML tags
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();

    // Limit content length for AI processing
    if (text.length > 8000) {
      text = text.substring(0, 8000) + "...";
    }

    return text;
  }

  /**
   * Create AI prompt for event extraction
   */
  private createEventExtractionPrompt(
    content: string,
    sourceName: string
  ): string {
    return `You are an expert event extraction AI agent. Your task is to analyze the following website content and extract all events mentioned.

SOURCE: ${sourceName}

CONTENT:
${content}

INSTRUCTIONS:
1. Identify all events, activities, performances, exhibitions, meetings, or gatherings
2. Extract key information for each event
3. Return results in valid JSON format
4. Be thorough but accurate - only extract real events
5. Handle various date formats and convert to ISO format when possible
6. Categorize events appropriately
7. Estimate confidence level for each extraction

OUTPUT FORMAT:
{
  "events": [
    {
      "title": "Event title",
      "description": "Event description",
      "location": "Event location or venue",
      "date": "ISO date string if available",
      "start_date": "Start date in YYYY-MM-DD format",
      "end_date": "End date if multi-day event",
      "category": ["Primary category", "Secondary category"],
      "cost": {
        "type": "free|fixed|variable",
        "currency": "USD",
        "amount": "Cost amount or range"
      },
      "venue": "Specific venue name",
      "confidence": 0.95
    }
  ]
}

EXAMPLES OF WHAT TO EXTRACT:
- Concerts, performances, theater shows
- Exhibitions, museum events, art shows
- Sports events, games, tournaments
- Workshops, classes, educational events
- Festivals, parades, celebrations
- Meetings, conferences, networking events
- Community events, outdoor activities

EXAMPLES OF WHAT NOT TO EXTRACT:
- General information about venues
- Historical facts or background info
- Contact information or directions
- General business hours or services

Analyze the content and return only the JSON response with extracted events.`;
  }

  /**
   * Call AWS Bedrock AI model
   */
  private async callBedrockAI(prompt: string): Promise<string> {
    try {
      const command = new InvokeModelCommand({
        modelId: this.modelId,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 4000,
          temperature: 0.1, // Low temperature for consistent parsing
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      });

      const response = await this.bedrockClient.send(command);

      if (!response.body) {
        throw new Error("No response body from Bedrock");
      }

      const responseText = new TextDecoder().decode(response.body);
      const responseData = JSON.parse(responseText);

      return responseData.content?.[0]?.text || "";
    } catch (error) {
      console.error("Bedrock API call failed:", error);
      throw error;
    }
  }

  /**
   * Parse AI response into structured events
   */
  private parseAIResponse(aiResponse: string, sourceUrl: string): EventData[] {
    try {
      // Extract JSON from AI response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn("No JSON found in AI response");
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.events || !Array.isArray(parsed.events)) {
        console.warn("Invalid events structure in AI response");
        return [];
      }

      // Add source URL to each event
      return parsed.events.map((event: any) => ({
        ...event,
        source_url: sourceUrl,
        is_public: true,
      }));
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      return [];
    }
  }

  /**
   * Validate and enhance extracted events
   */
  private async validateAndEnhanceEvents(
    events: EventData[]
  ): Promise<EventData[]> {
    const enhancedEvents: EventData[] = [];

    for (const event of events) {
      try {
        // Basic validation
        if (!event.title || event.title.trim().length < 3) {
          continue;
        }

        // Enhance date information
        if (event.date) {
          try {
            const date = new Date(event.date);
            if (!isNaN(date.getTime())) {
              event.start_date = date.toISOString().split("T")[0];
            }
          } catch (error) {
            console.warn(`Invalid date for event: ${event.title}`);
          }
        }

        // Normalize category
        if (event.category) {
          if (Array.isArray(event.category)) {
            event.category = event.category.filter(
              (cat) => cat && cat.trim().length > 0
            );
          } else if (typeof event.category === "string") {
            event.category = [event.category];
          }
        }

        // Set default cost if missing
        if (!event.cost) {
          event.cost = {
            type: "variable",
            currency: "USD",
            amount: "Not specified",
          };
        }

        // Calculate confidence if missing
        if (event.confidence === undefined) {
          event.confidence = this.calculateEventConfidence(event);
        }

        enhancedEvents.push(event);
      } catch (error) {
        console.warn(`Failed to enhance event ${event.title}:`, error);
      }
    }

    return enhancedEvents;
  }

  /**
   * Calculate confidence score for an event
   */
  private calculateEventConfidence(event: EventData): number {
    let confidence = 0.5; // Base confidence

    // Title quality
    if (event.title && event.title.length > 10) confidence += 0.1;

    // Date presence
    if (event.date || event.start_date) confidence += 0.2;

    // Location presence
    if (event.location || event.venue) confidence += 0.15;

    // Description quality
    if (event.description && event.description.length > 20) confidence += 0.1;

    // Category presence
    if (event.category && event.category.length > 0) confidence += 0.05;

    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate overall parsing confidence
   */
  private calculateConfidence(events: EventData[]): number {
    if (events.length === 0) return 0;

    const totalConfidence = events.reduce(
      (sum, event) => sum + (event.confidence || 0),
      0
    );
    return totalConfidence / events.length;
  }

  /**
   * Save events to DynamoDB
   */
  async saveEventsToDynamo(events: EventData[]): Promise<void> {
    console.log(`💾 AI Agent saving ${events.length} events to DynamoDB...`);

    for (const event of events) {
      try {
        if (!event.title) continue;

        const eventId = `EVENT#${event.title
          .replace(/\s+/g, "-")
          .toLowerCase()}-${Date.now()}`;
        const timestamp = Date.now();

        const item = {
          pk: eventId,
          sk: eventId,
          ...event,
          createdAt: timestamp,
          updatedAt: timestamp,
          extractionMethod: "AI Agent (Bedrock)",
          confidence: event.confidence || 0.5,
        };

        // Add titlePrefix for efficient searches
        if (event.title) {
          const titlePrefix = event.title.trim().toLowerCase().substring(0, 3);
          if (titlePrefix.length > 0) {
            item.titlePrefix = titlePrefix;
          }
        }

        const command = new PutItemCommand({
          TableName: Resource.Db.name,
          Item: marshall(item),
        });

        await this.dynamoClient.send(command);

        console.log(
          `✅ AI Agent saved event: ${event.title} (confidence: ${
            event.confidence || 0.5
          })`
        );

        // Add delay between saves to avoid throttling
        await this.delay(100);
      } catch (error) {
        console.error(`❌ Error saving event ${event.title}:`, error);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export the AI parser
export { AIEventParser, EventData, ParsedContent };
