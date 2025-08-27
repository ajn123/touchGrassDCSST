import {
  DynamoDBClient,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { Resource } from "sst";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

// Event-specific sorting function for the search functionality
export function sortEvents(
  events: any[],
  sortBy: string,
  ascending: boolean = true
) {
  console.log(
    `🔄 Sorting ${events.length} events by ${sortBy}, ascending: ${ascending}`
  );

  return events.sort((a, b) => {
    let aValue: any = a[sortBy];
    let bValue: any = b[sortBy];

    // Handle date sorting
    if (sortBy === "date") {
      aValue = new Date(aValue || 0);
      bValue = new Date(bValue || 0);
    }

    // Handle cost sorting
    if (sortBy === "cost") {
      aValue =
        typeof aValue === "object"
          ? parseFloat(aValue.amount)
          : parseFloat(aValue) || 0;
      bValue =
        typeof bValue === "object"
          ? parseFloat(bValue.amount)
          : parseFloat(bValue) || 0;
    }

    // Handle title sorting (case-insensitive)
    if (sortBy === "title") {
      aValue = (aValue || "").toLowerCase();
      bValue = (bValue || "").toLowerCase();
    }

    // Handle venue/location sorting (case-insensitive)
    if (sortBy === "venue" || sortBy === "location") {
      aValue = (aValue || "").toLowerCase();
      bValue = (bValue || "").toLowerCase();
    }

    // Handle numeric values
    if (typeof aValue === "number" && typeof bValue === "number") {
      return ascending ? aValue - bValue : bValue - aValue;
    }

    // Handle string values
    if (typeof aValue === "string" && typeof bValue === "string") {
      return ascending
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    // Handle date objects
    if (aValue instanceof Date && bValue instanceof Date) {
      return ascending
        ? aValue.getTime() - bValue.getTime()
        : bValue.getTime() - aValue.getTime();
    }

    // Fallback for undefined/null values
    if (aValue === undefined || aValue === null) return ascending ? -1 : 1;
    if (bValue === undefined || bValue === null) return ascending ? 1 : -1;

    return 0;
  });
}

// 1. Sort by application (after Scan) - Not recommended for large datasets
export async function scanAndSort(field: string, ascending: boolean = true) {
  const tableName = Resource.Db.name;
  if (!tableName) throw new Error("Table name not configured");

  const result = await client.send(
    new ScanCommand({
      TableName: tableName,
    })
  );

  const items =
    result.Items?.map((item) => ({
      id: item.id?.S,
      createdAt: item.createdAt?.N ? parseInt(item.createdAt.N) : undefined,
      name: item.name?.S,
      // Add other fields as needed
    })) || [];

  // Sort in application
  items.sort((a, b) => {
    const aValue = a[field as keyof typeof a];
    const bValue = b[field as keyof typeof b];

    if (aValue === undefined || bValue === undefined) return 0;

    if (typeof aValue === "number" && typeof bValue === "number") {
      return ascending ? aValue - bValue : bValue - aValue;
    }

    if (typeof aValue === "string" && typeof bValue === "string") {
      return ascending
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return 0;
  });

  return items;
}

// 2. Query with range key sorting (efficient for specific partition)
export async function queryWithSort(
  partitionKey: string,
  ascending: boolean = true
) {
  const tableName = Resource.Db.name;
  if (!tableName) throw new Error("Table name not configured");

  const result = await client.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: {
        ":id": { S: partitionKey },
      },
      ScanIndexForward: ascending, // true = ascending, false = descending
    })
  );

  return (
    result.Items?.map((item) => ({
      id: item.id?.S,
      createdAt: item.createdAt?.N ? parseInt(item.createdAt.N) : undefined,
      name: item.name?.S,
    })) || []
  );
}

// 3. Query all items using a GSI (Global Secondary Index)
export async function queryWithGSI(
  indexName: string,
  ascending: boolean = true
) {
  const tableName = Resource.Db.name;
  if (!tableName) throw new Error("Table name not configured");

  const result = await client.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: indexName, // You need to create this GSI
      ScanIndexForward: ascending,
    })
  );

  return (
    result.Items?.map((item) => ({
      id: item.id?.S,
      createdAt: item.createdAt?.N ? parseInt(item.createdAt.N) : undefined,
      name: item.name?.S,
    })) || []
  );
}

// 4. Paginated scan with sorting (for large datasets)
export async function scanWithPaginationAndSort(
  field: string,
  ascending: boolean = true,
  limit: number = 10,
  lastEvaluatedKey?: any
) {
  const tableName = Resource.Db.name;
  if (!tableName) throw new Error("Table name not configured");

  const result = await client.send(
    new ScanCommand({
      TableName: tableName,
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
    })
  );

  const items =
    result.Items?.map((item) => ({
      id: item.id?.S,
      createdAt: item.createdAt?.N ? parseInt(item.createdAt.N) : undefined,
      name: item.name?.S,
    })) || [];

  // Sort the current page
  items.sort((a, b) => {
    const aValue = a[field as keyof typeof a];
    const bValue = b[field as keyof typeof b];

    if (aValue === undefined || bValue === undefined) return 0;

    if (typeof aValue === "number" && typeof bValue === "number") {
      return ascending ? aValue - bValue : bValue - aValue;
    }

    if (typeof aValue === "string" && typeof bValue === "string") {
      return ascending
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return 0;
  });

  return {
    items,
    lastEvaluatedKey: result.LastEvaluatedKey,
    hasMore: !!result.LastEvaluatedKey,
  };
}

// 5. Sort by multiple fields
export async function scanAndSortByMultiple(
  fields: Array<{ field: string; ascending: boolean }>
) {
  const tableName = Resource.Db.name;
  if (!tableName) throw new Error("Table name not configured");

  const result = await client.send(
    new ScanCommand({
      TableName: tableName,
    })
  );

  const items =
    result.Items?.map((item) => ({
      id: item.id?.S,
      createdAt: item.createdAt?.N ? parseInt(item.createdAt.N) : undefined,
      name: item.name?.S,
    })) || [];

  // Sort by multiple fields
  items.sort((a, b) => {
    for (const { field, ascending } of fields) {
      const aValue = a[field as keyof typeof a];
      const bValue = b[field as keyof typeof b];

      if (aValue === undefined || bValue === undefined) continue;

      if (typeof aValue === "number" && typeof bValue === "number") {
        const comparison = ascending ? aValue - bValue : bValue - aValue;
        if (comparison !== 0) return comparison;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        const comparison = ascending
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
        if (comparison !== 0) return comparison;
      }
    }

    return 0;
  });

  return items;
}

// Helper method to convert values to proper DynamoDB data types
function convertToDynamoDBFormat(value: any): any {
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
    // Handle nested dictionaries - recurse down
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
}
