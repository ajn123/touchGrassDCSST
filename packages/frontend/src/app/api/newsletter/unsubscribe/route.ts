import {
  DynamoDBClient,
  ScanCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { NextRequest, NextResponse } from "next/server";
import { Resource } from "sst";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      new URL("/newsletter/unsubscribed?error=missing_token", request.url)
    );
  }

  try {
    // Find subscriber by unsubscribe token
    const scanResult = await client.send(
      new ScanCommand({
        TableName: Resource.Db.name,
        FilterExpression:
          "begins_with(pk, :prefix) AND unsubscribeToken = :token",
        ExpressionAttributeValues: {
          ":prefix": { S: "SUBSCRIBER#" },
          ":token": { S: token },
        },
      })
    );

    if (!scanResult.Items || scanResult.Items.length === 0) {
      return NextResponse.redirect(
        new URL("/newsletter/unsubscribed?error=invalid_token", request.url)
      );
    }

    const subscriber = scanResult.Items[0];
    const pk = subscriber.pk?.S;
    const sk = subscriber.sk?.S;

    if (!pk || !sk) {
      return NextResponse.redirect(
        new URL("/newsletter/unsubscribed?error=invalid_token", request.url)
      );
    }

    // Update subscriber status to unsubscribed
    await client.send(
      new UpdateItemCommand({
        TableName: Resource.Db.name,
        Key: { pk: { S: pk }, sk: { S: sk } },
        UpdateExpression: "SET #status = :status, updatedAt = :updatedAt",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":status": { S: "unsubscribed" },
          ":updatedAt": { N: Date.now().toString() },
        },
      })
    );

    return NextResponse.redirect(
      new URL("/newsletter/unsubscribed", request.url)
    );
  } catch (error) {
    console.error("Error processing unsubscribe:", error);
    return NextResponse.redirect(
      new URL("/newsletter/unsubscribed?error=server_error", request.url)
    );
  }
}
