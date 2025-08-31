"use server";
import {
  BatchWriteItemCommand,
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  ScanCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { revalidatePath } from "next/cache";
import { Resource } from "sst";
import { searchGroupsSimple } from "./dynamodb-groups";
const PRIMARY_EMAIL = "hi@touchgrassdc.com";

// Geocoding function (copied from seed-data.ts to avoid import issues)
async function geocodeAddress(address: string): Promise<{
  latitude: number;
  longitude: number;
  formattedAddress: string;
} | null> {
  try {
    if (!address) {
      console.log("No address provided for geocoding");
      return null;
    }

    // Try both environment variable names
    let apiKey =
      process.env.GOOGLE_MAPS_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.log(
        "No Google Maps API key found in environment (tried GOOGLE_MAPS_API_KEY and NEXT_PUBLIC_GOOGLE_MAPS_API_KEY)"
      );
      console.log(
        "Please set the GOOGLE_MAPS_API_KEY environment variable or add it to your .env file"
      );
      return null;
    }

    console.log(`Using API key: ${apiKey.substring(0, 10)}...`);

    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    console.log(
      `Geocoding response for "${address}":`,
      JSON.stringify(data, null, 2)
    );

    if (data.status === "OK" && data.results && data.results.length > 0) {
      const result = data.results[0];
      const location = result.geometry.location;

      return {
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress: result.formatted_address,
      };
    } else {
      console.log(
        `Geocoding failed for "${address}" with status: ${data.status}`
      );
      if (data.error_message) {
        console.log(`Error message: ${data.error_message}`);
      }
    }

    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

export async function getCategories() {
  try {
    const command = new ScanCommand({
      TableName: Resource.Db.name,
    });

    const result = await client.send(command);
    const uniqueCategories = new Set();

    result.Items?.forEach((item) => {
      const unmarshalledItem = unmarshall(item);

      if (Array.isArray(unmarshalledItem.category)) {
        // If category is an array, add each category to the set
        unmarshalledItem.category.forEach((category: string) => {
          if (category && category.trim()) {
            uniqueCategories.add(category.trim());
          }
        });
      } else if (unmarshalledItem.category) {
        // If category is a comma-separated string, split it and add each part
        const categories = unmarshalledItem.category
          .split(",")
          .map((cat: string) => cat.trim());
        categories.forEach((category: string) => {
          if (category && category.trim()) {
            uniqueCategories.add(category.trim());
          }
        });
      }
    });

    console.log("Unique categories:", uniqueCategories);
    return Array.from(uniqueCategories).map((category) => ({ category }));
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

export async function getEventsByCategory(category: string) {
  try {
    const command = new ScanCommand({
      TableName: Resource.Db.name,
      FilterExpression: "begins_with(#pk, :eventPrefix)",
      ExpressionAttributeNames: {
        "#pk": "pk",
      },
      ExpressionAttributeValues: {
        ":eventPrefix": { S: "EVENT" },
      },
    });

    const result = await client.send(command);
    const events =
      result.Items?.map((item) => {
        return unmarshall(item);
      }) || [];

    // Filter events that have the specified category in their category array or comma-separated string
    return events.filter((event) => {
      if (!event.category) return false;

      if (Array.isArray(event.category)) {
        // If category is an array, check if the specified category is in the array
        return event.category.includes(category);
      } else {
        // If category is a comma-separated string, split it and check if the specified category is included
        const categories = event.category
          .split(",")
          .map((cat: string) => cat.trim());
        return categories.includes(category);
      }
    });
  } catch (error) {
    console.error("Error fetching events by category:", error);
    return [];
  }
}

export async function getEvent(id: string) {
  try {
    const command = new GetItemCommand({
      TableName: process.env.DB_NAME,
      Key: {
        pk: { S: id },
        sk: { S: id },
      },
    });

    const result = await client.send(command);
    // Use AWS SDK's built-in unmarshall utility
    const unmarshalledItem = result.Item ? unmarshall(result.Item) : null;
    console.log(
      `Unmarshalled item: ${JSON.stringify(unmarshalledItem, null, 2)}`
    );

    return unmarshalledItem;
  } catch (error) {
    console.error("Error fetching item:", error);
    return null;
  }
}

export async function getEventByTitle(title: string) {
  try {
    console.log("Searching for event with title:", title);
    console.log("Using table:", Resource.Db.name);

    const command = new ScanCommand({
      TableName: Resource.Db.name,
      FilterExpression: "#title = :title AND begins_with(#pk, :eventPrefix)",
      ExpressionAttributeNames: {
        "#pk": "pk",
        "#title": "title",
      },
      ExpressionAttributeValues: {
        ":eventPrefix": { S: "EVENT" },
        ":title": { S: title },
      },
    });

    console.log("Scan command created, executing...");
    const result = await client.send(command);
    console.log("Scan result received:", result);

    if (!result.Items) {
      console.log("No items found in scan result");
      return null;
    }

    const events = result.Items.map((item) => {
      try {
        return unmarshall(item);
      } catch (unmarshallError) {
        console.error("Error unmarshalling item:", unmarshallError);
        return null;
      }
    }).filter(Boolean);

    console.log("Found events:", events.length);

    // Return the first matching event (titles should be unique)
    return events.length > 0 ? events[0] : null;
  } catch (error) {
    console.error("Error fetching event by title:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      title,
      tableName: Resource.Db.name,
    });
    return null;
  }
}

export async function getEvents() {
  try {
    console.log("🔍 getEvents: Starting to fetch events from DynamoDB...");
    console.log("🔍 getEvents: Table name:", Resource.Db.name);
    console.log(
      "🔍 getEvents: AWS Region:",
      process.env.AWS_REGION || "us-east-1"
    );

    const command = new ScanCommand({
      TableName: Resource.Db.name,
      FilterExpression:
        "begins_with(#pk, :eventPrefix) AND #isPublic = :isPublic",
      ExpressionAttributeNames: {
        "#pk": "pk",
        "#isPublic": "isPublic",
      },
      ExpressionAttributeValues: {
        ":eventPrefix": { S: "EVENT" },
        ":isPublic": { S: "true" },
      },
    });

    console.log("🔍 getEvents: Scan command prepared:", {
      TableName: Resource.Db.name,
      FilterExpression:
        "begins_with(#pk, :eventPrefix) AND #isPublic = :isPublic",
      ExpressionAttributeValues: {
        ":eventPrefix": "EVENT",
        ":isPublic": "true",
      },
    });

    const result = await client.send(command);
    console.log("🔍 getEvents: DynamoDB scan completed");
    console.log(
      "🔍 getEvents: Raw DynamoDB result count:",
      result.Items?.length || 0
    );
    console.log("🔍 getEvents: Raw DynamoDB result:", result);

    const events =
      result.Items?.map((item) => {
        // Use AWS SDK's unmarshall utility to convert DynamoDB format to regular object
        const unmarshalledItem = unmarshall(item);
        console.log("🔍 getEvents: Unmarshalled item:", unmarshalledItem);
        return unmarshalledItem;
      }) || [];

    console.log("🔍 getEvents: Final events array length:", events.length);
    return events;
  } catch (error) {
    console.error("❌ getEvents: Error fetching events:", error);
    console.error("❌ getEvents: Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : "Unknown error type",
    });
    return [];
  }
}

export async function searchEventsAndGroups(filters: {
  query?: string;
  categories?: string[];
  costRange?: { min?: number; max?: number; type?: string };
  location?: string[];
  dateRange?: { start?: string; end?: string };
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  fields?: string[];
}) {
  const startTime = Date.now();
  console.log(
    "🔍 searchEventsAndGroups called with filters:",
    JSON.stringify(filters, null, 2)
  );

  try {
    const scanStartTime = Date.now();
    console.log("⏱️ Starting DynamoDB scan...");

    // Build DynamoDB filter expression
    let filterExpressions: string[] = [];
    let expressionAttributeNames: { [key: string]: string } = {};
    let expressionAttributeValues: { [key: string]: any } = {};

    console.log("🔧 Building DynamoDB filter expressions");

    // Search all items regardless of key prefix
    // No need to filter by pk prefix - search everything in the table

    // Text search with case-insensitive matching for title and other fields
    if (filters.query && filters.query.trim()) {
      const query = filters.query.trim();
      console.log("🔍 Adding case-insensitive text search filter for:", query);

      // Create multiple query variants for case-insensitive search
      // DynamoDB doesn't support lower() function in FilterExpressions
      const qOrig = query;
      const qLower = query.toLowerCase();
      const qUpper = query.toUpperCase();

      // Create OR expression for text search across multiple fields
      // Check multiple case variants to achieve case-insensitive search
      const textSearchExpressions = [
        "contains(#title, :q1)",
        "contains(#title, :q2)",
        "contains(#title, :q3)",
        "contains(#description, :q1)",
        "contains(#description, :q2)",
        "contains(#description, :q3)",
      ];

      // Add venue and location fields for all items
      textSearchExpressions.push(
        "contains(#venue, :q1)",
        "contains(#venue, :q2)",
        "contains(#venue, :q3)",
        "contains(#location, :q1)",
        "contains(#location, :q2)",
        "contains(#location, :q3)"
      );

      // Add category field for both events and groups
      textSearchExpressions.push(
        "contains(#category, :q1)",
        "contains(#category, :q2)",
        "contains(#category, :q3)"
      );

      filterExpressions.push(`(${textSearchExpressions.join(" OR ")})`);

      // Add attribute names
      expressionAttributeNames["#title"] = "title";
      expressionAttributeNames["#description"] = "description";
      expressionAttributeNames["#category"] = "category";

      // Add venue and location for all items
      expressionAttributeNames["#venue"] = "venue";
      expressionAttributeNames["#location"] = "location";

      // Add the query values as AttributeValues for case-insensitive search
      expressionAttributeValues[":q1"] = { S: qOrig };
      expressionAttributeValues[":q2"] = { S: qLower };
      expressionAttributeValues[":q3"] = { S: qUpper };
    }

    // Add category filter if specified
    if (filters.categories && filters.categories.length > 0) {
      console.log("🏷️ Adding category filter for:", filters.categories);
      const categoryExpressions = filters.categories.map((_, index) => {
        const nameKey = `#cat${index}`;
        const valueKey = `:cat${index}`;
        expressionAttributeNames[nameKey] = "category";
        expressionAttributeValues[valueKey] = { S: filters.categories![index] };
        return `contains(#cat${index}, :cat${index})`;
      });
      filterExpressions.push(`(${categoryExpressions.join(" OR ")})`);
    }

    // Cost filter - handle both object and string cost formats
    if (
      filters.costRange &&
      (filters.costRange.min !== undefined ||
        filters.costRange.max !== undefined)
    ) {
      console.log("💰 Adding cost filter:", filters.costRange);

      // We'll need to handle cost filtering client-side due to mixed data shapes
      // but we'll add a note about it in the filter expression
      filterExpressions.push("attribute_exists(#cost)");
      expressionAttributeNames["#cost"] = "cost";
    }

    // Location filter for all items
    if (filters.location && filters.location.length > 0) {
      console.log("📍 Adding location filter for:", filters.location);
      const locationExpressions = filters.location.map((_, index) => {
        const nameKey = `#loc${index}`;
        const valueKey = `:loc${index}`;
        expressionAttributeNames[nameKey] = "location";
        expressionAttributeValues[valueKey] = { S: filters.location![index] };
        return `contains(#loc${index}, :loc${index})`;
      });
      filterExpressions.push(`(${locationExpressions.join(" OR ")})`);
    }

    // Date range filter for all items
    if (filters.dateRange) {
      console.log("📅 Adding date filter:", filters.dateRange);
      if (filters.dateRange.start) {
        filterExpressions.push("#date >= :dateStart");
        expressionAttributeNames["#date"] = "date";
        expressionAttributeValues[":dateStart"] = {
          S: filters.dateRange.start,
        };
      }
      if (filters.dateRange.end) {
        filterExpressions.push("#date <= :dateEnd");
        expressionAttributeNames["#date"] = "date";
        expressionAttributeValues[":dateEnd"] = { S: filters.dateRange.end };
      }
    }

    // Build the complete filter expression
    let filterExpression =
      filterExpressions.length > 0
        ? filterExpressions.join(" AND ")
        : undefined;

    console.log("🔧 Final filter expression:", filterExpression);
    console.log("📝 Expression attribute names:", expressionAttributeNames);
    console.log("💎 Expression attribute values:", expressionAttributeValues);

    // Perform DynamoDB scan with filters
    const scanParams: any = {
      TableName: Resource.Db.name,
    };

    // Add ProjectionExpression if fields are specified
    if (filters.fields && filters.fields.length > 0) {
      console.log("🎯 Adding ProjectionExpression for fields:", filters.fields);

      // Always include pk as it's required for the primary key
      const requiredFields = ["pk"];
      const allFields = [...new Set([...requiredFields, ...filters.fields])];

      scanParams.ProjectionExpression = allFields
        .map((_, index) => `#f${index}`)
        .join(", ");

      // Add field names to ExpressionAttributeNames
      allFields.forEach((field, index) => {
        if (!expressionAttributeNames[`#f${index}`]) {
          expressionAttributeNames[`#f${index}`] = field;
        }
      });
    }

    if (filterExpression) {
      scanParams.FilterExpression = filterExpression;
      scanParams.ExpressionAttributeNames = expressionAttributeNames;
      scanParams.ExpressionAttributeValues = expressionAttributeValues;
    }

    console.log(
      "📡 Executing DynamoDB scan with params:",
      JSON.stringify(scanParams, null, 2)
    );

    const scanCommandStartTime = Date.now();
    const command = new ScanCommand(scanParams);
    const result = await client.send(command);
    const scanCommandEndTime = Date.now();

    console.log(
      `⏱️ DynamoDB scan completed in ${
        scanCommandEndTime - scanCommandStartTime
      }ms`
    );
    console.log("📦 DynamoDB scan completed, raw result:", result);

    if (!result.Items) {
      console.log("📭 No items returned from DynamoDB");
      return [];
    }

    let items = result.Items.map((item) => unmarshall(item));
    console.log("🔄 Unmarshalled", items.length, "items from DynamoDB");

    // Separate events and groups for better handling
    const events = items.filter((item) => item.pk?.startsWith("EVENT"));
    const groups = items.filter((item) => item.pk?.startsWith("GROUP"));

    console.log(`📊 Found ${events.length} events and ${groups.length} groups`);

    // Apply client-side cost filtering to all items
    if (
      filters.costRange &&
      (filters.costRange.min !== undefined ||
        filters.costRange.max !== undefined)
    ) {
      console.log("💰 Applying client-side cost filtering");
      const filteredItems = items.filter((item: any) => {
        if (!item.cost) return true;

        let itemCost = 0;
        if (typeof item.cost === "object" && item.cost.amount) {
          itemCost = parseFloat(item.cost.amount);
        } else if (typeof item.cost === "string") {
          itemCost = parseFloat(item.cost) || 0;
        }

        if (
          filters.costRange!.min !== undefined &&
          itemCost < filters.costRange!.min
        ) {
          return false;
        }

        if (
          filters.costRange!.max !== undefined &&
          itemCost > filters.costRange!.max
        ) {
          return false;
        }

        return true;
      });

      // Re-separate filtered items into events and groups
      const filteredEvents = filteredItems.filter((item) =>
        item.pk?.startsWith("EVENT")
      );
      const filteredGroups = filteredItems.filter((item) =>
        item.pk?.startsWith("GROUP")
      );

      console.log(
        "💰 Cost filtering completed, remaining items:",
        filteredItems.length,
        `(${filteredEvents.length} events, ${filteredGroups.length} groups)`
      );

      // Update the events and groups arrays
      events.length = 0;
      events.push(...filteredEvents);
      groups.length = 0;
      groups.push(...filteredGroups);
    }

    // Apply sorting to all items
    if (filters.sortBy) {
      console.log(
        "🔄 Applying sorting by:",
        filters.sortBy,
        "order:",
        filters.sortOrder
      );

      // Sort all items together, then re-separate
      const allItems = [...events, ...groups];

      // Use the sorting utility from dynamodb-sorting.ts
      const { sortEvents } = await import("./dynamodb-sorting");
      const sortedItems = sortEvents(
        allItems,
        filters.sortBy,
        filters.sortOrder === "desc" ? false : true
      );

      // Re-separate sorted items into events and groups
      const sortedEvents = sortedItems.filter((item) =>
        item.pk?.startsWith("EVENT")
      );
      const sortedGroups = sortedItems.filter((item) =>
        item.pk?.startsWith("GROUP")
      );

      // Update the arrays
      events.length = 0;
      events.push(...sortedEvents);
      groups.length = 0;
      groups.push(...sortedGroups);

      console.log(
        `🔄 Sorting completed: ${sortedEvents.length} events, ${sortedGroups.length} groups`
      );
    }

    console.log(
      "✅ Search completed. Final result:",
      events.length,
      "events and",
      groups.length,
      "groups"
    );
    console.log(
      "🔍 Final events:",
      events.map((e) => ({ title: e.title, id: e.pk }))
    );
    console.log(
      "🔍 Final groups:",
      groups.map((g) => ({ title: g.title, id: g.pk }))
    );

    const totalTime = Date.now() - startTime;
    console.log(
      `⏱️ Total searchEventsAndGroups execution time: ${totalTime}ms`
    );

    // Return both events and groups in a structured format
    return {
      events,
      groups,
      total: events.length + groups.length,
    };
  } catch (error) {
    console.error("❌ Error searching events and groups:", error);
    console.error("🔍 Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      filters: filters,
    });
    return {
      events: [],
      groups: [],
      total: 0,
    };
  }
}

// Backward compatibility function - searches only events
export async function searchEvents(filters: {
  query?: string;
  categories?: string[];
  costRange?: { min?: number; max?: number; type?: string };
  location?: string[];
  dateRange?: { start?: string; end?: string };
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  fields?: string[];
}) {
  const result = await searchEventsAndGroups(filters);
  return Array.isArray(result) ? result : result.events;
}

// Add a more efficient search function that uses Query instead of Scan when possible
export async function searchEventsOptimized(filters: {
  query?: string;
  categories?: string[];
  costRange?: { min?: number; max?: number; type?: string };
  location?: string[];
  dateRange?: { start?: string; end?: string };
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  isPublic?: boolean;
  fields?: string[];
}) {
  const startTime = Date.now();
  console.log(
    "🚀 searchEventsOptimized called with filters:",
    JSON.stringify(filters, null, 2)
  );

  try {
    let events: any[] = [];

    // If we have a text query, use the optimized title search
    if (filters.query && filters.query.trim()) {
      console.log("🔍 Using optimized title search for query:", filters.query);
      try {
        events = await searchEventsByTitle(filters);
      } catch (error) {
        console.error(
          "❌ Title search failed, falling back to limited scan:",
          error
        );
        events = await searchEventsWithLimit(filters);
      }
    }
    // If we have specific categories, use GSI-based category search with fallback
    else if (filters.categories && filters.categories.length > 0) {
      console.log(
        "🎯 Using GSI-based search for categories:",
        filters.categories
      );
      try {
        events = await searchEventsByCategories(filters);
      } catch (error) {
        console.error(
          "❌ Category search failed, falling back to limited scan:",
          error
        );
        events = await searchEventsWithLimit(filters);
      }
    }
    // If we have a date range, we can use date-based queries
    else if (
      filters.dateRange &&
      (filters.dateRange.start || filters.dateRange.end)
    ) {
      console.log("📅 Using date-based search");
      try {
        events = await searchEventsByDate(filters);
      } catch (error) {
        console.error(
          "❌ Date search failed, falling back to limited scan:",
          error
        );
        events = await searchEventsWithLimit(filters);
      }
    }
    // Fall back to the original scan method but with limits
    else {
      console.log("⚠️ Falling back to scan method with limits");
      events = await searchEventsWithLimit(filters);
    }

    return events;
  } catch (error) {
    console.error("❌ Error in searchEventsOptimized:", error);
    const totalTime = Date.now() - startTime;
    console.log(`⏱️ searchEventsOptimized failed after ${totalTime}ms`);

    // Final fallback: try the original searchEvents function
    console.log("🔄 Attempting fallback to original searchEvents function");
    try {
      const events = await searchEvents(filters);
      return events;
    } catch (fallbackError) {
      console.error("❌ Fallback searchEvents also failed:", fallbackError);
      return {
        events: [],
        groups: [],
        total: 0,
      };
    }
  }
}

// Helper function to search by categories using scan method
async function searchEventsByCategories(filters: any) {
  const startTime = Date.now();
  console.log(
    "🏷️ Searching by categories using scan method:",
    filters.categories
  );

  try {
    // Use scan method directly since we removed the GSI
    console.log("📊 Using scan method for category search");

    const results = await searchEventsWithLimit(filters);

    const totalTime = Date.now() - startTime;
    console.log(
      `⏱️ Category search completed in ${totalTime}ms, found ${results.length} events`
    );

    return results;
  } catch (error) {
    console.error("❌ Error in category search:", error);
    return [];
  }
}

// Helper function to search by date range
async function searchEventsByDate(filters: any) {
  const startTime = Date.now();
  console.log("📅 Searching by date range:", filters.dateRange);

  try {
    // For now, fall back to limited scan since we don't have a date index
    // In production, you'd want to create a GSI on the date field
    console.log("⚠️ No date index available, using limited scan");
    return await searchEventsWithLimit(filters);
  } catch (error) {
    console.error("❌ Error in date search:", error);
    return await searchEventsWithLimit(filters);
  }
}

// Helper function to search with limits to prevent timeouts
async function searchEventsWithLimit(filters: any) {
  const startTime = Date.now();
  console.log("📊 Using scan with limits");
  console.log("🔍 Filters received:", JSON.stringify(filters, null, 2));

  try {
    // Build basic scan parameters
    const scanParams: any = {
      TableName: Resource.Db.name,
      // Remove the limit to get all matching events
      FilterExpression: "begins_with(#pk, :eventPrefix)",
      ExpressionAttributeNames: {
        "#pk": "pk",
      },
      ExpressionAttributeValues: {
        ":eventPrefix": { S: "EVENT" },
      },
    };

    // Add ProjectionExpression if fields are specified
    if (filters.fields && filters.fields.length > 0) {
      console.log("🎯 Adding ProjectionExpression for fields:", filters.fields);

      // Always include pk as it's required for the primary key
      const requiredFields = ["pk"];
      const allFields = [...new Set([...requiredFields, ...filters.fields])];

      scanParams.ProjectionExpression = allFields
        .map((_, index) => `#f${index}`)
        .join(", ");

      // Add field names to ExpressionAttributeNames
      allFields.forEach((field, index) => {
        scanParams.ExpressionAttributeNames[`#f${index}`] = field;
      });
    }

    // Build the complete filter expression
    let filterExpressions = ["begins_with(#pk, :eventPrefix)"];

    // Add category filter if specified
    if (filters.categories && filters.categories.length > 0) {
      console.log("🏷️ Adding category filter to scan for:", filters.categories);

      // Create OR expression for categories using DynamoDB FilterExpression
      const categoryExpressions = filters.categories.map(
        (category: string, index: number) => {
          const nameKey = `#cat${index}`;
          const valueKey = `:cat${index}`;
          scanParams.ExpressionAttributeNames[nameKey] = "category";
          scanParams.ExpressionAttributeValues[valueKey] = {
            S: category,
          };
          // Use contains for array fields - this will check if the category array contains the specified value
          // For DynamoDB, contains works with both strings and arrays
          return `contains(#cat${index}, :cat${index})`;
        }
      );

      filterExpressions.push(`(${categoryExpressions.join(" OR ")})`);
    }

    // Add isPublic filter
    if (filters.isPublic !== undefined) {
      scanParams.ExpressionAttributeNames["#isPublic"] = "isPublic";
      scanParams.ExpressionAttributeValues[":isPublic"] = {
        S: filters.isPublic.toString(),
      };
      filterExpressions.push("#isPublic = :isPublic");
    } else {
      // Default to only public events if no filter specified
      scanParams.ExpressionAttributeNames["#isPublic"] = "isPublic";
      scanParams.ExpressionAttributeValues[":isPublic"] = { S: "true" };
      filterExpressions.push("#isPublic = :isPublic");
    }

    // Set the final filter expression
    scanParams.FilterExpression = filterExpressions.join(" AND ");

    console.log("🔧 Final scan params:", JSON.stringify(scanParams, null, 2));
    console.log("🔍 Filter expression:", scanParams.FilterExpression);
    console.log(
      "📝 Expression attribute names:",
      scanParams.ExpressionAttributeNames
    );
    console.log(
      "💎 Expression attribute values:",
      scanParams.ExpressionAttributeValues
    );

    const command = new ScanCommand(scanParams);
    const result = await client.send(command);

    const totalTime = Date.now() - startTime;
    console.log(
      `⏱️ Limited scan completed in ${totalTime}ms, found ${
        result.Items?.length || 0
      } events`
    );

    if (!result.Items) return [];

    let events = result.Items.map((item) => unmarshall(item));
    console.log(`🔄 Unmarshalled ${events.length} events from scan`);

    // Apply additional filters client-side (only if not already handled by scan)
    if (
      filters.query ||
      (filters.costRange &&
        (filters.costRange.min !== undefined ||
          filters.costRange.max !== undefined))
    ) {
      events = applyClientSideFilters(events, filters);
    }

    // Apply limit after all filtering is done
    if (filters.limit) {
      events = events.slice(0, filters.limit);
      console.log(
        `📏 Applied limit: ${filters.limit}, final result: ${events.length} events`
      );
    }

    console.log(`🎯 Final result: ${events.length} events after all filtering`);
    return events;
  } catch (error) {
    console.error("❌ Error in limited scan:", error);
    return [];
  }
}

// Helper function to apply filters client-side
function applyClientSideFilters(events: any[], filters: any) {
  console.log("🔧 Applying client-side filters to", events.length, "events");

  if (filters.query) {
    const query = filters.query.toLowerCase();
    events = events.filter(
      (event) =>
        event.title?.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query) ||
        event.venue?.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query)
    );
    console.log(
      "🔍 Text search filtering completed, remaining events:",
      events.length
    );
  }

  // Note: Category filtering is now handled at the DynamoDB level for better performance
  // Only apply cost filtering client-side since it requires complex logic

  if (
    filters.costRange &&
    (filters.costRange.min !== undefined || filters.costRange.max !== undefined)
  ) {
    console.log("💰 Applying client-side cost filtering");
    events = events.filter((event: any) => {
      if (!event.cost) return true;

      let eventCost = 0;
      if (typeof event.cost === "object" && event.cost.amount) {
        eventCost = parseFloat(event.cost.amount);
      } else if (typeof event.cost === "string") {
        eventCost = parseFloat(event.cost) || 0;
      }

      if (
        filters.costRange!.min !== undefined &&
        eventCost < filters.costRange!.min
      ) {
        return false;
      }

      if (
        filters.costRange!.max !== undefined &&
        eventCost > filters.costRange!.max
      ) {
        return false;
      }

      return true;
    });
    console.log(
      "💰 Cost filtering completed, remaining events:",
      events.length
    );
  }

  return events;
}

// Helper function to search by title efficiently
async function searchEventsByTitle(filters: any) {
  const startTime = Date.now();
  const query = filters.query!.trim().toLowerCase();
  console.log("🔍 Searching by title:", query);

  try {
    // Use the title index for efficient searches
    console.log("🚀 Using eventTitleIndex for title search");
    console.log(
      "📊 Index: eventTitleIndex | Partition Key: title | Sort Key: createdAt"
    );

    const queryParams: any = {
      TableName: Resource.Db.name,
      IndexName: "eventTitleIndex",
      KeyConditionExpression: "begins_with(#title, :titlePrefix)",
      FilterExpression:
        "begins_with(#pk, :eventPrefix) AND #isPublic = :isPublic",
      ExpressionAttributeNames: {
        "#title": "title",
        "#pk": "pk",
        "#isPublic": "isPublic",
      },
      ExpressionAttributeValues: {
        ":titlePrefix": { S: query },
        ":eventPrefix": { S: "EVENT" },
        ":isPublic": {
          S: (filters.isPublic !== undefined
            ? filters.isPublic
            : true
          ).toString(),
        },
      },
      Limit: filters.limit || 100,
    };

    // Add ProjectionExpression if fields are specified
    if (filters.fields && filters.fields.length > 0) {
      console.log("🎯 Adding ProjectionExpression for fields:", filters.fields);

      // Always include pk and title as they're required for the index
      const requiredFields = ["pk", "title"];
      const allFields = [...new Set([...requiredFields, ...filters.fields])];

      queryParams.ProjectionExpression = allFields
        .map((_, index) => `#f${index}`)
        .join(", ");

      // Add field names to ExpressionAttributeNames
      allFields.forEach((field, index) => {
        queryParams.ExpressionAttributeNames[`#f${index}`] = field;
      });
    }

    const command = new QueryCommand(queryParams);

    console.log("🔧 Query command details:", {
      indexName: command.input.IndexName,
      keyCondition: command.input.KeyConditionExpression,
      filterExpression: command.input.FilterExpression,
      projectionExpression: command.input.ProjectionExpression,
      tableName: command.input.TableName,
    });

    const result = await client.send(command);
    const totalTime = Date.now() - startTime;

    if (result.Items) {
      const events = result.Items.map((item) => unmarshall(item));
      console.log(
        `⏱️ Title search completed in ${totalTime}ms, found ${events.length} events`
      );
      console.log("✅ Successfully used eventTitleIndex GSI");
      return events;
    }

    return [];
  } catch (error) {
    console.error("❌ Error in title search:", error);
    console.log("🔄 Falling back to limited scan method");
    return await searchEventsWithLimit(filters);
  }
}

export async function createEvent(event: any) {
  try {
    const timestamp = Date.now();

    // Check if eventId is provided in the form data
    let eventId = event.get("eventId");

    if (!eventId) {
      // Generate a unique event ID if none provided
      eventId = `EVENT${Date.now()}`;
    }

    // Check if item exists
    const existingEvent = await getEvent(eventId);

    // Build Item object dynamically from all body properties
    const item: any = {
      pk: { S: eventId },
      sk: { S: eventId },
      updatedAt: { N: timestamp.toString() },
    };

    // If it's a new event, set createdAt
    if (!existingEvent) {
      item.createdAt = { N: timestamp.toString() };
    } else {
      // Keep the original createdAt if updating
      item.createdAt = { N: existingEvent.createdAt.toString() };
    }

    // Collect socials fields
    const socials: { [key: string]: string } = {};

    // Add all other properties from body as strings
    for (const [key, value] of event.entries()) {
      if (key !== "eventId") {
        // Skip eventId as it's already handled
        const stringValue = String(value);

        console.log(
          `🔍 Processing field: ${key} = "${value}" (stringValue: "${stringValue}")`
        );

        // Skip empty values to avoid DynamoDB index issues
        if (!stringValue.trim()) {
          continue;
        }

        // Handle socials fields (socials.website, socials.instagram, etc.)
        if (key.startsWith("socials.")) {
          const socialKey = key.replace("socials.", "");
          socials[socialKey] = stringValue;
          continue; // Skip adding to main item, will handle socials separately
        }

        if (key === "cost") {
          // Handle cost as a JSON object
          try {
            const costObj = JSON.parse(stringValue);
            item[key] = {
              M: {
                type: { S: costObj.type },
                currency: { S: costObj.currency },
                amount: { N: costObj.amount.toString() },
              },
            };
          } catch (error) {
            console.error("Error parsing cost JSON:", error);
            item[key] = { S: stringValue };
          }
        } else if (key === "title") {
          item[key] = { S: stringValue };
          // Add titlePrefix for efficient title searches (first 3 characters)
          const titlePrefix = stringValue.trim().toLowerCase().substring(0, 3);
          if (titlePrefix.length > 0) {
            item.titlePrefix = { S: titlePrefix };
            console.log(
              `🏷️ Added titlePrefix: "${stringValue}" -> "${titlePrefix}"`
            );
          }
        } else if (key === "isPublic") {
          // Handle isPublic field - store as string
          item[key] = { S: stringValue };
          console.log(
            `🔒 isPublic field: "${stringValue}" -> stored as string`
          );
          console.log(`🔒 DynamoDB item[key]:`, JSON.stringify(item[key]));
        } else {
          item[key] = { S: stringValue };
        }
      }
    }

    // Add socials as a map if there are any social media links
    if (Object.keys(socials).length > 0) {
      const socialsMap: { [key: string]: any } = {};
      Object.entries(socials).forEach(([key, value]) => {
        socialsMap[key] = { S: value };
      });
      item.socials = { M: socialsMap };
    }

    // Handle location data specifically (same as seed-data.ts)
    const location = event.get("location");
    const latitude = event.get("latitude");
    const longitude = event.get("longitude");

    if (location) {
      item.location = { S: location };
    }

    // If coordinates are provided, use them; otherwise try to geocode the address
    if (latitude && longitude) {
      item.coordinates = { S: `${latitude},${longitude}` };
      console.log(
        `📍 Event using provided coordinates: ${latitude},${longitude}`
      );
    } else if (location && !latitude && !longitude) {
      // Try to geocode the address to get coordinates
      try {
        console.log(`📍 Geocoding address: ${location}`);
        const geocoded = await geocodeAddress(location);
        if (geocoded) {
          item.coordinates = {
            S: `${geocoded.latitude},${geocoded.longitude}`,
          };
          // Update location with formatted address if geocoding was successful
          item.location = { S: geocoded.formattedAddress };
          console.log(
            `✅ Geocoded to: ${geocoded.latitude},${geocoded.longitude}`
          );
        } else {
          console.log(`❌ Failed to geocode address: ${location}`);
        }
      } catch (error) {
        console.error(`❌ Geocoding error:`, error);
        // Continue without coordinates if geocoding fails
      }
    }

    console.log("📦 Final item to be stored:", JSON.stringify(item, null, 2));

    const command = new PutItemCommand({
      TableName: Resource.Db.name,
      Item: item,
    });

    const result = await client.send(command);

    const action = existingEvent ? "updated" : "created";

    // Create category records for GSI indexing
    try {
      // For now, skip category record creation since we removed the GSI
      console.log("⚠️ Skipping category record creation (GSI removed)");
    } catch (categoryError) {
      console.error("Error in category handling:", categoryError);
      // Don't fail the event creation if category handling fails
    }

    // Send email notification for new events only
    if (!existingEvent) {
      try {
        await sendEventNotificationEmail(event, eventId);
      } catch (emailError) {
        console.error("Error sending event notification email:", emailError);
        // Don't fail the event creation if email fails
      }
    }

    revalidatePath("/");
    return `Event ${action} successfully`;
  } catch (error) {
    console.error("Error creating/updating event:", error);
    return "Error creating/updating event";
  }
}

// Function to send event notification email
async function sendEventNotificationEmail(event: any, eventId: string) {
  try {
    const title = event.get("title") || "Untitled Event";
    const description = event.get("description") || "No description provided";
    const date = event.get("eventDate") || "No date specified";
    const location = event.get("location") || "No location specified";
    const email = event.get("email") || "No email provided";
    const category = event.get("category") || "No category specified";
    const cost = event.get("cost") || "No cost specified";
    const imageUrl = event.get("image_url") || "No image provided";

    // Parse cost for better display
    let costDisplay = cost;
    try {
      const costObj = JSON.parse(cost);
      costDisplay = costObj.type === "free" ? "Free" : `$${costObj.amount}`;
    } catch (e) {
      // Keep original cost if parsing fails
    }

    const emailBody = `🎉 NEW EVENT SUBMITTED ON TOUCHGRASS DC

📋 EVENT DETAILS
================
Title: ${title}
Date: ${date}
Location: ${location}
Cost: ${costDisplay}
Category: ${category}
Submitted by: ${email}

📝 DESCRIPTION
==============
${description}

${
  imageUrl !== "No image provided"
    ? `🖼️ IMAGE
==========
${imageUrl}

`
    : ""
}🔗 QUICK LINKS
==============
View Event: https://touchgrassdc.com/items/${encodeURIComponent(title)}
Event ID: ${eventId}
Submitted: ${new Date().toLocaleString()}

---
This email was automatically generated when a new event was submitted to TouchGrass DC.`.trim();

    // Send email using the same route as other email functions
    const response = await fetch("/api/sendEmail", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: PRIMARY_EMAIL,
        subject: `New Event Submitted: ${title}`,
        body: emailBody,
        from: PRIMARY_EMAIL,
        replyTo: email,
      }),
    });

    if (!response.ok) {
      throw new Error(`Email service returned ${response.status}`);
    }

    console.log("Event notification email sent successfully");
  } catch (error) {
    console.error("Failed to send event notification email:", error);
    // Log the event details as fallback
    console.log("=== EVENT NOTIFICATION FALLBACK ===");
    console.log("New event submitted but email notification failed");
    console.log("Event ID:", eventId);
    console.log("Title:", event.get("title"));
    console.log("Submitted by:", event.get("email"));
    console.log("===============================");
    throw error;
  }
}

export async function deleteEventByTitle(title: string) {
  console.log("Deleting event by title:", title);
  try {
    const event = await getEventByTitle(title);
    if (!event) {
      console.log("Event not found with title:", title);
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Event not found" }),
      };
    }

    console.log("Found event to delete:", event);
    const deleteResult = await deleteEvent(event.pk);
    console.log("Delete result:", deleteResult);

    revalidatePath("/");
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Event deleted successfully" }),
    };
  } catch (error) {
    console.error("Error deleting event by title:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to delete event by title",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
}

// Function to approve an event (make it public)
export async function approveEvent(eventId: string) {
  try {
    console.log(`✅ Approving event: ${eventId}`);

    const command = new UpdateItemCommand({
      TableName: Resource.Db.name,
      Key: {
        pk: { S: eventId },
        sk: { S: eventId },
      },
      UpdateExpression: "SET #isPublic = :isPublic, #updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#isPublic": "isPublic",
        "#updatedAt": "updatedAt",
      },
      ExpressionAttributeValues: {
        ":isPublic": { S: "true" },
        ":updatedAt": { N: Date.now().toString() },
      },
    });

    await client.send(command);

    console.log(`✅ Event ${eventId} approved successfully`);
    revalidatePath("/");
    return `Event approved successfully`;
  } catch (error) {
    console.error(`❌ Error approving event ${eventId}:`, error);
    return "Error approving event";
  }
}

// Function to delete an event
export async function deleteEvent(eventId: string) {
  try {
    console.log(`🗑️ Deleting event: ${eventId}`);

    const command = new DeleteItemCommand({
      TableName: Resource.Db.name,
      Key: {
        pk: { S: eventId },
        sk: { S: eventId },
      },
    });

    await client.send(command);

    console.log(`✅ Event ${eventId} deleted successfully`);
    revalidatePath("/");
    return `Event deleted successfully`;
  } catch (error) {
    console.error(`❌ Error deleting event ${eventId}:`, error);
    return "Error deleting event";
  }
}

export async function deleteMultipleEvents(eventIds: string[]) {
  try {
    if (!eventIds || eventIds.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No event IDs provided" }),
      };
    }

    // BatchWriteItem can handle up to 25 items per request
    const batchSize = 25;
    const batches = [];

    for (let i = 0; i < eventIds.length; i += batchSize) {
      const batch = eventIds.slice(i, i + batchSize);
      batches.push(batch);
    }

    const results = [];

    for (const batch of batches) {
      const deleteRequests = batch.map((eventId) => ({
        DeleteRequest: {
          Key: {
            pk: { S: eventId },
            sk: { S: eventId },
          },
        },
      }));

      const command = new BatchWriteItemCommand({
        RequestItems: {
          [Resource.Db.name]: deleteRequests,
        },
      });

      const result = await client.send(command);
      results.push(result);
    }

    revalidatePath("/");
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Successfully deleted ${eventIds.length} events`,
        deletedCount: eventIds.length,
      }),
    };
  } catch (error) {
    console.error("Error deleting multiple events:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to delete events",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
}

export async function deleteEventsByCategory(category: string) {
  try {
    // First, get all events in the category
    const events = await getEventsByCategory(category);

    if (!events || events.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: `No events found in category: ${category}`,
        }),
      };
    }

    // Extract event IDs
    const eventIds = events.map((event) => event.pk || event.id);

    // Delete them using the batch delete function
    return await deleteMultipleEvents(eventIds);
  } catch (error) {
    console.error("Error deleting events by category:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to delete events by category",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
}

export async function updateEvent(eventId: string, eventData: any) {
  try {
    // Check if item exists
    const existingEvent = await getEvent(eventId);

    if (!existingEvent) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Event not found" }),
      };
    }

    const timestamp = Date.now();

    // Build Item object for update
    const item: any = {
      pk: { S: eventId },
      sk: { S: eventId },
      createdAt: { N: existingEvent.createdAt.toString() }, // Keep original createdAt
      updatedAt: { N: timestamp.toString() },
    };

    // Add all other properties from eventData, preserving data types
    for (const [key, value] of eventData.entries()) {
      if (key !== "eventId") {
        // Skip eventId as it's already handled
        const stringValue = String(value);

        // Skip empty values to avoid DynamoDB index issues
        if (!stringValue.trim()) {
          continue;
        }

        // Handle special fields that should maintain their structure
        if (key === "cost") {
          // Handle cost as a JSON object
          try {
            const costObj = JSON.parse(stringValue);
            item[key] = {
              M: {
                type: { S: costObj.type },
                currency: { S: costObj.currency },
                amount: { N: costObj.amount.toString() },
              },
            };
          } catch (error) {
            console.error("Error parsing cost JSON:", error);
            item[key] = { S: stringValue };
          }
        } else if (key === "category") {
          // Handle category as an array if it's comma-separated
          if (stringValue.includes(",")) {
            const categories = stringValue
              .split(",")
              .map((cat: string) => cat.trim())
              .filter(Boolean);
            item[key] = { L: categories.map((cat) => ({ S: cat })) };
          } else {
            item[key] = { S: stringValue };
          }
        } else if (key === "coordinates") {
          // Handle coordinates as a string (latitude,longitude format)
          item[key] = { S: stringValue };
        } else if (key.startsWith("socials.")) {
          // Handle socials fields - collect them and add as a map
          const socialKey = key.replace("socials.", "");
          if (!item.socials) {
            item.socials = { M: {} };
          }
          item.socials.M[socialKey] = { S: stringValue };
        } else {
          // For other fields, try to detect if it's a number or boolean
          if (stringValue === "true" || stringValue === "false") {
            item[key] = { BOOL: stringValue === "true" };
          } else if (!isNaN(Number(stringValue)) && stringValue.trim() !== "") {
            item[key] = { N: stringValue };
          } else {
            item[key] = { S: stringValue };
          }
        }
      }
    }

    const command = new PutItemCommand({
      TableName: Resource.Db.name,
      Item: item,
    });

    const result = await client.send(command);
    revalidatePath("/");
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Event updated successfully",
        eventId: eventId,
      }),
    };
  } catch (error) {
    console.error("Error updating event:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to update event",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
}

export async function updateEventJson(eventId: string, eventData: any) {
  try {
    // Check if item exists
    const existingEvent = await getEvent(eventId);

    if (!existingEvent) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Event not found" }),
      };
    }

    const timestamp = Date.now();

    // Build Item object for update
    const item: any = {
      pk: { S: eventId },
      sk: { S: eventId },
      createdAt: { N: existingEvent.createdAt.toString() }, // Keep original createdAt
      updatedAt: { N: timestamp.toString() },
    };

    // Helper function to convert values to DynamoDB format recursively
    const convertToDynamoDBFormat = (value: any): any => {
      if (value === null || value === undefined) {
        return undefined; // Skip null/undefined values
      } else if (typeof value === "string") {
        return { S: value };
      } else if (typeof value === "number") {
        return { N: value.toString() };
      } else if (typeof value === "boolean") {
        return { BOOL: value };
      } else if (Array.isArray(value)) {
        return {
          L: value
            .map((v) => convertToDynamoDBFormat(v))
            .filter((v) => v !== undefined),
        };
      } else if (typeof value === "object") {
        // Convert object to DynamoDB map
        const map: { [key: string]: any } = {};
        for (const [objKey, objValue] of Object.entries(value)) {
          const convertedValue = convertToDynamoDBFormat(objValue);
          if (convertedValue !== undefined) {
            map[objKey] = convertedValue;
          }
        }
        return { M: map };
      } else {
        // Fallback to string
        return { S: String(value) };
      }
    };

    // Handle JSON data properly - preserve data types
    for (const [key, value] of Object.entries(eventData)) {
      if (key !== "eventId" && key !== "pk" && key !== "sk") {
        // Skip system fields
        const convertedValue = convertToDynamoDBFormat(value);
        if (convertedValue !== undefined) {
          item[key] = convertedValue;

          // Special handling for title to ensure titlePrefix is updated
          if (key === "title" && typeof value === "string") {
            const titlePrefix = value.trim().toLowerCase().substring(0, 3);
            if (titlePrefix.length > 0) {
              item.titlePrefix = { S: titlePrefix };
              console.log(
                `🏷️ Updated titlePrefix: "${value}" -> "${titlePrefix}"`
              );
            }
          }

          // Special handling for isPublic to ensure it's stored as string
          if (key === "isPublic" && value != null) {
            const stringValue = String(value);
            item[key] = { S: stringValue };
            console.log(
              `🔒 updateEventJSON - isPublic field: "${value}" -> "${stringValue}" (stored as string)`
            );
          }
        }
      }
    }

    const command = new PutItemCommand({
      TableName: Resource.Db.name,
      Item: item,
    });

    const result = await client.send(command);
    revalidatePath("/");
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Event updated successfully",
        eventId: eventId,
      }),
    };
  } catch (error) {
    console.error("Error updating event JSON:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to update event",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
}

// Migration function to add titlePrefix to existing events
export async function migrateEventsWithTitlePrefix() {
  console.log("🔄 Starting migration to add titlePrefix to existing events...");

  try {
    const command = new ScanCommand({
      TableName: Resource.Db.name,
      FilterExpression: "begins_with(#pk, :eventPrefix)",
      ExpressionAttributeNames: {
        "#pk": "pk",
      },
      ExpressionAttributeValues: {
        ":eventPrefix": { S: "EVENT" },
      },
    });

    const result = await client.send(command);

    if (!result.Items || result.Items.length === 0) {
      console.log("📭 No events found to migrate");
      return { migrated: 0, errors: 0 };
    }

    let migrated = 0;
    let errors = 0;

    for (const item of result.Items) {
      try {
        const event = unmarshall(item);

        // Skip if already has titlePrefix
        if (event.titlePrefix) {
          continue;
        }

        // Add titlePrefix if title exists
        if (event.title) {
          const titlePrefix = event.title.trim().toLowerCase().substring(0, 3);
          if (titlePrefix.length > 0) {
            const updateCommand = new UpdateItemCommand({
              TableName: Resource.Db.name,
              Key: {
                pk: { S: event.pk },
                sk: { S: event.sk },
              },
              UpdateExpression: "SET #titlePrefix = :titlePrefix",
              ExpressionAttributeNames: {
                "#titlePrefix": "titlePrefix",
              },
              ExpressionAttributeValues: {
                ":titlePrefix": { S: titlePrefix },
              },
            });

            await client.send(updateCommand);
            migrated++;
            console.log(
              `✅ Migrated event: ${event.title} -> prefix: ${titlePrefix}`
            );
          }
        }
      } catch (error) {
        console.error(`❌ Error migrating event ${item.pk?.S}:`, error);
        errors++;
      }
    }

    console.log(
      `🎉 Migration completed: ${migrated} events migrated, ${errors} errors`
    );
    return { migrated, errors };
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// Function to search events by category using scan method
export async function searchEventsByCategoryGSI(
  category: string,
  filters: any = {}
) {
  try {
    console.log(`🔍 Searching for category "${category}" using scan method`);

    // For now, use scan method since we removed the GSI
    console.log("⚠️ No category index available, using scan method");
    return await searchEventsWithLimit({ ...filters, categories: [category] });
  } catch (error) {
    console.error(
      `❌ Error searching category "${category}" with scan:`,
      error
    );
    return [];
  }
}

// Unified search function for both events and groups
export async function unifiedSearch(filters: {
  query?: string;
  categories?: string[];
  costRange?: { min?: number; max?: number; type?: string };
  location?: string[];
  dateRange?: { start?: string; end?: string };
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  isPublic?: boolean;
  fields?: string[];
  types?: ("event" | "group")[]; // Allow filtering by type
}) {
  const startTime = Date.now();
  console.log(
    "🔍 unifiedSearch called with filters:",
    JSON.stringify(filters, null, 2)
  );

  try {
    const results = {
      events: [] as any[],
      groups: [] as any[],
      total: 0,
    };

    // Determine what types to search for
    const searchTypes = filters.types || ["event", "group"];
    const hasEvents = searchTypes.includes("event");
    const hasGroups = searchTypes.includes("group");

    // Search events if requested
    if (hasEvents) {
      try {
        const eventResults = await searchEventsOptimized(filters);
        results.events = Array.isArray(eventResults)
          ? eventResults
          : eventResults.events || [];
      } catch (error) {
        console.error("❌ Error searching events:", error);
        results.events = [];
      }
    }

    // Search groups if requested
    if (hasGroups) {
      try {
        console.log("🔍 Searching for groups with filters:", {
          query: filters.query,
          categories: filters.categories,
          isPublic: filters.isPublic,
          limit: filters.limit ? Math.floor(filters.limit / 2) : undefined,
        });

        // Use the simpler search function that's more reliable
        const groupResults = await searchGroupsSimple({
          query: filters.query,
          categories: filters.categories,
          isPublic: filters.isPublic,
          limit: filters.limit ? Math.floor(filters.limit / 2) : undefined, // Distribute limit between types
        });

        console.log(
          "✅ Groups search completed, found:",
          groupResults.length,
          "groups"
        );
        if (groupResults.length > 0) {
          console.log("🔍 First group:", groupResults[0]);
        }

        results.groups = groupResults;
      } catch (error) {
        console.error("❌ Error searching groups:", error);
        results.groups = [];
      }
    }

    // Combine and sort results if needed
    if (filters.sortBy && filters.sortOrder) {
      const allItems = [...results.events, ...results.groups];
      const sortedItems = sortItems(
        allItems,
        filters.sortBy,
        filters.sortOrder
      );

      // Re-separate events and groups
      results.events = sortedItems.filter((item) =>
        item.pk?.startsWith("EVENT")
      );
      results.groups = sortedItems.filter((item) =>
        item.pk?.startsWith("GROUP")
      );
    }

    // Apply global limit if specified
    if (filters.limit) {
      const totalItems = results.events.length + results.groups.length;
      if (totalItems > filters.limit) {
        // Distribute limit proportionally
        const eventRatio = results.events.length / totalItems;
        const groupRatio = results.groups.length / totalItems;

        results.events = results.events.slice(
          0,
          Math.floor(filters.limit * eventRatio)
        );
        results.groups = results.groups.slice(
          0,
          Math.floor(filters.limit * groupRatio)
        );
      }
    }

    results.total = results.events.length + results.groups.length;

    const totalTime = Date.now() - startTime;
    console.log(
      `⏱️ Unified search completed in ${totalTime}ms, found ${results.total} total items (${results.events.length} events, ${results.groups.length} groups)`
    );

    return results;
  } catch (error) {
    console.error("❌ Error in unified search:", error);
    return {
      events: [],
      groups: [],
      total: 0,
    };
  }
}

// Helper function to sort items by various fields
function sortItems(items: any[], sortBy: string, sortOrder: "asc" | "desc") {
  return items.sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];

    // Handle different data types
    if (sortBy === "date" || sortBy === "start_date") {
      aValue = new Date(aValue || 0).getTime();
      bValue = new Date(bValue || 0).getTime();
    } else if (sortBy === "title") {
      aValue = (aValue || "").toLowerCase();
      bValue = (bValue || "").toLowerCase();
    } else if (sortBy === "cost") {
      // Extract numeric cost value
      aValue = extractCostValue(a.cost);
      bValue = extractCostValue(b.cost);
    }

    // Handle null/undefined values
    if (aValue == null) aValue = sortOrder === "asc" ? Infinity : -Infinity;
    if (bValue == null) bValue = sortOrder === "asc" ? Infinity : -Infinity;

    if (sortOrder === "asc") {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });
}

// Helper function to extract numeric cost value for sorting
function extractCostValue(cost: any): number {
  if (!cost) return 0;

  if (cost.type === "free") return 0;
  if (cost.type === "variable") return 50; // Default value for variable costs
  if (typeof cost.amount === "number") return cost.amount;
  if (typeof cost.amount === "string") {
    // Handle ranges like "25-58"
    const range = cost.amount.split("-");
    return parseFloat(range[0]) || 0;
  }

  return 0;
}

// Function to validate index usage and performance
export async function validateIndexUsage() {
  console.log("🔍 Validating index usage and performance...");

  try {
    // Test 1: Title search with index
    console.log("\n📝 Test 1: Title search with eventTitleIndex");
    const titleStartTime = Date.now();
    const titleResults = await searchEventsByTitle({
      query: "Music",
      limit: 10,
    });
    const titleTime = Date.now() - titleStartTime;
    console.log(
      `⏱️ Title search took: ${titleTime}ms, found ${titleResults.length} events`
    );

    // Test 2: Category search (using scan)
    console.log("\n🏷️ Test 2: Category search with scan method");
    const categoryStartTime = Date.now();
    const categoryResults = await searchEventsByCategories({
      categories: ["Music"],
      limit: 10,
    });
    const categoryTime = Date.now() - categoryStartTime;
    console.log(
      `⏱️ Category search took: ${categoryTime}ms, found ${categoryResults.length} events`
    );

    // Test 3: Fallback scan (for comparison)
    console.log("\n📊 Test 3: Fallback scan method");
    const scanStartTime = Date.now();
    const scanResults = await searchEventsWithLimit({ limit: 10 });
    const scanTime = Date.now() - scanStartTime;
    console.log(
      `⏱️ Scan method took: ${scanTime}ms, found ${scanResults.length} events`
    );

    // Performance analysis
    console.log("\n📈 Performance Analysis:");
    console.log(
      `Title Index: ${titleTime}ms (${
        titleTime < 1000 ? "✅ Fast" : "⚠️ Slow"
      })`
    );
    console.log(
      `Category Search: ${categoryTime}ms (${
        categoryTime < 1000 ? "✅ Fast" : "⚠️ Slow"
      })`
    );
    console.log(
      `Scan Method: ${scanTime}ms (${scanTime < 1000 ? "✅ Fast" : "⚠️ Slow"})`
    );

    if (titleTime < scanTime) {
      console.log(
        "🎉 Title index is working correctly and providing performance benefits!"
      );
    } else {
      console.log(
        "⚠️ Title index may not be providing expected performance benefits"
      );
    }

    return {
      titleSearch: { time: titleTime, count: titleResults.length },
      categorySearch: { time: categoryTime, count: categoryResults.length },
      scanMethod: { time: scanTime, count: scanResults.length },
    };
  } catch (error) {
    console.error("❌ Index validation failed:", error);
    throw error;
  }
}
