import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

// Example 1: Simple partition key query
export async function getUserEvents(userId: string) {
  const command = new QueryCommand({
    TableName: process.env.DB_NAME,
    KeyConditionExpression: "pk = :pk",
    ExpressionAttributeValues: {
      ":pk": { S: `USER#${userId}` }
    }
  });

  const result = await client.send(command);
  return result.Items;
}

// Example 2: Partition key + sort key range query
export async function getEventsByDateRange(userId: string, startDate: string, endDate: string) {
  const command = new QueryCommand({
    TableName: process.env.DB_NAME,
    KeyConditionExpression: "pk = :pk AND sk BETWEEN :start AND :end",
    ExpressionAttributeValues: {
      ":pk": { S: `USER#${userId}` },
      ":start": { S: `EVENT#${startDate}` },
      ":end": { S: `EVENT#${endDate}` }
    }
  });

  const result = await client.send(command);
  return result.Items;
}

// Example 3: Using begins_with for sort key
export async function getEventsByPrefix(userId: string, prefix: string) {
  const command = new QueryCommand({
    TableName: process.env.DB_NAME,
    KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
    ExpressionAttributeValues: {
      ":pk": { S: `USER#${userId}` },
      ":prefix": { S: prefix }
    }
  });

  const result = await client.send(command);
  return result.Items;
}

// Example 4: Using Global Secondary Index
export async function getEventsByOrganizer(organizerId: string) {
  const command = new QueryCommand({
    TableName: process.env.DB_NAME,
    IndexName: "userEventsIndex",
    KeyConditionExpression: "organizerId = :organizerId",
    ExpressionAttributeValues: {
      ":organizerId": { S: organizerId }
    }
  });

  const result = await client.send(command);
  return result.Items;
}

// Example 5: With filtering
export async function getActiveEvents(userId: string) {
  const command = new QueryCommand({
    TableName: process.env.DB_NAME,
    KeyConditionExpression: "pk = :pk",
    FilterExpression: "eventStatus = :status",
    ExpressionAttributeValues: {
      ":pk": { S: `USER#${userId}` },
      ":status": { S: "ACTIVE" }
    }
  });

  const result = await client.send(command);
  return result.Items;
}

// Example 6: With projection (selecting specific fields)
export async function getEventSummaries(userId: string) {
  const command = new QueryCommand({
    TableName: process.env.DB_NAME,
    KeyConditionExpression: "pk = :pk",
    ProjectionExpression: "pk, sk, eventName, eventDate",
    ExpressionAttributeValues: {
      ":pk": { S: `USER#${userId}` }
    }
  });

  const result = await client.send(command);
  return result.Items;
}

// Example 7: With pagination
export async function getEventsPaginated(userId: string, limit: number = 10, lastKey?: any) {
  const command = new QueryCommand({
    TableName: process.env.DB_NAME,
    KeyConditionExpression: "pk = :pk",
    ExpressionAttributeValues: {
      ":pk": { S: `USER#${userId}` }
    },
    Limit: limit,
    ExclusiveStartKey: lastKey
  });

  const result = await client.send(command);
  return {
    items: result.Items,
    lastEvaluatedKey: result.LastEvaluatedKey
  };
}

// Example 8: Complex query with multiple conditions
export async function getFilteredEvents(userId: string, filters: {
  startDate?: string;
  endDate?: string;
  status?: string;
  limit?: number;
}) {
  let keyConditionExpression = "pk = :pk";
  let expressionAttributeValues: any = {
    ":pk": { S: `USER#${userId}` }
  };
  let filterExpression: string | undefined;

  // Add date range if provided
  if (filters.startDate && filters.endDate) {
    keyConditionExpression += " AND sk BETWEEN :start AND :end";
    expressionAttributeValues[":start"] = { S: `EVENT#${filters.startDate}` };
    expressionAttributeValues[":end"] = { S: `EVENT#${filters.endDate}` };
  }

  // Add status filter if provided
  if (filters.status) {
    filterExpression = "eventStatus = :status";
    expressionAttributeValues[":status"] = { S: filters.status };
  }

  const command = new QueryCommand({
    TableName: process.env.DB_NAME,
    KeyConditionExpression: keyConditionExpression,
    FilterExpression: filterExpression,
    ExpressionAttributeValues: expressionAttributeValues,
    Limit: filters.limit
  });

  const result = await client.send(command);
  return result.Items;
}

// Example 9: Query with reserved words
export async function getEventsByType(userId: string, eventType: string) {
  const command = new QueryCommand({
    TableName: process.env.DB_NAME,
    KeyConditionExpression: "pk = :pk",
    FilterExpression: "#type = :eventType",
    ExpressionAttributeNames: {
      "#type": "type" // 'type' is a reserved word
    },
    ExpressionAttributeValues: {
      ":pk": { S: `USER#${userId}` },
      ":eventType": { S: eventType }
    }
  });

  const result = await client.send(command);
  return result.Items;
}

// Example 10: Query with sorting (using GSI)
export async function getEventsSortedByDate(userId: string, ascending: boolean = true) {
  const command = new QueryCommand({
    TableName: process.env.DB_NAME,
    IndexName: "createdAtIndex",
    KeyConditionExpression: "createdAt = :createdAt",
    ExpressionAttributeValues: {
      ":createdAt": { N: Date.now().toString() }
    },
    ScanIndexForward: ascending // true for ascending, false for descending
  });

  const result = await client.send(command);
  return result.Items;
} 