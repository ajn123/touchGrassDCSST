import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
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
      // Fetch full items to access properties.ip
    });

    const result = await client.send(command);

    // Group by day and count unique IPs per day
    const visitsByDay: Record<string, number> = {};
    const ipsByDay: Record<string, Set<string>> = {};

    (result.Items || []).forEach((item) => {
      // Unmarshall the DynamoDB item (converts M/S/N formats to JS objects)
      const unmarshalledItem = unmarshall(item);
      const sk = unmarshalledItem.sk as string | undefined;

      // Handle nested properties.M.ip.S structure
      const properties = unmarshalledItem.properties as
        | {
            ip?: string;
          }
        | undefined;
      const ip = properties?.ip;

      if (sk) {
        let dateString: string;

        // Handle TIME#timestamp format
        if (sk.startsWith("TIME#")) {
          const timestamp = sk.replace("TIME#", "");
          const date = new Date(parseInt(timestamp));
          dateString = date.toISOString().split("T")[0]; // YYYY-MM-DD format
        } else {
          // Handle other formats (fallback)
          dateString = sk.slice(0, 10);
        }

        // Initialize the set for this day if it doesn't exist
        if (!ipsByDay[dateString]) {
          ipsByDay[dateString] = new Set<string>();
        }

        // Add IP to the set for this day (only if IP exists and is not empty)
        if (ip && ip.trim().length > 0) {
          ipsByDay[dateString].add(ip);
        }
      }
    });

    // Convert sets to counts (unique users per day)
    Object.keys(ipsByDay).forEach((date) => {
      visitsByDay[date] = ipsByDay[date].size;
    });

    return visitsByDay;
  } catch (error) {
    console.error(`Error fetching visits by day for action ${type}:`, error);
    throw error;
  }
}
