import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { Resource } from "sst";

// Helper method to convert values to proper DynamoDB data types
function convertToDynamoDBFormat(value: any, isTopLevel = false): any {
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
        .map((v) => convertToDynamoDBFormat(v, false))
        .filter((v) => v !== undefined),
    };
  } else if (typeof value === "object") {
    // Handle nested dictionaries - recurse down
    const map: { [key: string]: any } = {};
    for (const [objKey, objValue] of Object.entries(value)) {
      const convertedValue = convertToDynamoDBFormat(objValue, false);
      if (convertedValue !== undefined) {
        map[objKey] = convertedValue;
      }
    }

    // If this is the top level, return the map directly without wrapping
    if (isTopLevel) {
      return map;
    }

    return { M: map };
  } else {
    // Fallback to string
    return { S: String(value) };
  }
}

export const handler = async (sqsEvent: any) => {
  for (const record of sqsEvent.Records) {
    const event = JSON.parse(record.body);

    // Ensure pk and sk are set before conversion
    const eventWithKeys = {
      ...event,
      pk: event.pk,
      sk: event.sk,
    };

    // Convert the entire event to DynamoDB format (top level)
    const convertedItem = convertToDynamoDBFormat(eventWithKeys, true);

    console.log("Converted Item", JSON.stringify(convertedItem, null, 2));

    const command = new PutItemCommand({
      TableName: Resource.Db.name,
      Item: convertedItem,
    });

    const client = new DynamoDBClient({
      region: "us-east-1",
    });

    await client.send(command);
  }
};
