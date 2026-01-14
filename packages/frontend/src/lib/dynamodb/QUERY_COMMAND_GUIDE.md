# DynamoDB QueryCommand Guide

## Overview

`QueryCommand` is more efficient than `ScanCommand` because it:
- Only reads items matching specific key conditions
- Can use indexes (GSI/LSI) for faster lookups
- Is cheaper and faster than scanning the entire table

## Key Concepts

### 1. **Primary Key Query** (Table or Index)
Query by partition key (required) and optionally sort key (range).

### 2. **Global Secondary Index (GSI) Query**
Query using a GSI when you need to query by different attributes.

### 3. **Key Condition Expression**
Required - specifies which items to retrieve. Must use partition key, can optionally use sort key.

### 4. **Filter Expression**
Optional - filters results after retrieval (applied client-side, still charged).

## Basic Syntax

```typescript
import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });

const command = new QueryCommand({
  TableName: "your-table-name",
  // Required: Key condition (must include partition key)
  KeyConditionExpression: "pk = :pk",
  // Optional: Filter expression (applied after retrieval)
  FilterExpression: "begins_with(#title, :prefix)",
  // Required: Attribute names (for reserved words)
  ExpressionAttributeNames: {
    "#title": "title",
  },
  // Required: Attribute values
  ExpressionAttributeValues: {
    ":pk": { S: "EVENT-123" },
    ":prefix": { S: "Summer" },
  },
  // Optional: Use GSI
  IndexName: "publicEventsIndex",
  // Optional: Pagination
  ExclusiveStartKey: lastEvaluatedKey,
  // Optional: Limit results
  Limit: 100,
  // Optional: Sort order (true = ascending, false = descending)
  ScanIndexForward: true,
});

const result = await client.send(command);
const items = result.Items?.map(item => unmarshall(item)) || [];
```

## Examples from Your Codebase

### Example 1: Query Public Events (GSI Query)

```typescript
// From: TouchGrassDynamoDB.ts - getEvents()
const command = new QueryCommand({
  TableName: this.tableName,
  IndexName: "publicEventsIndex", // Use GSI
  KeyConditionExpression: "#isPublic = :isPublic", // Partition key condition
  FilterExpression: "begins_with(#pk, :eventPrefix)", // Filter after retrieval
  ExpressionAttributeNames: {
    "#isPublic": "isPublic",
    "#pk": "pk",
  },
  ExpressionAttributeValues: {
    ":isPublic": { S: "true" },
    ":eventPrefix": { S: "EVENT-" },
  },
  ExclusiveStartKey: lastEvaluatedKey, // Pagination
});
```

**Why this works:**
- `publicEventsIndex` GSI has `isPublic` as hash key
- Query finds all items where `isPublic = "true"`
- Filter then narrows to events starting with "EVENT-"

### Example 2: Query by Title (GSI Query)

```typescript
// From: TouchGrassDynamoDB.ts - searchEventsByTitle()
const command = new QueryCommand({
  TableName: this.tableName,
  IndexName: "eventTitleIndex", // GSI with title as hash key
  KeyConditionExpression: "begins_with(#title, :titlePrefix)",
  FilterExpression: "#isPublic = :isPublic",
  ExpressionAttributeNames: {
    "#title": "title",
    "#isPublic": "isPublic",
  },
  ExpressionAttributeValues: {
    ":titlePrefix": { S: "Summer" },
    ":isPublic": { S: "true" },
  },
  Limit: 100,
});
```

### Example 3: Query Public Groups (GSI Query)

```typescript
// From: dynamodb-groups.ts - getPublicGroups()
const command = new QueryCommand({
  TableName: Resource.Db.name,
  IndexName: "publicEventsIndex",
  KeyConditionExpression: "#isPublic = :isPublic",
  FilterExpression: "begins_with(pk, :groupPrefix) AND #sk = :groupInfo",
  ExpressionAttributeNames: {
    "#isPublic": "isPublic",
    "#sk": "sk",
  },
  ExpressionAttributeValues: {
    ":isPublic": { S: "true" },
    ":groupPrefix": { S: "GROUP#" },
    ":groupInfo": { S: "GROUP_INFO" },
  },
});
```

## Key Condition Expression Operators

### Equality (=)
```typescript
KeyConditionExpression: "pk = :pk"
```

### Begins With (begins_with)
```typescript
KeyConditionExpression: "begins_with(title, :prefix)"
// Only works on sort key or GSI sort key
```

### Between (BETWEEN)
```typescript
KeyConditionExpression: "pk = :pk AND createdAt BETWEEN :start AND :end"
ExpressionAttributeValues: {
  ":pk": { S: "EVENT-123" },
  ":start": { N: "1000" },
  ":end": { N: "2000" },
}
```

### Comparison (<, <=, >, >=)
```typescript
KeyConditionExpression: "pk = :pk AND createdAt > :timestamp"
// Only works on sort key
```

## Filter Expression Operators

Filter expressions work on any attribute (not just keys):

```typescript
// Equality
FilterExpression: "#status = :status"

// Comparison
FilterExpression: "#price > :minPrice"

// Contains
FilterExpression: "contains(#tags, :tag)"

// Begins with
FilterExpression: "begins_with(#title, :prefix)"

// Multiple conditions
FilterExpression: "#status = :status AND #price > :minPrice"

// OR conditions
FilterExpression: "#category = :cat1 OR #category = :cat2"
```

## Pagination Pattern

Always handle pagination for large datasets:

```typescript
const allItems: any[] = [];
let lastEvaluatedKey: any = undefined;

do {
  const command = new QueryCommand({
    TableName: this.tableName,
    IndexName: "publicEventsIndex",
    KeyConditionExpression: "#isPublic = :isPublic",
    ExpressionAttributeNames: {
      "#isPublic": "isPublic",
    },
    ExpressionAttributeValues: {
      ":isPublic": { S: "true" },
    },
    ExclusiveStartKey: lastEvaluatedKey, // Continue from last key
  });

  const result = await client.send(command);
  
  if (result.Items) {
    const items = result.Items.map(item => unmarshall(item));
    allItems.push(...items);
  }

  lastEvaluatedKey = result.LastEvaluatedKey; // Get next page key
} while (lastEvaluatedKey); // Continue if more pages exist
```

## DynamoDB Attribute Value Types

When using `QueryCommand`, values must be in DynamoDB format:

```typescript
ExpressionAttributeValues: {
  ":string": { S: "text" },           // String
  ":number": { N: "123" },             // Number (as string!)
  ":boolean": { BOOL: true },          // Boolean
  ":list": { L: [{ S: "item1" }] },   // List
  ":map": { M: { key: { S: "value" } } }, // Map
  ":null": { NULL: true },             // Null
  ":binary": { B: Buffer.from("data") }, // Binary
}
```

## Common Patterns

### 1. Query All Items in a Partition

```typescript
KeyConditionExpression: "pk = :pk"
ExpressionAttributeValues: {
  ":pk": { S: "EVENT-123" },
}
```

### 2. Query with Sort Key Range

```typescript
KeyConditionExpression: "pk = :pk AND createdAt BETWEEN :start AND :end"
ExpressionAttributeValues: {
  ":pk": { S: "EVENT-123" },
  ":start": { N: "1000" },
  ":end": { N: "2000" },
}
```

### 3. Query Latest Items (Descending)

```typescript
const command = new QueryCommand({
  TableName: this.tableName,
  IndexName: "publicEventsIndex",
  KeyConditionExpression: "#isPublic = :isPublic",
  ScanIndexForward: false, // false = descending (newest first)
  Limit: 10, // Get top 10
  ExpressionAttributeValues: {
    ":isPublic": { S: "true" },
  },
});
```

### 4. Query with Projection (Select Specific Fields)

```typescript
const command = new QueryCommand({
  TableName: this.tableName,
  KeyConditionExpression: "pk = :pk",
  ProjectionExpression: "#title, #date, #location", // Only return these fields
  ExpressionAttributeNames: {
    "#title": "title",
    "#date": "start_date",
    "#location": "location",
  },
  ExpressionAttributeValues: {
    ":pk": { S: "EVENT-123" },
  },
});
```

## Best Practices

1. **Use GSI for non-primary key queries** - Much faster than scanning
2. **Always paginate** - DynamoDB has 1MB limit per request
3. **Use FilterExpression sparingly** - It's applied after retrieval (still charged)
4. **Prefer KeyConditionExpression** - Applied before retrieval (more efficient)
5. **Use ProjectionExpression** - Reduces data transfer and cost
6. **Handle errors gracefully** - Fallback to Scan if GSI doesn't exist

## Query vs Scan

| Feature | Query | Scan |
|---------|-------|------|
| Speed | Fast (direct lookup) | Slow (reads all items) |
| Cost | Lower | Higher |
| Use Case | Known partition key | Unknown keys |
| Index | Can use GSI/LSI | Table only |
| Filter | After retrieval | After retrieval |

## Your Available Indexes

From `infra/db.ts`:

1. **publicEventsIndex** - `isPublic` (hash) → `createdAt` (range)
   - Use for: Querying public events
   
2. **eventCategoryIndex** - `category` (hash) → `createdAt` (range)
   - Use for: Querying events by category
   
3. **eventTitleIndex** - `title` (hash) → `createdAt` (range)
   - Use for: Querying events by title prefix
   
4. **createdAtIndex** - `createdAt` (hash) → `pk` (range)
   - Use for: Querying by creation time

## Error Handling

```typescript
try {
  const result = await client.send(command);
  return result.Items?.map(item => unmarshall(item)) || [];
} catch (error: any) {
  if (error.name === "ResourceNotFoundException") {
    console.error("Table or index not found");
    // Fallback to scan or return empty
    return [];
  }
  if (error.name === "ValidationException") {
    console.error("Invalid query parameters:", error.message);
    throw error;
  }
  throw error;
}
```

