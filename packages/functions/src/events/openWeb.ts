import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Client } from "@opensearch-project/opensearch";
import axios from "axios";
import { Resource } from "sst";

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: "us-east-1",
});
const docClient = DynamoDBDocumentClient.from(client);

// Initialize OpenSearch client
const openSearchClient = new Client({
  node: Resource.MySearch.url,
  auth: {
    username: Resource.MySearch.username,
    password: Resource.MySearch.password,
  },
});

// OpenWebNinja API configuration
const OPENWEBNINJA_CONFIG = {
  apiKey: Resource.OPENWEBNINJA_API_KEY.value,
  baseUrl: "https://api.openwebninja.com/realtime-events-data",
};

interface OpenWebNinjaEvent {
  event_id: string;
  name: string;
  description: string;
  start_time: string;
  end_time?: string;
  link: string;
  thumbnail?: string;
  publisher: string;
  is_virtual: boolean;
  venue?: {
    name?: string;
    address?: string;
    google_id?: string;
  };
  ticket_links?: Array<{
    source: string;
    link: string;
  }>;
}

interface OpenWebNinjaResponse {
  status: string;
  request_id: string;
  parameters: {
    query: string;
    date: string;
  };
  data: OpenWebNinjaEvent[];
}

// Query OpenWebNinja API for events
async function queryOpenWebNinjaEvents(
  query: string,
  limit: number = 50
): Promise<OpenWebNinjaEvent[]> {
  try {
    const params = new URLSearchParams({
      query: query,
      limit: limit.toString(),
    });

    const response = await axios.get(
      `${OPENWEBNINJA_CONFIG.baseUrl}/search-events?${params.toString()}`,
      {
        headers: {
          "x-api-key": OPENWEBNINJA_CONFIG.apiKey,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.data || [];
  } catch (error) {
    console.error("Error querying OpenWebNinja API:", error);
    throw error;
  }
}

// These functions are now imported from @touchgrass/shared-utils
// Removed duplicate implementations of parseCategories, parseCostAmount, and parseDate

export const handler = async (event: any, context: any, callback: any) => {
  console.log("OpenWebNinja handler started");

  try {
    // Get table name from environment
    const tableName = Resource.Db.name;
    if (!tableName) {
      throw new Error("DB_NAME environment variable not set");
    }

    // Make targeted API calls for Washington DC events including special events
    const queries = [
      "Events in Washington DC",
      "Special events DC festivals concerts cultural exhibitions",
    ];

    let allEvents: OpenWebNinjaEvent[] = [];

    for (const query of queries) {
      console.log(`Making API call for: "${query}"`);
      try {
        const events = await queryOpenWebNinjaEvents(query, 50);
        console.log(
          `✅ API call successful for "${query}"! Found ${events.length} events`
        );
        allEvents.push(...events);

        // Add a small delay between API calls to be respectful
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ API call failed for "${query}":`, error);
        // Continue with other queries even if one fails
      }
    }

    // Remove duplicates based on external_id or title+date combination
    const uniqueEvents = allEvents.filter(
      (event, index, self) =>
        index ===
        self.findIndex((e) =>
          e.external_id && event.external_id
            ? e.external_id === event.external_id
            : e.title === event.title && e.start_date === event.start_date
        )
    );

    console.log(
      `✅ Total unique events found: ${uniqueEvents.length} (from ${allEvents.length} total)`
    );
    const events = uniqueEvents;

    let totalEventsProcessed = events.length;
    let totalEventsInserted = 0;

    // Use Lambda normalization for batch processing
    console.log(
      `🚀 Using Lambda normalization for ${events.length} OpenWebNinja events`
    );

    const config = {}; // type is SFNClientConfig
    const client = new SFNClient(config);

    // Generate unique execution name with timestamp
    const executionName = `washingtonian-crawler-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const inputObject = {
      // StartExecutionInput
      stateMachineArn: Resource.normaizeEventStepFunction.arn, // corrected resource name
      input: JSON.stringify({
        events: events,
        source: "openwebninja",
        eventType: "openwebninja",
      }),
    };

    const command = new StartExecutionCommand(inputObject);
    const response = await client.send(command);

    console.log("🚀 Step Functions test successful:", response);
    console.log(`✅ Successfully started normalization workflow`);

    console.log(`✅ Lambda normalization completed:`);
    console.log(`   📊 Processed: ${totalEventsProcessed} events`);

    console.log(
      `OpenWebNinja handler completed. Processed: ${totalEventsProcessed}, Inserted: ${totalEventsInserted}`
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "OpenWebNinja events processed successfully",
        processed: totalEventsProcessed,
        inserted: totalEventsInserted,
      }),
    };
  } catch (error) {
    console.error("OpenWebNinja handler error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error processing OpenWebNinja events",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};
