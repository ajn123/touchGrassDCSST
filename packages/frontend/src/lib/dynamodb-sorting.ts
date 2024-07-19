import { DynamoDBClient, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

// 1. Sort by application (after Scan) - Not recommended for large datasets
export async function scanAndSort(field: string, ascending: boolean = true) {
  const tableName = process.env.DB_NAME;
  if (!tableName) throw new Error('Table name not configured');

  const result = await client.send(new ScanCommand({
    TableName: tableName,
  }));

  const items = result.Items?.map(item => ({
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
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return ascending ? aValue - bValue : bValue - aValue;
    }
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return ascending ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }
    
    return 0;
  });

  return items;
}

// 2. Query with range key sorting (efficient for specific partition)
export async function queryWithSort(partitionKey: string, ascending: boolean = true) {
  const tableName = process.env.DB_NAME;
  if (!tableName) throw new Error('Table name not configured');

  const result = await client.send(new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: "id = :id",
    ExpressionAttributeValues: {
      ":id": { S: partitionKey }
    },
    ScanIndexForward: ascending, // true = ascending, false = descending
  }));

  return result.Items?.map(item => ({
    id: item.id?.S,
    createdAt: item.createdAt?.N ? parseInt(item.createdAt.N) : undefined,
    name: item.name?.S,
  })) || [];
}

// 3. Query all items using a GSI (Global Secondary Index)
export async function queryWithGSI(indexName: string, ascending: boolean = true) {
  const tableName = process.env.DB_NAME;
  if (!tableName) throw new Error('Table name not configured');

  const result = await client.send(new QueryCommand({
    TableName: tableName,
    IndexName: indexName, // You need to create this GSI
    ScanIndexForward: ascending,
  }));

  return result.Items?.map(item => ({
    id: item.id?.S,
    createdAt: item.createdAt?.N ? parseInt(item.createdAt.N) : undefined,
    name: item.name?.S,
  })) || [];
}

// 4. Paginated scan with sorting (for large datasets)
export async function scanWithPaginationAndSort(
  field: string, 
  ascending: boolean = true,
  limit: number = 10,
  lastEvaluatedKey?: any
) {
  const tableName = process.env.DB_NAME;
  if (!tableName) throw new Error('Table name not configured');

  const result = await client.send(new ScanCommand({
    TableName: tableName,
    Limit: limit,
    ExclusiveStartKey: lastEvaluatedKey,
  }));

  const items = result.Items?.map(item => ({
    id: item.id?.S,
    createdAt: item.createdAt?.N ? parseInt(item.createdAt.N) : undefined,
    name: item.name?.S,
  })) || [];

  // Sort the current page
  items.sort((a, b) => {
    const aValue = a[field as keyof typeof a];
    const bValue = b[field as keyof typeof b];
    
    if (aValue === undefined || bValue === undefined) return 0;
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return ascending ? aValue - bValue : bValue - aValue;
    }
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return ascending ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
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
export async function scanAndSortByMultiple(fields: Array<{field: string, ascending: boolean}>) {
  const tableName = process.env.DB_NAME;
  if (!tableName) throw new Error('Table name not configured');

  const result = await client.send(new ScanCommand({
    TableName: tableName,
  }));

  const items = result.Items?.map(item => ({
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
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        const comparison = ascending ? aValue - bValue : bValue - aValue;
        if (comparison !== 0) return comparison;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = ascending ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        if (comparison !== 0) return comparison;
      }
    }
    
    return 0;
  });

  return items;
} 