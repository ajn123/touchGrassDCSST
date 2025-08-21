import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { NextRequest, NextResponse } from "next/server";
import { Resource } from "sst";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { event, userId, properties } = body;

  properties.device = "desktop";
  properties.timestamp = Date.now();

  console.log("EVENT TRACKED", Resource.user_analytics.url);

  const sqs = new SQSClient({});
  await sqs.send(
    new SendMessageCommand({
      QueueUrl: Resource.user_analytics.url,
      MessageBody: JSON.stringify({
        eventType: event,
        userId: userId,
        properties: properties,
      }),
    })
  );

  return NextResponse.json({ message: "Event tracked" });
}
