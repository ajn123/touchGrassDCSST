import axios from "axios";

// OpenWebNinja API configuration
const OPENWEBNINJA_CONFIG = {
  apiKey: "ak_tcewq7ma1rjgv8ikp2dskwusqesn7a87dy4ltlp2h74ueuc",
  baseUrl: "https://api.openwebninja.com/realtime-events-data",
};

interface OpenWebNinjaEvent {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date?: string;
  location: {
    name: string;
    address: string;
    city: string;
    state: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  category: string;
  price?: {
    currency: string;
    amount: number;
    type: "free" | "paid";
  };
  url: string;
  image_url?: string;
  organizer?: {
    name: string;
    contact?: string;
  };
  tags?: string[];
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

class OpenWebNinjaAPI {
  private config = OPENWEBNINJA_CONFIG;

  async searchEvents(
    query: string,
    location?: string,
    category?: string,
    limit: number = 50
  ): Promise<OpenWebNinjaResponse> {
    try {
      const params = new URLSearchParams({
        query: query,
        limit: limit.toString(),
      });

      if (location) {
        params.append("location", location);
      }
      if (category) {
        params.append("category", category);
      }

      const response = await axios.get(
        `${this.config.baseUrl}/search-events?${params.toString()}`,
        {
          headers: {
            "x-api-key": this.config.apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          `API Error: ${error.response?.status} - ${error.response?.statusText}`
        );
        console.error("Response data:", error.response?.data);
      } else {
        console.error("Request error:", error);
      }
      throw error;
    }
  }
}

// Transform OpenWebNinja event to our internal format
function transformOpenWebNinjaEvent(event: any) {
  return {
    id: event.event_id,
    title: event.name,
    description: event.description,
    start_date: event.start_time ? event.start_time.split(" ")[0] : "",
    start_time: event.start_time ? event.start_time.split(" ")[1] || "" : "",
    end_date: event.end_time ? event.end_time.split(" ")[0] : null,
    end_time: event.end_time ? event.end_time.split(" ")[1] || "" : null,
    location: {
      name: event.venue?.name || "Unknown Venue",
      address: event.venue?.address || "",
      city: "Washington", // Default to Washington since we're searching DC
      state: "DC",
      zip: "",
      country: "US",
      coordinates: event.venue?.coordinates,
    },
    is_online: event.is_virtual || false,
    url: event.link,
    image_url: event.thumbnail || null,
    cost: null, // Price info not available in this API response
    category: "General", // Category not directly available
    tags: [],
    organizer: event.publisher || null,
    status: "active",
    is_public: true,
    source: "openwebninja",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function queryOpenWebNinjaEvents() {
  console.log("🌐 OpenWebNinja Events Query");
  console.log("============================\n");

  try {
    // Initialize API client
    const api = new OpenWebNinjaAPI();

    // Search for events in Washington DC
    console.log("🔍 Searching for events in Washington, DC...");

    const eventsResponse = await api.searchEvents(
      "Events in Washington DC",
      "Washington, DC",
      undefined,
      20
    );

    console.log(`Found ${eventsResponse.data?.length || 0} events`);
    console.log(`Query: ${eventsResponse.parameters?.query || "Unknown"}\n`);

    // Display events
    if (eventsResponse.data && eventsResponse.data.length > 0) {
      eventsResponse.data.forEach((event, index) => {
        const transformedEvent = transformOpenWebNinjaEvent(event);

        console.log(`${index + 1}. ${transformedEvent.title}`);
        console.log(
          `   📅 Date: ${transformedEvent.start_date} ${transformedEvent.start_time}`
        );
        console.log(`   📍 Location: ${transformedEvent.location.name}`);
        console.log(
          `   🏙️ City: ${transformedEvent.location.city}, ${transformedEvent.location.state}`
        );
        console.log(
          `   💰 Cost: ${
            transformedEvent.cost?.type === "free"
              ? "Free"
              : `$${transformedEvent.cost?.amount}`
          }`
        );
        console.log(`   🏷️ Category: ${transformedEvent.category}`);
        console.log(`   🔗 URL: ${transformedEvent.url}`);
        if (transformedEvent.organizer) {
          console.log(`   👤 Organizer: ${transformedEvent.organizer}`);
        }
        console.log("");
      });
    } else {
      console.log("No events found for this query.");
    }

    // Show response info
    console.log("📄 Response Info:");
    console.log(`   Status: ${eventsResponse.status}`);
    console.log(`   Request ID: ${eventsResponse.request_id}`);
    console.log(`   Query: ${eventsResponse.parameters?.query}`);

    // Save sample events to file for inspection
    const sampleEvents = eventsResponse.data
      ? eventsResponse.data.slice(0, 5).map(transformOpenWebNinjaEvent)
      : [];
    const fs = await import("fs");
    const path = await import("path");

    const outputPath = path.join(
      process.cwd(),
      "openwebninja-sample-events.json"
    );
    fs.writeFileSync(outputPath, JSON.stringify(sampleEvents, null, 2));
    console.log(`\n💾 Saved sample events to: ${outputPath}`);

    // Test different queries
    console.log("\n🔍 Testing different queries...");

    const testQueries = [
      "Concerts in Washington DC",
      "Food events in DC",
      "Sports events Washington",
      "Art exhibitions DC",
    ];

    for (const query of testQueries) {
      try {
        console.log(`\nTesting: "${query}"`);
        const testResponse = await api.searchEvents(
          query,
          "Washington, DC",
          undefined,
          5
        );
        console.log(`   Found ${testResponse.data?.length || 0} events`);
        if (testResponse.data && testResponse.data.length > 0) {
          console.log(`   First event: ${testResponse.data[0].name}`);
        }
      } catch (error) {
        console.log(`   ❌ Query failed: ${error}`);
      }
    }
  } catch (error) {
    console.error("❌ Error querying OpenWebNinja:", error);
    process.exit(1);
  }
}

// Run the query
queryOpenWebNinjaEvents().catch(console.error);
