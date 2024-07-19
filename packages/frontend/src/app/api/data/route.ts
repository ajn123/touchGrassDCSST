import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { NextResponse } from 'next/server';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

export async function GET() {
  try {
    const tableName = process.env.DB_NAME;
    
    if (!tableName) {
      return NextResponse.json(
        { error: 'Database table name not configured' },
        { status: 500 }
      );
    }

    const command = new QueryCommand({
      TableName: tableName,
      // You can add specific query parameters here
      // For example, to get all items:
      // KeyConditionExpression: "id = :id",
      // ExpressionAttributeValues: {
      //   ":id": { S: "some-id" }
      // }
    });

    const result = await client.send(command);
    
    // Transform DynamoDB format to regular JSON
    const items = result.Items?.map(item => ({
      id: item.id?.S,
      createdAt: item.createdAt?.N ? parseInt(item.createdAt.N) : undefined,
      // Add other fields as needed
    })) || [];

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error querying DynamoDB:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data from database' },
      { status: 500 }
    );
  }
} 