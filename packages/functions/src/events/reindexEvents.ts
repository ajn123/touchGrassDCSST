import { Client } from "@opensearch-project/opensearch";
import {
  parseCategories,
  parseCostAmount,
  parseDate,
} from "@touchgrass/shared-utils";

import { Handler } from "aws-lambda";
import { Resource } from "sst";

const openSearchClient = new Client({
  node: Resource.MySearch.url,
  auth: {
    username: Resource.MySearch.username,
    password: Resource.MySearch.password,
  },
});

// Transform DynamoDB event to OpenSearch format
async function transformEventForOpenSearch(event: any): Promise<any> {
  const eventId = event.pk || `event-${Date.now()}-${Math.random()}`;

  return {
    id: eventId,
    type: "event",
    title: event.title || "",
    description: event.description || "",
    category: parseCategories(event.category),
    location: event.location || "",
    venue: event.venue || "",
    cost: {
      type: event.cost?.type || "unknown",
      amount: parseCostAmount(event.cost?.amount),
      currency: event.cost?.currency || "USD",
    },
    image_url: event.image_url || "",
    socials: event.socials || {},
    isPublic: event.isPublic === "true" || event.isPublic === true,
    createdAt: event.createdAt || Date.now(),
    date: parseDate(event.date || event.start_date),
    start_date: parseDate(event.start_date || event.date),
    end_date: parseDate(event.end_date),
  };
}

// Index a single event to OpenSearch
async function indexEventToOpenSearch(event: any): Promise<void> {
  try {
    const searchableEvent = transformEventForOpenSearch(event);

    // Use the event's primary key as the document ID to prevent duplicates
    const eventId =
      event.pk || event.id || `event-${Date.now()}-${Math.random()}`;

    await openSearchClient.index({
      index: "events-groups-index",
      id: eventId, // Explicitly set the document ID
      body: searchableEvent,
    });

    console.log(
      `✅ Indexed event to OpenSearch: ${event.title} (ID: ${eventId})`
    );
  } catch (error) {
    console.error(
      `❌ Error indexing event to OpenSearch: ${event.title}`,
      error
    );
    // Don't throw - we don't want OpenSearch errors to break the main flow
  }
}

export const handler: Handler = async (event: NormalizedEvent[]) => {
  console.log("Reindexing events", event);
  transformEventForOpenSearch(event).then((parsedEvent) =>
    indexEventToOpenSearch(parsedEvent)
  );
};
