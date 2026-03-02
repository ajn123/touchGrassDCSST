import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { NextRequest, NextResponse } from "next/server";
import { Resource } from "sst";
import * as v from "valibot";

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
});

const SubscribeSchema = v.object({
  email: v.pipe(v.string(), v.email("Invalid email address")),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = v.safeParse(SubscribeSchema, body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.issues[0].message },
        { status: 400 }
      );
    }

    const { email } = result.output;
    const normalizedEmail = email.toLowerCase().trim();
    const pk = `SUBSCRIBER#${normalizedEmail}`;

    // Check if subscriber already exists
    const existing = await client.send(
      new GetItemCommand({
        TableName: Resource.Db.name,
        Key: { pk: { S: pk }, sk: { S: pk } },
      })
    );

    if (existing.Item) {
      if (existing.Item.status?.S === "active") {
        return NextResponse.json({ message: "Already subscribed" });
      }
      // Re-activate if previously unsubscribed
      await client.send(
        new PutItemCommand({
          TableName: Resource.Db.name,
          Item: {
            ...existing.Item,
            status: { S: "active" },
            updatedAt: { N: Date.now().toString() },
          },
        })
      );
      return NextResponse.json({ message: "Subscribed successfully" });
    }

    // Create new subscriber
    const timestamp = Date.now();
    const unsubscribeToken = crypto.randomUUID();

    await client.send(
      new PutItemCommand({
        TableName: Resource.Db.name,
        Item: {
          pk: { S: pk },
          sk: { S: pk },
          email: { S: normalizedEmail },
          status: { S: "active" },
          unsubscribeToken: { S: unsubscribeToken },
          isPublic: { S: "true" },
          createdAt: { N: timestamp.toString() },
          updatedAt: { N: timestamp.toString() },
        },
      })
    );

    return NextResponse.json({ message: "Subscribed successfully" });
  } catch (error) {
    console.error("Error processing newsletter subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
