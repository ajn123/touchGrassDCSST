import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { Resource } from "sst";

export const handler = async (sqsEvent: any) => {
  for (const record of sqsEvent.Records) {
    const event = JSON.parse(record.body);

    console.log("EVENT", event);

    const command = new PutItemCommand({
      TableName: Resource.Db.name,
      Item: {
        pk: { S: `USER#${event.userId}` },
        sk: { S: `TIME#${Date.now()}` },
        data: { S: JSON.stringify(event) },
      },
    });

    const client = new DynamoDBClient({
      region: "us-east-1",
    });

    await client.send(command);
  }
};
