// OpenSearch indexing disabled - using DynamoDB with frontend filtering instead
// import { Client } from "@opensearch-project/opensearch";
import {
  parseCategories,
  parseCostAmount,
  parseDate,
} from "@touchgrass/shared-utils";

import { Handler } from "aws-lambda";
// import { Resource } from "sst";

// OpenSearch client initialization disabled
// const openSearchClient = new Client({
//   node: Resource.MySearch.url,
//   auth: {
//     username: Resource.MySearch.username,
//     password: Resource.MySearch.password,
//   },
// });

// Transform DynamoDB group to OpenSearch format
async function transformGroupForOpenSearch(group: any): Promise<any> {
  const groupId = group.pk || `group-${Date.now()}-${Math.random()}`;

  return {
    id: groupId,
    type: "group",
    title: group.title || "",
    description: group.description || "",
    category: parseCategories(group.category),
    location: group.scheduleLocation || "",
    image_url: group.image_url || "",
    socials: group.socials || {},
    isPublic: group.isPublic === "true" || group.isPublic === true,
    createdAt: group.createdAt || Date.now(),
    // Group-specific fields
    scheduleDay: group.scheduleDay,
    scheduleTime: group.scheduleTime,
    scheduleLocation: group.scheduleLocation,
  };
}

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

// Index a single item (event or group) to OpenSearch - DISABLED: Using DynamoDB with frontend filtering instead
async function indexItemToOpenSearch(item: any): Promise<void> {
  // OpenSearch indexing disabled
  console.log(`⚠️ OpenSearch indexing disabled for item: ${item.title || item.pk}`);
  return;
  
  /* OpenSearch indexing code commented out
  try {
    // Check if this is a group (has schedule fields or pk starts with GROUP#)
    const isGroup = item.isGroup || 
                    item.type === "group" || 
                    (item.pk && item.pk.startsWith("GROUP#")) ||
                    item.scheduleDay !== undefined;

    let searchableItem;
    let itemId;
    let itemType;

    if (isGroup) {
      searchableItem = await transformGroupForOpenSearch(item);
      itemId = item.pk || item.id || `group-${Date.now()}-${Math.random()}`;
      itemType = "group";
    } else {
      searchableItem = await transformEventForOpenSearch(item);
      itemId = item.pk || item.id || `event-${Date.now()}-${Math.random()}`;
      itemType = "event";
    }

    await openSearchClient.index({
      index: "events-groups-index",
      id: itemId, // Explicitly set the document ID
      body: searchableItem,
    });

    console.log(
      `✅ Indexed ${itemType} to OpenSearch: ${item.title} (ID: ${itemId})`
    );
  } catch (error) {
    console.error(
      `❌ Error indexing item to OpenSearch: ${item.title}`,
      error
    );
    // Don't throw - we don't want OpenSearch errors to break the main flow
  }
  */
}

export const handler: Handler = async (event: any) => {
  let payload =
    typeof event.body.Payload === "object"
      ? JSON.parse(event.body.Payload.body)
      : event.body.Payload;

  const { eventIds, savedEvents } = payload;

  console.log("⚠️ OpenSearch indexing is disabled.");
  console.log(`ℹ️ Items in reindexEvents: ${savedEvents?.length || 0}`);
  console.log("ℹ️ Events are now searched directly from DynamoDB with frontend filtering.");

  // OpenSearch indexing disabled - items are already saved to DynamoDB
  // await Promise.all(
  //   savedEvents.map((item: any) => indexItemToOpenSearch(item))
  // );

  return {
    statusCode: 200,
    body: JSON.stringify({ 
      message: "OpenSearch indexing disabled - items saved to DynamoDB only",
      itemsProcessed: savedEvents?.length || 0
    }),
  };
};
