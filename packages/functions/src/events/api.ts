import { Resource } from "sst";
import { Handler } from "aws-lambda";
import { DynamoDBClient, ScanCommand, PutItemCommand, GetItemCommand, UpdateItemCommand, ConditionalCheckFailedException, DeleteItemCommand } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});


export const getEventById: Handler = async (event) => {
  try {
    const eventId = event.pathParameters?.id;
    
    if (!eventId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Event ID is required'
        }),
      };
    }

    const command = new GetItemCommand({
      TableName: Resource.Db.name,
      Key: {
        pk: { S: `${eventId}` },
        sk: { S: eventId }
      }
    });

    const result = await client.send(command);

    if (!result.Item) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Event not found'
        }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        event: {
          id: result.Item.pk?.S,
          eventName: result.Item.eventName?.S,
          eventDate: result.Item.eventDate?.S,
          createdAt: result.Item.createdAt?.N ? new Date(parseInt(result.Item.createdAt.N)).toISOString() : undefined,
          updatedAt: result.Item.updatedAt?.N ? new Date(parseInt(result.Item.updatedAt.N)).toISOString() : undefined,
        }
      }),
    };
  } catch (error) {
    console.error('Error getting event:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Failed to get event',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};


export const updateEvent: Handler = async (event) => {
  try {
    const eventId = event.pathParameters?.id;
    const body = JSON.parse(event.body || '{}');
    
    if (!eventId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Event ID is required'
        }),
      };
    }

    const { eventName, eventDate } = body;
    const timestamp = Date.now();

    const command = new UpdateItemCommand({
      TableName: Resource.Db.name,
      Key: {
        pk: { S: eventId },
        sk: { S: eventId }
      },
      UpdateExpression: 'SET #eventName = :eventName, #eventDate = :eventDate, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#eventName': 'eventName',
        '#eventDate': 'eventDate',
        '#updatedAt': 'updatedAt'
      },
      ExpressionAttributeValues: {
        ':eventName': { S: eventName },
        ':eventDate': { S: eventDate },
        ':updatedAt': { N: timestamp.toString() }
      },
      ReturnValues: 'ALL_NEW'
    });

    const result = await client.send(command);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Event updated successfully',
        event: result.Attributes
      }),
    };
  } catch (error) {
    console.error('Error updating event:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Failed to update event',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};

