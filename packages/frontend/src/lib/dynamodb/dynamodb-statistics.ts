import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { AnalyticsAction } from "../analyticsTrack";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

import { Resource } from "sst";

export async function getTotalVisits(type: AnalyticsAction = "USER_VISIT") {
  try {
    const command = new QueryCommand({
      TableName: Resource.Db.name,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: {
        ":pk": { S: `ANALYTICS#${type}` },
      },
    });

    const result = await client.send(command);
    console.log(
      `Found ${result.Items?.length || 0} visits for action: ${type}`
    );

    return result.Items || [];
  } catch (error) {
    console.error(`Error fetching visits for action ${type}:`, error);
    throw error;
  }
}

export async function getTotalVisitsByDay(
  type: AnalyticsAction = "USER_VISIT"
) {
  try {
    const command = new QueryCommand({
      TableName: Resource.Db.name,
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: {
        ":pk": { S: `ANALYTICS#${type}` },
      },
      ProjectionExpression: "sk",
    });

    const result = await client.send(command);

    // Group by day (parsing TIME#timestamp format)
    const visitsByDay: Record<string, number> = {};

    (result.Items || []).forEach((item) => {
      const sk = item.sk?.S;
      if (sk) {
        // Handle TIME#timestamp format
        if (sk.startsWith("TIME#")) {
          const timestamp = sk.replace("TIME#", "");
          const date = new Date(parseInt(timestamp));
          const dateString = date.toISOString().split("T")[0]; // YYYY-MM-DD format
          visitsByDay[dateString] = (visitsByDay[dateString] || 0) + 1;
        } else {
          // Handle other formats (fallback)
          const date = sk.slice(0, 10);
          visitsByDay[date] = (visitsByDay[date] || 0) + 1;
        }
      }
    });

    return visitsByDay;
  } catch (error) {
    console.error(`Error fetching visits by day for action ${type}:`, error);
    throw error;
  }
}
