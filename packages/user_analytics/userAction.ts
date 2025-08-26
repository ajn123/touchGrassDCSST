import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { Resource } from "sst";

export const handler = async (sqsEvent: any) => {
  for (const record of sqsEvent.Records) {
    const event = JSON.parse(record.body);

    // console.log("Properties", event.properties);
    // console.log("Action", event.action);
    // console.log("UserId", event.userId);

    // Convert all properties to DynamoDB string attributes
    const properties = event.properties || {};
    const stringifiedProperties: { [key: string]: { S: string } } = {};
    for (const [key, value] of Object.entries(properties)) {
      stringifiedProperties[key] = { S: String(value) };
    }

    const command = new PutItemCommand({
      TableName: Resource.Db.name,
      Item: {
        pk: { S: `USER#${event.userId}` },
        sk: { S: `TIME#${Date.now()}` },
        action: { S: event.action || "USER_ACTION" },
        data: { M: stringifiedProperties }, // Store as a map/dictionary with fallback to empty object
      },
    });

    const client = new DynamoDBClient({
      region: "us-east-1",
    });

    await client.send(command);
  }
};
