import { DynamoDBClient, UpdateItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

// This implements auto-increment behavior in DynamoDB
export async function getNextId(counterName: string = 'global'): Promise<number> {
  const tableName = process.env.DB_NAME;
  if (!tableName) {
    throw new Error('Table name not configured');
  }

  try {
    // Use atomic update to increment the counter
    const result = await client.send(new UpdateItemCommand({
      TableName: tableName,
      Key: {
        id: { S: `counter-${counterName}` },
        createdAt: { N: '0' }, // Use 0 as sort key for counters
      },
      UpdateExpression: 'SET #value = if_not_exists(#value, :start) + :incr',
      ExpressionAttributeNames: {
        '#value': 'value',
      },
      ExpressionAttributeValues: {
        ':start': { N: '0' },
        ':incr': { N: '1' },
      },
      ReturnValues: 'UPDATED_NEW',
    }));

    return parseInt(result.Attributes?.value?.N || '0');
  } catch (error) {
    console.error('Error getting next ID:', error);
    throw error;
  }
}

// Alternative: Using a separate counter table
export async function getNextIdFromCounterTable(counterName: string = 'global'): Promise<number> {
  const counterTableName = process.env.COUNTER_TABLE_NAME || 'counters';
  
  try {
    const result = await client.send(new UpdateItemCommand({
      TableName: counterTableName,
      Key: {
        counterName: { S: counterName },
      },
      UpdateExpression: 'SET #value = if_not_exists(#value, :start) + :incr',
      ExpressionAttributeNames: {
        '#value': 'value',
      },
      ExpressionAttributeValues: {
        ':start': { N: '0' },
        ':incr': { N: '1' },
      },
      ReturnValues: 'UPDATED_NEW',
    }));

    return parseInt(result.Attributes?.value?.N || '0');
  } catch (error) {
    console.error('Error getting next ID from counter table:', error);
    throw error;
  }
}

// Get current counter value without incrementing
export async function getCurrentCounter(counterName: string = 'global'): Promise<number> {
  const tableName = process.env.DB_NAME;
  if (!tableName) {
    throw new Error('Table name not configured');
  }

  try {
    const result = await client.send(new GetItemCommand({
      TableName: tableName,
      Key: {
        id: { S: `counter-${counterName}` },
        createdAt: { N: '0' },
      },
    }));

    return parseInt(result.Item?.value?.N || '0');
  } catch (error) {
    console.error('Error getting current counter:', error);
    return 0;
  }
} 